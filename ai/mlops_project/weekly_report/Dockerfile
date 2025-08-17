FROM python:3.10-slim

# 기본 설정
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# WeasyPrint 경로 명시
ENV WKHTMLTOPDF_PATH=/usr/bin/weasyprint

# 필수 패키지 및 한글 폰트 설치
RUN apt-get update && \
    apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libffi-dev \
    fonts-nanum \
    fonts-noto-cjk \
    && apt-get clean

# matplotlib 캐시 디렉토리 설정
ENV MPLCONFIGDIR=/tmp/mplconfig

# 작업 디렉토리
WORKDIR /app

# 로컬 코드 복사
COPY . .

USER root
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    libopenblas-dev \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

# requirements.txt에 prophet==1.1.5가 포함되어 있어야 합니다.
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# 실행 예시 (테스트용)
CMD ["python", "generate_report.py"]
