import os
from datetime import timedelta
import pendulum

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator
from airflow.providers.docker.operators.docker import DockerOperator
from docker.types import Mount

# -----------------------------
# 설정
# -----------------------------
KST = "Asia/Seoul"

default_args = {
    "owner": "mlops",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
    "depends_on_past": False,
}

# DockerOperator용 환경변수
docker_env = {
    "PYTHONUNBUFFERED": "1",
    "JETSON_PUSH": "1",  # DockerOperator에서는 활성화
    "MLFLOW_TRACKING_URI": "file:///models/mlruns",  # 로컬 파일 모드로 변경
    "MLFLOW_HTTP_REQUEST_TIMEOUT": "5",  # 타임아웃 제한
    # PostgreSQL 연결 (host.docker.internal 사용)
    "DB_HOST": "host.docker.internal",
    "DB_PORT": "5432",
    "DB_NAME": "sobi",
    "DB_USER": "mlops_reader",
    "DB_PASSWORD": "mlops_read_only",
}

# 공통 마운트 설정
MODEL_HOST_DIR = "/srv/mlops/models"   # 호스트 경로
MODEL_CONT_DIR = "/models"             # 컨테이너 내부 경로

common_mounts = [
    # 모델 저장 디렉토리 (쓰기 가능)
    Mount(
        source=MODEL_HOST_DIR,
        target=MODEL_CONT_DIR,
        type="bind",
        read_only=False,
    ),
    # SSH 키 (읽기 전용)
    Mount(
        source="/home/heejun/S13P11B103/ai/mlops_project/secrets/ssh/id_ed25519_jetson",
        target="/mnt/ssh/id_ed25519_jetson",
        type="bind",
        read_only=True,
    ),
    # 데이터 디렉토리
    Mount(
        source="/home/heejun/S13P11B103/ai/mlops_project/data",
        target="/app/data",
        type="bind",
        read_only=True,
    ),
]

def _check_preprocessing(**context):
    """전처리 데이터 확인 함수 (최근 일주일)"""
    import psycopg2
    from datetime import datetime
    
    # Airflow DB에 연결
    conn = psycopg2.connect(
        host='sobi-db',
        database='airflowdb',
        user='airflow',
        password='airflow123'
    )
    
    try:
        cur = conn.cursor()
        
        # 최근 일주일의 전처리 데이터 개수 확인
        cur.execute("""
            SELECT COUNT(*) FROM airflow_data.training_data 
            WHERE purchase_date >= CURRENT_DATE - INTERVAL '7 days'
        """)
        
        count = cur.fetchone()[0]
        cur.close()
        
        print(f"전처리 데이터 확인 (최근 일주일): {count}건")
        
        if count == 0:
            raise Exception('airflow_data.training_data 최근 일주일 데이터 없음')
        
        print(f"✅ 전처리 데이터 확인 완료: {count}건의 데이터가 준비됨 (최근 일주일)")
        
    except Exception as e:
        print(f"❌ 전처리 데이터 확인 실패: {e}")
        raise
    finally:
        conn.close()

with DAG(
    dag_id="daily_recommender_train",
    schedule="0 3 * * *",  # 매일 03:00 KST
    start_date=pendulum.datetime(2024, 1, 1, tz=KST),
    catchup=False,
    default_args=default_args,
    tags=["recommender", "daily", "training"],
) as dag:
    start = EmptyOperator(task_id="start")

    # 전처리 완료 확인 (Airflow DB의 airflow_data.training_data 확인)
    check_preprocessing = PythonOperator(
        task_id="check_preprocessing",
        python_callable=_check_preprocessing,
    )

    # Jetson 연결 확인
    wait_jetson = BashOperator(
        task_id="wait_jetson",
        bash_command=(
            'ssh -p "$JETSON_SSH_PORT" '
            '-i /tmp/ssh/id_ed25519_jetson '
            '-o IdentitiesOnly=yes '
            '-o PreferredAuthentications=publickey '
            '-o NumberOfPasswordPrompts=0 '
            '-o BatchMode=yes '
            '-o ConnectTimeout=5 '
            '-o StrictHostKeyChecking=no '
            'ssafy@host.docker.internal "true"'
        ),
        retries=12,
        retry_delay=timedelta(seconds=10),
    )

    # 게스트 모델 훈련 (DockerOperator 사용)
    train_guest = DockerOperator(
        task_id="train_guest",
        image="mlops_trainer:latest",  # 로컬 빌드된 이미지
        auto_remove=True,
        docker_url="unix://var/run/docker.sock",
        network_mode="host",  # 컨테이너에서 127.0.0.1:2222 접근
        mount_tmp_dir=False,  # tmp 바인드 경로 오류 방지
        extra_hosts={"host.docker.internal": "host-gateway"},  # PostgreSQL 연결용
        environment={
            **docker_env,
            "OUTPUT_DIR": "/models/guest/latest",  # 새로운 경로로 변경
            "MLFLOW_TRACKING_URI": "file:///models/mlruns",  # 로컬 파일 모드
            "MLFLOW_HTTP_REQUEST_TIMEOUT": "5",  # 타임아웃 제한
            "JETSON_HOST": "host.docker.internal",
            "JETSON_SSH_PORT": "2222",
            "JETSON_USER": "ssafy",
            "SSH_KEY_PATH": "/tmp/jetson_key",  # 복사본 경로
        },
        mounts=common_mounts,  # 공통 마운트 사용
        command='sh -c "cp /mnt/ssh/id_ed25519_jetson /tmp/jetson_key && chmod 600 /tmp/jetson_key && mkdir -p /models/guest/latest && python train_guest_model.py --out_dir /models/guest/latest"',
        working_dir="/app",
    )

    # 멤버 모델 훈련 (DockerOperator 사용)
    train_member = DockerOperator(
        task_id="train_member",
        image="mlops_trainer:latest",  # 로컬 빌드된 이미지
        auto_remove=True,
        docker_url="unix://var/run/docker.sock",
        network_mode="host",  # 컨테이너에서 127.0.0.1:2222 접근
        mount_tmp_dir=False,  # tmp 바인드 경로 오류 방지
        extra_hosts={"host.docker.internal": "host-gateway"},  # PostgreSQL 연결용
        environment={
            **docker_env,
            "OUTPUT_DIR": "/models/member/latest",  # 새로운 경로로 변경
            "MLFLOW_TRACKING_URI": "file:///models/mlruns",  # 로컬 파일 모드
            "MLFLOW_HTTP_REQUEST_TIMEOUT": "5",  # 타임아웃 제한
            "JETSON_HOST": "host.docker.internal",
            "JETSON_SSH_PORT": "2222",
            "JETSON_USER": "ssafy",
            "SSH_KEY_PATH": "/tmp/jetson_key",  # 복사본 경로
        },
        mounts=common_mounts,  # 공통 마운트 사용
        command='sh -c "cp /mnt/ssh/id_ed25519_jetson /tmp/jetson_key && chmod 600 /tmp/jetson_key && mkdir -p /models/member/latest && python train_member_model.py --out_dir /models/member/latest"',
        working_dir="/app",
    )

    # Jetson 파일 전송 (게스트)
    push_guest_to_jetson = BashOperator(
        task_id="push_guest_to_jetson",
        bash_command=(
            'set -euo pipefail; '
            'SRC="/srv/mlops/models/guest/latest"; '
            'DEST="ssafy@$JETSON_HOST:/home/ssafy/Desktop/recommend/parameters/guest_model/"; '
            'KEY="/tmp/ssh/id_ed25519_jetson"; '
            'if [ ! -d "$SRC" ] || [ -z "$(ls -A "$SRC" 2>/dev/null)" ]; then '
            '  echo "source missing or empty: $SRC"; '
            '  exit 2; '
            'fi; '
            'rsync -azv --delete --partial --inplace --timeout=300 '
            '-e "ssh -p 2222 -i $KEY -o IdentitiesOnly=yes -o PreferredAuthentications=publickey -o BatchMode=yes -o StrictHostKeyChecking=no" '
            '"$SRC"/ "$DEST"'
        ),
        retries=3,
        retry_delay=timedelta(minutes=1),
    )

    # Jetson 파일 전송 (멤버)
    push_member_to_jetson = BashOperator(
        task_id="push_member_to_jetson",
        bash_command=(
            'set -euo pipefail; '
            'SRC="/srv/mlops/models/member/latest"; '
            'DEST="ssafy@$JETSON_HOST:/home/ssafy/Desktop/recommend/parameters/member_model/"; '
            'KEY="/tmp/ssh/id_ed25519_jetson"; '
            'if [ ! -d "$SRC" ] || [ -z "$(ls -A "$SRC" 2>/dev/null)" ]; then '
            '  echo "source missing or empty: $SRC"; '
            '  exit 2; '
            'fi; '
            'rsync -azv --delete --partial --inplace --timeout=300 '
            '-e "ssh -p 2222 -i $KEY -o IdentitiesOnly=yes -o PreferredAuthentications=publickey -o BatchMode=yes -o StrictHostKeyChecking=no" '
            '"$SRC"/ "$DEST"'
        ),
        retries=3,
        retry_delay=timedelta(minutes=1),
    )

    # Jetson 상태 확인
    jetson_health_check = BashOperator(
        task_id="jetson_health_check",
        bash_command=(
            'ssh -p 2222 -i /tmp/ssh/id_ed25519_jetson -o IdentitiesOnly=yes -o PreferredAuthentications=publickey -o BatchMode=yes -o StrictHostKeyChecking=no '
            'ssafy@$JETSON_HOST "echo Jetson 동기화 완료 && ls -la /home/ssafy/Desktop/recommend/parameters/"'
        ),
        retries=2,
        retry_delay=timedelta(minutes=1),
    )

    # 태스크 의존성 설정
    start >> check_preprocessing >> wait_jetson
    wait_jetson >> [train_guest, train_member]
    train_guest >> push_guest_to_jetson
    train_member >> push_member_to_jetson
    [push_guest_to_jetson, push_member_to_jetson] >> jetson_health_check
