FROM python:3.10-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 업데이트 및 필요한 패키지 설치
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# 전처리 코드 복사
COPY . .

# 실행 권한 설정
RUN chmod +x run_preprocessing.py

# 기본 명령어 설정
CMD ["python", "run_preprocessing.py"]
