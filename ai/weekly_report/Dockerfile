FROM python:3.10-slim

# 기본 설정
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# wkhtmltopdf 경로 명시 (pdfkit에서 사용)
ENV WKHTMLTOPDF_PATH=/usr/bin/wkhtmltopdf

# 필수 패키지 설치
RUN apt-get update && \
    apt-get install -y \
    wkhtmltopdf \
    fonts-noto-color-emoji \
    build-essential \
    libxrender1 libxext6 libfontconfig1 && \
    apt-get clean

# 작업 디렉토리
WORKDIR /app

# 로컬 코드 복사
COPY . .

# 의존성 설치
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# 실행 예시 (테스트용)
CMD ["python", "daily_report/generate_report.py"]
