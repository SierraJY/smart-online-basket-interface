#!/bin/bash

echo "🚀 로컬 개발 모드 시작 (폰 접속용)..."

# 환경변수 설정
export NEXT_PUBLIC_API_BASE_URL=http://13.125.215.242:8082
export NEXT_PUBLIC_FRONTEND_URL=http://13.125.215.242:3000
export NODE_ENV=development

echo "📋 환경 설정:"
echo "  API_BASE_URL: $NEXT_PUBLIC_API_BASE_URL"
echo "  FRONTEND_URL: $NEXT_PUBLIC_FRONTEND_URL"
echo "  NODE_ENV: $NODE_ENV"

# 백엔드만 Docker로 실행
echo "🐳 백엔드 서비스 시작..."
COMPOSE_PROJECT_NAME=sani docker compose up backend -d

# 프론트엔드는 로컬에서 실행
echo "⚡ 프론트엔드 개발 서버 시작..."
cd frontend/my-app
npm run dev

echo "✅ 로컬 개발 모드 설정 완료!"
echo "🌐 프론트엔드: http://localhost:3000 (또는 3001)"
echo "📱 폰 접속: http://13.125.215.242:3000 (또는 3001)"
echo "🔧 백엔드: http://13.125.215.242:8082" 