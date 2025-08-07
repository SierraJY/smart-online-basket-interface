# 환경 관리 스크립트

이 디렉토리에는 개발환경과 프로덕션환경을 쉽게 전환할 수 있는 스크립트들이 있습니다.

## 🚀 사용법

### 개발환경 (로컬 개발)

#### 1. 로컬 개발 (npm run dev)
```bash
./scripts/dev-mode.sh
```
- `npm run dev`로 로컬에서 개발
- API: `http://localhost:8082`
- Frontend: `http://localhost:3000`

#### 2. Docker 개발환경
```bash
./scripts/dev-docker.sh
```
- Docker 컨테이너에서 개발
- 실시간 코드 반영
- API: `http://localhost:8082`
- Frontend: `http://localhost:3000`

### 프로덕션환경 (HTTPS 배포)

#### 1. 기존 방식 (로컬 빌드)
```bash
./scripts/prod-mode.sh
```
- 로컬에서 빌드 후 Docker 실행
- API: `https://13.125.215.242`
- Frontend: `https://13.125.215.242`

#### 2. Docker 프로덕션환경 (권장)
```bash
./scripts/prod-docker.sh
```
- Docker에서 빌드 및 실행
- Nginx를 통한 HTTPS 제공
- API: `https://13.125.215.242`
- Frontend: `https://13.125.215.242`

#### 프론트엔드만 재시작
```bash
./scripts/prod-docker.sh frontend
```

## 📁 파일 구조

### Docker Compose 파일
- `docker-compose.dev.yaml`: 개발환경용 (Nginx 없음, 실시간 반영)
- `docker-compose.prod.yaml`: 프로덕션환경용 (Nginx 포함, HTTPS)

### Dockerfile
- `frontend/my-app/Dockerfile.prod`: 프로덕션용 (빌드된 앱 실행)
- `frontend/my-app/Dockerfile.dev`: 개발용 (개발 서버 실행)
- `backend/sobi_backend/Dockerfile.prod`: 프로덕션용 (빌드된 JAR 실행)
- `backend/sobi_backend/Dockerfile.dev`: 개발용 (실시간 반영)

## 🔧 환경 변수

### 개발환경
```bash
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL=http://localhost:8082
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

### 프로덕션환경
```bash
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://13.125.215.242
NEXT_PUBLIC_FRONTEND_URL=https://13.125.215.242
```

## 🛠️ 유틸리티 스크립트

### 환경 확인
```bash
./scripts/check-env.sh
```
현재 환경 변수 설정을 확인합니다.

### PWA 캐시 정리
```bash
./scripts/clear-pwa-cache.sh
```
PWA 캐시를 정리합니다.

## 📝 주의사항

1. **프로덕션 배포 전 확인사항**
   - AWS Security Group에서 포트 80, 443 열기
   - SSL 인증서 파일이 `nginx/ssl/` 디렉토리에 있는지 확인
   - `env.ts`에서 API 주소가 올바르게 설정되었는지 확인

2. **개발환경 전환**
   - 개발환경에서는 Nginx 없이 직접 접근
   - 실시간 코드 반영을 위해 볼륨 마운트 사용

3. **프로덕션환경 전환**
   - Nginx를 통한 HTTPS 제공
   - 외부 접근을 위한 포트 노출
   - 보안 헤더 설정 포함

## 🔄 환경 전환 예시

### 개발 → 프로덕션
```bash
# 1. 개발환경 중지
docker compose -f docker-compose.dev.yaml down

# 2. 프로덕션환경 시작
./scripts/prod-docker.sh
```

### 프로덕션 → 개발
```bash
# 1. 프로덕션환경 중지
docker compose -f docker-compose.prod.yaml down

# 2. 개발환경 시작
./scripts/dev-docker.sh
``` 