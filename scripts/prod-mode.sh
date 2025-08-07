#!/bin/bash

echo "🚀 프로덕션 모드로 전환 중..."

# 환경 변수 설정
export NODE_ENV=production
export NEXT_PUBLIC_API_BASE_URL=https://13.125.215.242
export NEXT_PUBLIC_FRONTEND_URL=https://13.125.215.242

echo "📋 현재 환경 설정:"
echo "  NODE_ENV: $NODE_ENV"
echo "  API_BASE_URL: $NEXT_PUBLIC_API_BASE_URL"
echo "  FRONTEND_URL: $NEXT_PUBLIC_FRONTEND_URL"

# 인자 확인 (frontend만 실행할지 전체 실행할지)
if [ "$1" = "frontend" ]; then
    echo "🎯 프론트엔드만 실행..."
    docker-compose up --build frontend
else
    echo "🐳 전체 서비스 실행..."
    docker-compose up --build
fi

echo "✅ 프로덕션 모드 설정 완료!"
echo "🌐 프론트엔드: https://13.125.215.242"
echo "🔧 백엔드 API: https://13.125.215.242"
echo ""
echo "💡 사용법:"
echo "  ./scripts/prod-mode.sh          # 전체 서비스 실행"
echo "  ./scripts/prod-mode.sh frontend # 프론트엔드만 실행" 