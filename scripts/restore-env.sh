#!/bin/bash

echo "🔄 환경 설정 복원 시작..."

# 백업 디렉토리 확인
if [ $# -eq 0 ]; then
    echo "❌ 백업 디렉토리를 지정해주세요."
    echo "사용법: ./scripts/restore-env.sh <백업_디렉토리명>"
    echo ""
    echo "📁 사용 가능한 백업 디렉토리들:"
    ls -d backup_* 2>/dev/null || echo "백업 디렉토리가 없습니다."
    exit 1
fi

BACKUP_DIR=$1

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ 백업 디렉토리를 찾을 수 없습니다: $BACKUP_DIR"
    exit 1
fi

echo "📁 백업 디렉토리: $BACKUP_DIR"

# Docker Compose 파일들 복원
echo "📋 Docker Compose 파일들 복원 중..."
cp $BACKUP_DIR/docker-compose.dev.yaml ./
cp $BACKUP_DIR/docker-compose.prod.yaml ./

# Dockerfile들 복원
echo "🐳 Dockerfile들 복원 중..."
cp $BACKUP_DIR/frontend/my-app/Dockerfile.dev frontend/my-app/
cp $BACKUP_DIR/frontend/my-app/Dockerfile.prod frontend/my-app/
cp $BACKUP_DIR/backend/sobi_backend/Dockerfile.dev backend/sobi_backend/
cp $BACKUP_DIR/backend/sobi_backend/Dockerfile.prod backend/sobi_backend/

# 스크립트 폴더 복원 (기존 스크립트 백업 후)
echo "📜 스크립트 폴더 복원 중..."
cp -r scripts/ scripts_backup_$(date +%Y%m%d_%H%M%S)/
cp -r $BACKUP_DIR/scripts/* scripts/

# 환경 설정 파일들 복원
echo "⚙️ 환경 설정 파일들 복원 중..."
cp $BACKUP_DIR/frontend/my-app/next.config.ts frontend/my-app/
cp $BACKUP_DIR/frontend/my-app/package.json frontend/my-app/

# Nginx 설정 복원
echo "🌐 Nginx 설정 복원 중..."
cp $BACKUP_DIR/nginx/nginx.conf nginx/
if [ -d "$BACKUP_DIR/nginx/ssl" ]; then
    cp -r $BACKUP_DIR/nginx/ssl/* nginx/ssl/
fi

# Mosquitto 설정 복원
echo "📡 Mosquitto 설정 복원 중..."
cp $BACKUP_DIR/mosquitto/mosquitto.conf mosquitto/

echo "✅ 복원 완료!"
echo ""
echo "🔍 환경 확인 중..."
./scripts/check-env.sh

echo ""
echo "💡 다음 단계:"
echo "  1. 새 backend 폴더가 올바르게 교체되었는지 확인"
echo "  2. ./scripts/dev-docker.sh 또는 ./scripts/prod-docker.sh로 실행" 