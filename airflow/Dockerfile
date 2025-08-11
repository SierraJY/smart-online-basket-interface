FROM apache/airflow:2.7.1-python3.10

# ai 모듈을 DAG에서 바로 임포트 가능하게 경로 설정
ENV PYTHONPATH=/opt/airflow:/opt/airflow/ai
ENV AIRFLOW_HOME=/opt/airflow

# Airflow 2.7.1 (Py3.10) constraints
ARG AIRFLOW_VERSION=2.7.1
ARG PYTHON_VERSION=3.10
ENV CONSTRAINT_URL="https://raw.githubusercontent.com/apache/airflow/constraints-${AIRFLOW_VERSION}/constraints-${PYTHON_VERSION}.txt"

# 의존성 설치 (constraints 적용)
COPY requirements.txt /requirements.txt
RUN pip install --no-cache-dir --constraint "${CONSTRAINT_URL}" -r /requirements.txt
