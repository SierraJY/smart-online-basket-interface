FROM python:3.10-slim

WORKDIR /app

# 시스템 의존성 설치 (예: 그래프 생성을 위한 graphviz)
RUN apt-get update && apt-get install -y \
    graphviz \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY . .

# 출력 디렉토리 생성
RUN mkdir -p output && chmod 777 output

# 기본 실행 명령은 없음 (Airflow에서 지정)
CMD ["sleep", "infinity"]