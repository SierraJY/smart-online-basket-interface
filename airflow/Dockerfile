FROM apache/airflow:2.7.1-python3.10

# ai 모듈을 DAG에서 바로 임포트 가능하게 경로 설정
ENV PYTHONPATH=/opt/airflow:/opt/airflow/ai

# 의존성 설치
COPY requirements.txt /requirements.txt
RUN pip install --no-cache-dir -r /requirements.txt
