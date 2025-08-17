import os
from datetime import timedelta
import pendulum
from pathlib import Path

from airflow import DAG
from airflow.providers.docker.operators.docker import DockerOperator
from airflow.operators.dummy import DummyOperator

def parse_env_file(path):
    """환경 변수 파일을 파싱하여 딕셔너리로 반환"""
    envs = {}
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"): 
                    continue
                k, sep, v = line.partition("=")
                if sep:
                    envs[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        print(f"Warning: .env file not found at {path}")
    return envs

# .env 파일에서 환경 변수 로드
ENV_FILE = "/opt/airflow/dags/.env"
env_from_file = parse_env_file(ENV_FILE)

# 필수 키가 .env에 있는지 확인
required = ["OPENAI_API_KEY", "REPORT_SENDER_EMAIL", "REPORT_SENDER_PASSWORD", "REPORT_RECEIVER"]
missing = [k for k in required if not env_from_file.get(k)]
if missing:
    raise ValueError(f"필수 키 누락: {missing} (in {ENV_FILE})")

# 환경 변수 설정 (기본값 + .env 값)
envs = {
    "TZ": "Asia/Seoul",
    "PYTHONUNBUFFERED": "1",
    **env_from_file,  # .env 값 전부 주입
}

default_args = {
    "owner": "mlops",
    "retries": 2,
    "retry_delay": timedelta(minutes=10),
    "email_on_failure": True,
    "email_on_retry": True,
}

with DAG(
    dag_id="weekly_report_mail",
    schedule="0 6 * * MON",  # 매주 월요일 06:00 KST
    start_date=pendulum.datetime(2024, 1, 1, tz="Asia/Seoul"),
    catchup=False,
    default_args=default_args,
    tags=["weekly", "report", "email"],
) as dag:

    start = DummyOperator(task_id="start")

    # 주간리포트 생성 및 메일 발송
    generate_and_send_report = DockerOperator(
        task_id="generate_and_email_weekly_report",
        image="mlops_weekly_report:latest",
        api_version="auto",
        auto_remove=True,
        mount_tmp_dir=False,  # 임시 디렉토리 바인드 실패 방지
        command=["python", "run_weekly_report.py"],  # 별도 스크립트 실행
        docker_url="unix://var/run/docker.sock",
        network_mode="sobi-net",
        environment={
            "DB_URL": "postgresql://airflow:airflow123@sobi-db:5432/airflowdb",
            "DB_SCHEMA": "airflow_data",
            "REPORT_OUT_DIR": "/app/output",  # PDF 저장 경로
            "WKHTMLTOPDF_PATH": "/usr/bin/weasyprint",  # WeasyPrint 경로
            **envs,  # .env에서 로드한 환경 변수들 (OPENAI_API_KEY, REPORT_SENDER_EMAIL, REPORT_SENDER_PASSWORD, REPORT_RECEIVER 포함)
        },
        # 메모리 및 CPU 제한 설정
        mem_limit="2g",
    )

    end = DummyOperator(task_id="end")

    # 태스크 순서 정의
    start >> generate_and_send_report >> end
