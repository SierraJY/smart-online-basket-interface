from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator


def _run(**context):
    # 무거운 임포트는 태스크 실행 시점에
    import sys
    import os

    # preprocessing 모듈 경로 추가
    sys.path.append("/opt/mlops/preprocessing")

    try:
        from run_preprocessing import run_preprocessing
        print("✅ run_preprocessing 모듈 import 성공")
    except ImportError as e:
        print(f"❌ Import 오류: {e}")
        # 대안: 직접 실행
        import subprocess
        result = subprocess.run(['python', '/opt/mlops/preprocessing/run_preprocessing.py'], 
                              capture_output=True, text=True)
        print(f"스크립트 실행 결과: {result.stdout}")
        if result.stderr:
            print(f"오류: {result.stderr}")
        return

    # 전처리 실행
    try:
        run_preprocessing()  # 내부에서 어제 날짜 기본 처리
        print("✅ 전처리 실행 성공")
    except Exception as e:
        print(f"❌ 전처리 실행 오류: {e}")
        raise

    # 전처리 완료 로그
    print("전처리 완료: airflow_data.training_data 테이블에 오늘 데이터 추가됨")


def _verify_preprocessing(**context):
    """전처리 결과 검증 함수"""
    import psycopg2
    import os
    from datetime import datetime, timedelta

    # Airflow DB에 연결 (쓰기 권한)
    conn = psycopg2.connect(
        host='sobi-db',
        database='airflowdb',
        user='airflow',
        password='airflow123'
    )
    
    try:
        cur = conn.cursor()
        
        # 오늘 날짜 사용 (전처리 스크립트가 오늘 날짜로 처리)
        today = datetime.now().date()
        
        # airflow_data.training_data 테이블에서 오늘 데이터 개수 확인
        cur.execute("""
            SELECT COUNT(*) FROM airflow_data.training_data 
            WHERE purchase_date = %s
        """, (today,))
        
        count = cur.fetchone()[0]
        cur.close()
        
        if count == 0:
            raise Exception(f'전처리 검증 실패: {today} 데이터 {count}건')
        
        print(f'전처리 검증 완료: {today} 데이터 {count}건이 airflow_data.training_data에 추가됨')
        
    except Exception as e:
        print(f"검증 중 오류 발생: {e}")
        raise
    finally:
        conn.close()


default_args = {
    "owner": "sobi",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    dag_id="daily_preprocessing",
    description="Append yesterday's receipts to training_data",
    schedule="0 2 * * *",  # 매일 02:00 KST
    start_date=datetime(2025, 1, 1),
    catchup=False,
    max_active_runs=1,
    default_args=default_args,
    tags=["preprocessing", "etl", "daily"],
) as dag:

    preprocess = PythonOperator(
        task_id="preprocess",
        python_callable=_run,
    )

    # 전처리 완료 확인
    verify_preprocessing = PythonOperator(
        task_id="verify_preprocessing",
        python_callable=_verify_preprocessing,
    )

    # 태스크 순서 정의
    preprocess >> verify_preprocessing
