#!/bin/bash

# SSH 키 권한 수정 스크립트
# Airflow 컨테이너에서 SSH 키 파일을 수정할 수 있도록 권한을 조정합니다.

echo "🔧 SSH 키 권한 수정 시작..."

# 현재 사용자 정보 확인
CURRENT_USER=$(id -u)
CURRENT_GROUP=$(id -g)

echo "📋 현재 사용자: $CURRENT_USER:$CURRENT_GROUP"

# SSH 키 파일 경로
SSH_KEY_PATH="./secrets/ssh/id_ed25519_jetson"

# SSH 키 파일 존재 확인
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "❌ SSH 키 파일을 찾을 수 없습니다: $SSH_KEY_PATH"
    exit 1
fi

echo "📋 SSH 키 파일 발견: $SSH_KEY_PATH"

# 현재 권한 확인
echo "📋 현재 권한:"
ls -la "$SSH_KEY_PATH"

# 권한 수정
echo "🔧 권한 수정 중..."
sudo chown "$CURRENT_USER:$CURRENT_GROUP" "$SSH_KEY_PATH"
sudo chmod 600 "$SSH_KEY_PATH"

# 수정 후 권한 확인
echo "📋 수정 후 권한:"
ls -la "$SSH_KEY_PATH"

echo "✅ SSH 키 권한 수정 완료!"
echo ""
echo "📝 다음 단계:"
echo "1. docker-compose 재시작: docker compose restart"
echo "2. Airflow DAG에서 DockerOperator 테스트"
echo "3. chmod 600 명령어가 정상 실행되는지 확인"
