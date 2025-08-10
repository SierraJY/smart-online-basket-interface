from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator

def _run():
    # 무거운 임포트는 태스크 실행 시점에
    from ai.preprocessing.run_preprocessing import run_preprocessing
    run_preprocessing()  # 내부에서 어제 날짜 기본 처리

default_args = {
    "owner": "sobi",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    dag_id="daily_preprocessing",
    description="Append yesterday's receipts to training_data",
    schedule="0 2 * * *",
    start_date=datetime(2025, 8, 1),
    catchup=False,
    max_active_runs=1,
    default_args=default_args,
    tags=["preprocessing", "etl"],
) as dag:
    preprocess = PythonOperator(
        task_id="preprocess",
        python_callable=_run,
    )

    preprocess
