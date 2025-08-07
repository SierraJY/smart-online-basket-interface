#!/bin/bash

echo "🔍 현재 환경 설정 확인 중..."

echo "📋 환경 변수:"
echo "  NODE_ENV: ${NODE_ENV:-'설정되지 않음'}"
echo "  NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL:-'설정되지 않음'}"
echo "  NEXT_PUBLIC_FRONTEND_URL: ${NEXT_PUBLIC_FRONTEND_URL:-'설정되지 않음'}"

echo ""
echo "🔧 현재 설정 분석:"
if [ "$NODE_ENV" = "development" ] && [ -n "$NEXT_PUBLIC_API_BASE_URL" ] && [ "$NEXT_PUBLIC_API_BASE_URL" != "http://localhost:8082" ]; then
    echo "  🎯 로컬 개발 모드 (폰 접속용)"
elif [ "$NODE_ENV" = "development" ]; then
    echo "  💻 일반 개발 모드 (로컬 접속용)"
elif [ "$NODE_ENV" = "production" ]; then
    echo "  🚀 프로덕션 모드 (HTTPS)"
else
    echo "  ⚠️  환경 설정 불명확"
fi

echo ""
echo "🌐 접속 정보:"
if [ "$NODE_ENV" = "development" ]; then
    echo "  ✅ 개발 모드 (HTTP)"
    if [ -n "$NEXT_PUBLIC_FRONTEND_URL" ]; then
        echo "  프론트엔드: $NEXT_PUBLIC_FRONTEND_URL"
    else
        echo "  프론트엔드: http://localhost:3000"
    fi
    if [ -n "$NEXT_PUBLIC_API_BASE_URL" ]; then
        echo "  백엔드 API: $NEXT_PUBLIC_API_BASE_URL"
    else
        echo "  백엔드 API: http://localhost:8082"
    fi
elif [ "$NODE_ENV" = "production" ]; then
    echo "  ✅ 프로덕션 모드 (HTTPS)"
    echo "  프론트엔드: https://13.125.215.242"
    echo "  백엔드 API: https://13.125.215.242"
else
    echo "  ⚠️  환경이 설정되지 않음"
    echo "  기본값: 프로덕션 모드 (HTTPS)"
fi

echo ""
echo "🐳 Docker 컨테이너 상태:"
if command -v docker-compose &> /dev/null; then
    docker-compose ps
elif command -v docker &> /dev/null; then
    docker compose ps
else
    echo "  ❌ Docker가 설치되지 않았습니다"
fi 