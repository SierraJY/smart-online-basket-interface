FROM python:3.10-slim

# 기본 설정
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV WKHTMLTOPDF_PATH=/usr/bin/wkhtmltopdf
ENV MPLBACKEND=Agg

# 시스템 의존성
RUN apt-get update && apt-get install -y --no-install-recommends \
    wkhtmltopdf \
    fonts-nanum \
    fonts-noto-color-emoji \
    libgomp1 \
    libxrender1 libxext6 libfontconfig1 \
    ca-certificates \
    gcc g++ \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 설치
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir wheel && \
    pip install --no-cache-dir -r requirements.txt

# 앱 코드
COPY . .

# 출력/템플릿 디렉토리
RUN mkdir -p output templates && chmod -R 777 output templates

CMD ["python", "generate_report.py"]
