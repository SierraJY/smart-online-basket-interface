#!/bin/bash

echo "🧹 PWA 캐시 정리 중..."

# Next.js 빌드 캐시 정리
echo "📁 Next.js 빌드 캐시 정리..."
rm -rf frontend/my-app/.next
rm -rf frontend/my-app/out

# PWA 관련 파일 정리
echo "📁 PWA 파일 정리..."
rm -rf frontend/my-app/public/sw.js
rm -rf frontend/my-app/public/workbox-*.js
rm -rf frontend/my-app/public/worker-*.js

# Docker 컨테이너 캐시 정리
echo "🐳 Docker 컨테이너 캐시 정리..."
docker-compose down
docker system prune -f

echo "✅ PWA 캐시 정리 완료!"
echo "🔄 이제 다시 빌드해보세요:"
echo "   ./scripts/dev-mode.sh  # 개발 모드"
echo "   ./scripts/prod-mode.sh # 프로덕션 모드" 