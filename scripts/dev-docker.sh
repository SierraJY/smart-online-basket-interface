#!/bin/bash

echo "🚀 Docker 개발 모드로 전환 중..."

# 환경 변수 설정
export NODE_ENV=development
export NEXT_PUBLIC_API_BASE_URL=http://localhost:8082
export NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

echo "📋 현재 환경 설정:"
echo "  NODE_ENV: $NODE_ENV"
echo "  API_BASE_URL: $NEXT_PUBLIC_API_BASE_URL"
echo "  FRONTEND_URL: $NEXT_PUBLIC_FRONTEND_URL"

# 개발용 Docker Compose 실행
echo "🐳 개발용 Docker Compose 시작..."
docker compose -f docker-compose.dev.yaml up --build

echo "✅ Docker 개발 모드 설정 완료!"
echo "🌐 프론트엔드: http://localhost:3000"
echo "🔧 백엔드 API: http://localhost:8082" 