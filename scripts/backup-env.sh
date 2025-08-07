#!/bin/bash

echo "🔧 환경 설정 백업 시작..."

# 백업 디렉토리 생성
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

echo "📁 백업 디렉토리: $BACKUP_DIR"

# Docker Compose 파일들 백업
echo "📋 Docker Compose 파일들 백업 중..."
cp docker-compose.dev.yaml $BACKUP_DIR/
cp docker-compose.prod.yaml $BACKUP_DIR/

# Dockerfile들 백업
echo "🐳 Dockerfile들 백업 중..."
mkdir -p $BACKUP_DIR/frontend/my-app
mkdir -p $BACKUP_DIR/backend/sobi_backend
cp frontend/my-app/Dockerfile.dev $BACKUP_DIR/frontend/my-app/
cp frontend/my-app/Dockerfile.prod $BACKUP_DIR/frontend/my-app/
cp backend/sobi_backend/Dockerfile.dev $BACKUP_DIR/backend/sobi_backend/
cp backend/sobi_backend/Dockerfile.prod $BACKUP_DIR/backend/sobi_backend/

# 스크립트 폴더 전체 백업
echo "📜 스크립트 폴더 백업 중..."
cp -r scripts/ $BACKUP_DIR/

# 환경 설정 파일들 백업
echo "⚙️ 환경 설정 파일들 백업 중..."
cp frontend/my-app/next.config.ts $BACKUP_DIR/frontend/my-app/
cp frontend/my-app/package.json $BACKUP_DIR/frontend/my-app/

# Nginx 설정 백업
echo "🌐 Nginx 설정 백업 중..."
mkdir -p $BACKUP_DIR/nginx
cp nginx/nginx.conf $BACKUP_DIR/nginx/
cp -r nginx/ssl/ $BACKUP_DIR/nginx/ 2>/dev/null || echo "SSL 인증서 없음"

# Mosquitto 설정 백업
echo "📡 Mosquitto 설정 백업 중..."
mkdir -p $BACKUP_DIR/mosquitto
cp mosquitto/mosquitto.conf $BACKUP_DIR/mosquitto/

# 현재 실행 중인 컨테이너 상태 확인
echo "🔍 현재 컨테이너 상태 확인 중..."
docker ps > $BACKUP_DIR/current_containers.txt 2>/dev/null || echo "Docker 실행 중이 아님"

# 환경 변수 확인
echo "🌍 환경 변수 확인 중..."
env | grep -E "(NODE_ENV|NEXT_PUBLIC|SPRING)" > $BACKUP_DIR/environment_vars.txt 2>/dev/null || echo "환경 변수 없음"

echo "✅ 백업 완료!"
echo "📁 백업 위치: $BACKUP_DIR"
echo ""
echo "📋 백업된 파일들:"
ls -la $BACKUP_DIR/
echo ""
echo "💡 백업 복원 방법:"
echo "  1. 새 backend 폴더로 교체 후"
echo "  2. $BACKUP_DIR/에서 필요한 파일들을 복사"
echo "  3. ./scripts/check-env.sh로 환경 확인" 