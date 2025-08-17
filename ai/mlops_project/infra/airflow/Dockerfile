FROM apache/airflow:2.7.1-python3.10

# (선택) 네이티브 라이브러리 필요한 경우에만 추가
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential libpq-dev rsync openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Docker 소켓 접근을 위한 그룹 설정
RUN groupadd -g 999 docker || true && \
    usermod -aG docker airflow

USER airflow

# constraints는 Airflow 버전에 정확히 맞춰야 함
# Python 3.10이면 constraints-3.10.txt
ARG AIRFLOW_VERSION=2.7.1
ARG PYTHON_VERSION=3.10
ARG CONSTRAINT_URL="https://raw.githubusercontent.com/apache/airflow/constraints-${AIRFLOW_VERSION}/constraints-${PYTHON_VERSION}.txt"

# 요구 패키지 사전 설치 (빌드 레이어로 고정)
COPY requirements.txt /requirements.txt
RUN pip install --no-cache-dir -r /requirements.txt --constraint "${CONSTRAINT_URL}"

# 환경 최적화
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    AIRFLOW__CORE__LOAD_EXAMPLES=false
