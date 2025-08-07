# AWS Certificate Manager (ACM) SSL 인증서 설정 가이드

## 1. ACM 인증서 요청

### AWS 콘솔에서:
1. AWS 콘솔 → Certificate Manager → Request Certificate
2. 도메인 이름 입력: `13.125.215.242` (또는 실제 도메인이 있다면)
3. Validation method: DNS validation (권장) 또는 Email validation
4. Request Certificate 클릭

### AWS CLI 사용:
```bash
# 인증서 요청
aws acm request-certificate \
    --domain-name 13.125.215.242 \
    --validation-method DNS \
    --region ap-northeast-2

# 인증서 ARN 확인
aws acm list-certificates --region ap-northeast-2
```

## 2. Application Load Balancer (ALB) 설정

### ALB 생성:
```bash
# ALB 생성
aws elbv2 create-load-balancer \
    --name smartbasket-alb \
    --subnets subnet-xxxxx subnet-yyyyy \
    --security-groups sg-xxxxx \
    --scheme internet-facing \
    --type application \
    --region ap-northeast-2

# HTTPS 리스너 생성 (ACM 인증서 사용)
aws elbv2 create-listener \
    --load-balancer-arn arn:aws:elasticloadbalancing:ap-northeast-2:xxxxx:loadbalancer/app/smartbasket-alb/xxxxx \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=arn:aws:acm:ap-northeast-2:xxxxx:certificate/xxxxx \
    --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:ap-northeast-2:xxxxx:targetgroup/smartbasket-tg/xxxxx
```

## 3. nginx 설정 수정 (ALB 사용 시)

nginx를 ALB 뒤에서 HTTP로 실행하고, ALB에서 HTTPS 처리:

```nginx
# nginx/nginx.conf 수정
server {
    listen 80;
    server_name 13.125.215.242;
    
    # 프론트엔드 프록시
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 백엔드 API 프록시
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 4. Let's Encrypt 사용 (도메인이 있는 경우)

### Certbot 설치 및 인증서 발급:
```bash
# Certbot 설치
sudo apt update
sudo apt install certbot python3-certbot-nginx

# 인증서 발급 (도메인이 필요)
sudo certbot --nginx -d yourdomain.com

# 자동 갱신 설정
sudo crontab -e
# 다음 줄 추가:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 5. 자체 서명 인증서 (임시 해결책)

```bash
# 자체 서명 인증서 생성
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/C=KR/ST=Seoul/L=Seoul/O=SmartBasket/OU=IT/CN=13.125.215.242"
```

## 권장사항

1. **도메인이 있다면**: Let's Encrypt 사용 (무료, 자동 갱신)
2. **도메인이 없다면**: AWS ALB + ACM 조합 사용
3. **임시 테스트**: 자체 서명 인증서 사용

## 비용

- **ACM**: 무료 (AWS 서비스와 함께 사용 시)
- **ALB**: 시간당 약 $0.0225 (약 $16.20/월)
- **Let's Encrypt**: 완전 무료
- **자체 서명**: 무료 (브라우저 경고 발생) 