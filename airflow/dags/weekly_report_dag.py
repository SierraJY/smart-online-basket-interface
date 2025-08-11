from datetime import timedelta
from airflow import DAG
from airflow.providers.docker.operators.docker import DockerOperator
from airflow.utils.dates import days_ago
from docker.types import Mount

# 호스트(EC2)에서 프로젝트 루트 절대 경로
HOST_BASE = "/home/ubuntu/S13P11B103"

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": True,
    "email_on_retry": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}

# DockerOperator 공통 설정
common_docker_config = {
    "image": "sobi/weekly-report:1.0",
    "docker_url": "unix://var/run/docker.sock",
    "network_mode": "sobi-net",
    "auto_remove": True,
    "mount_tmp_dir": False,
    "mounts": [
        Mount(source=f"{HOST_BASE}/ai/weekly_report/output",    target="/app/output",    type="bind"),
        Mount(source=f"{HOST_BASE}/ai/weekly_report/templates", target="/app/templates", type="bind", read_only=True),
    ],
    # .env 파일을 컨테이너 환경으로 그대로 주입
    "env_file": f"{HOST_BASE}/.env"
}

with DAG(
    "weekly_report",
    default_args=default_args,
    description="Weekly report generation pipeline",
    schedule_interval="0 4 * * 0",  # 매주 일요일 04:00 KST
    start_date=days_ago(1),
    catchup=False,
) as dag:

    fp_growth_task = DockerOperator(
        task_id="fp_growth_analysis",
        command="python models/fp_growth.py",
        **common_docker_config,
    )

    kmeans_task = DockerOperator(
        task_id="kmeans_analysis",
        command="python models/kmeans.py",
        **common_docker_config,
    )

    prophet_task = DockerOperator(
        task_id="prophet_analysis",
        command="python models/prophet.py",
        **common_docker_config,
    )

    lightgbm_task = DockerOperator(
        task_id="lightgbm_analysis",
        command="python models/lightgbm.py",
        **common_docker_config,
    )

    report_task = DockerOperator(
        task_id="generate_report",
        command=(
            'python -c "from generate_report import generate_report; '
            'from datetime import datetime, timedelta; '
            'today = datetime.now().date(); '
            'end_date = today - timedelta(days=1); '
            'start_date = end_date - timedelta(days=6); '
            'generate_report(start_date, end_date)"'
        ),
        **common_docker_config,
    )

    email_task = DockerOperator(
        task_id="send_email",
        command="python email_sender.py",
        **common_docker_config,
    )

    [fp_growth_task, kmeans_task, prophet_task, lightgbm_task] >> report_task >> email_task
