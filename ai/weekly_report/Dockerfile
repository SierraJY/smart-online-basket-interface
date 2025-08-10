FROM python:3.10-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    graphviz \
    wkhtmltopdf \  # PDF 생성에 필요
    fonts-nanum \  # 한글 폰트
    fonts-noto-color-emoji \  # 이모티콘 폰트
    gcc \          # LightGBM 컴파일에 필요
    g++ \         # LightGBM 컴파일에 필요
    && rm -rf /var/lib/apt/lists/*

# 한글 폰트 설정
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Python 패키지 설치
COPY requirements.txt .
# LightGBM 설치 시 발생할 수 있는 문제 예방을 위해 wheel 먼저 설치
RUN pip install --no-cache-dir wheel && \
    pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY . .

# 출력 및 템플릿 디렉토리 생성
RUN mkdir -p output templates && \
    chmod -R 777 output templates

# 기본 실행 명령은 없음 (Airflow에서 지정)
CMD ["sleep", "infinity"]