from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.docker.operators.docker import DockerOperator
from airflow.utils.dates import days_ago

default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

# Docker Operator 공통 설정
common_docker_config = {
    'image': 'sobi/weekly-report:1.0',
    'docker_url': 'unix://var/run/docker.sock',
    'network_mode': 'sobi-net',
    'volumes': [
        './ai/weekly_report/output:/app/output',
        './ai/weekly_report/templates:/app/templates'
    ],
    'auto_remove': True,
}

with DAG(
    'weekly_report',
    default_args=default_args,
    description='Weekly report generation pipeline',
    schedule_interval='0 4 * * 0',  # 매주 일요일 새벽 4시 (한국 시간)
    start_date=days_ago(1),
    catchup=False,
) as dag:
    
    # 1. FP-Growth 분석 (연관 규칙 분석)
    fp_growth_task = DockerOperator(
        task_id='fp_growth_analysis',
        command='python models/fp_growth.py',
        **common_docker_config
    )

    # 2. K-means 분석 (클러스터링)
    kmeans_task = DockerOperator(
        task_id='kmeans_analysis',
        command='python models/kmeans.py',
        **common_docker_config
    )

    # 3. Prophet 분석 (시계열 예측)
    prophet_task = DockerOperator(
        task_id='prophet_analysis',
        command='python models/prophet.py',
        **common_docker_config
    )

    # 4. LightGBM 분석
    lightgbm_task = DockerOperator(
        task_id='lightgbm_analysis',
        command='python models/lightgbm.py',
        **common_docker_config
    )

    # 5. 리포트 생성 (LLM 요약 포함)
    report_task = DockerOperator(
        task_id='generate_report',
        command='python -c "from generate_report import generate_report; '
                'from datetime import datetime, timedelta; '
                'today = datetime.now().date(); '
                'end_date = today - timedelta(days=1); '
                'start_date = end_date - timedelta(days=6); '
                'generate_report(start_date, end_date)"',
        **common_docker_config
    )

    # 6. 이메일 전송
    email_task = DockerOperator(
        task_id='send_email',
        command='python email_sender.py',
        **common_docker_config
    )

    # 태스크 의존성 설정
    # 분석 태스크들은 병렬로 실행 후 리포트 생성
    [fp_growth_task, kmeans_task, prophet_task, lightgbm_task] >> report_task >> email_task