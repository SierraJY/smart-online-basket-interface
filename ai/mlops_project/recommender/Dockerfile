FROM python:3.10-slim

WORKDIR /app

# 시스템 패키지 설치
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    rsync \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 시스템 사용자 생성
RUN useradd -m -u 1000 trainer

# 코드 복사 및 권한 설정
COPY . .
RUN mkdir -p /home/trainer/.ssh /recommender/models/{guest,member} && \
    chown -R trainer:trainer /home/trainer /app /recommender && \
    chmod 700 /home/trainer/.ssh && \
    if [ -f /home/trainer/.ssh/id_ed25519_jetson ]; then \
        chmod 600 /home/trainer/.ssh/id_ed25519_jetson; \
    fi

# 기본 환경변수 설정
ENV PYTHONUNBUFFERED=1 \
    TZ=Asia/Seoul

USER trainer

# 실행 명령어 (guest/member 모델 모두 훈련)
CMD ["sh", "-c", "python train_guest_model.py && python train_member_model.py"]
