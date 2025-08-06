#!/bin/bash

echo "🔐 빠른 SSL 인증서 생성 중..."

# nginx/ssl 디렉토리 생성
mkdir -p nginx/ssl

# 자체 서명된 SSL 인증서 생성
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/C=KR/ST=Seoul/L=Seoul/O=SmartBasket/OU=IT/CN=13.125.215.242"

# 인증서 권한 설정
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem

echo "✅ SSL 인증서 생성 완료!"
echo "📁 인증서 위치: nginx/ssl/"
echo ""
echo "🚀 이제 프로덕션 서비스를 재시작하세요:"
echo "   ./scripts/prod-docker.sh"
echo ""
echo "⚠️  주의사항:"
echo "   - 자체 서명된 인증서이므로 브라우저에서 보안 경고가 표시됩니다"
echo "   - '고급' → '안전하지 않은 사이트로 이동'을 클릭하세요"
echo "   - 서비스 워커는 정상적으로 작동할 것입니다" 