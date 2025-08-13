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

with DAG(
    'weekly_report',
    default_args=default_args,
    description='Weekly report generation pipeline',
    # 매주 월요일 오전 9시에 실행 (한국 시간)
    schedule_interval='0 0 * * 1',  # 또는 @weekly
    start_date=days_ago(1),
    catchup=False,
) as dag:
    
    # 1. FP-Growth 분석 (연관 규칙 분석)
    fp_growth_task = DockerOperator(
        task_id='fp_growth_analysis',
        image='sobi/weekly-report:1.0',
        command='python models/fp_growth.py',
        docker_url='unix://var/run/docker.sock',
        network_mode='sobi-net',
        # 호스트의 output 폴더와 연결
        volumes=[
            './ai/weekly_report/output:/app/output',
            './ai/weekly_report/templates:/app/templates'
        ],
        # container_name을 지정하지 않으면 Airflow가 자동으로 유니크한 이름 생성
        auto_remove=True,  # 작업 완료 후 컨테이너 자동 제거
    )

    # 2. K-means 분석 (클러스터링)
    kmeans_task = DockerOperator(
        task_id='kmeans_analysis',
        image='sobi/weekly-report:1.0',
        command='python models/kmeans.py',
        docker_url='unix://var/run/docker.sock',
        network_mode='sobi-net',
        volumes=[
            './ai/weekly_report/output:/app/output',
            './ai/weekly_report/templates:/app/templates'
        ],
        auto_remove=True,
    )

    # 3. Prophet 분석 (시계열 예측)
    prophet_task = DockerOperator(
        task_id='prophet_analysis',
        image='sobi/weekly-report:1.0',
        command='python models/prophet.py',
        docker_url='unix://var/run/docker.sock',
        network_mode='sobi-net',
        volumes=[
            './ai/weekly_report/output:/app/output',
            './ai/weekly_report/templates:/app/templates'
        ],
        auto_remove=True,
    )

    # 4. LightGBM 분석
    lightgbm_task = DockerOperator(
        task_id='lightgbm_analysis',
        image='sobi/weekly-report:1.0',
        command='python models/lightgbm.py',
        docker_url='unix://var/run/docker.sock',
        network_mode='sobi-net',
        volumes=[
            './ai/weekly_report/output:/app/output',
            './ai/weekly_report/templates:/app/templates'
        ],
        auto_remove=True,
    )

    # 5. LLM을 사용한 요약 생성
    llm_task = DockerOperator(
        task_id='llm_summarize',
        image='sobi/weekly-report:1.0',
        command='python llm_summarizer.py',
        docker_url='unix://var/run/docker.sock',
        network_mode='sobi-net',
        volumes=[
            './ai/weekly_report/output:/app/output',
            './ai/weekly_report/templates:/app/templates'
        ],
        auto_remove=True,
    )

    # 6. 리포트 생성
    report_task = DockerOperator(
        task_id='generate_report',
        image='sobi/weekly-report:1.0',
        command='python generate_report.py',
        docker_url='unix://var/run/docker.sock',
        network_mode='sobi-net',
        volumes=[
            './ai/weekly_report/output:/app/output',
            './ai/weekly_report/templates:/app/templates'
        ],
        auto_remove=True,
    )

    # 7. 이메일 전송
    email_task = DockerOperator(
        task_id='send_email',
        image='sobi/weekly-report:1.0',
        command='python email_sender.py',
        docker_url='unix://var/run/docker.sock',
        network_mode='sobi-net',
        volumes=[
            './ai/weekly_report/output:/app/output',
            './ai/weekly_report/templates:/app/templates'
        ],
        auto_remove=True,
    )

    # 태스크 의존성 설정
    # 분석 태스크들은 병렬로 실행
    [fp_growth_task, kmeans_task, prophet_task, lightgbm_task] >> llm_task >> report_task >> email_task