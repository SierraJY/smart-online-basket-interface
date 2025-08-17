FROM ghcr.io/mlflow/mlflow:v2.14.1

# PostgreSQL 드라이버 설치
RUN pip install --no-cache-dir psycopg2-binary

# 기본 명령어 설정
CMD ["mlflow", "server", "--host", "0.0.0.0", "--port", "5000"]
