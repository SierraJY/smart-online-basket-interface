# Airflow DAG 환경변수 설정 가이드

## 전체 워크플로우 구조

```
1. docker-compose.core.yaml 실행 → sobi-db, nginx, redis 시작
2. daily_preprocessing_dag.py (02:00) → 전처리 실행
3. daily_recommender_train.py (03:00) → AI 모델 학습 + 젯슨 동기화
4. weekly_report_mail.py (월요일 06:00) → 주간리포트 생성 및 메일 발송
```

## 필수 환경변수 설정

### 1. 젯슨 SSH 연결 설정
```bash
export JETSON_USER=ssafy
export JETSON_HOST=192.168.28.81
export JETSON_SSH_PORT=22
export JETSON_DEST_GUEST=/opt/app/guest_model
export JETSON_DEST_MEMBER=/opt/app/member_model
```

### 2. 주간리포트 메일 발송 설정
```bash
export OPENAI_API_KEY=your_openai_api_key_here
export REPORT_SENDER_EMAIL=your_email@gmail.com
export REPORT_SENDER_PASSWORD=your_app_password_here
export REPORT_RECEIVER=recipient@example.com
```

### 3. 데이터베이스 연결 (자동 설정됨)
```bash
# sobi-db에서 자동으로 설정됨
DB_URL=postgresql://mlops_reader:mlops_read_only@sobi-db:5432/sobi
```

## 실행 순서

### 1단계: Core 서비스 시작
```bash
cd S13P11B103
docker-compose -f docker-compose.core.yaml up -d
```

### 2단계: MLOps 서비스 시작
```bash
cd ai/mlops_project
docker-compose up -d
```

### 3단계: Airflow 웹 UI 접속
- URL: http://localhost:8080
- Username: admin
- Password: admin

## Docker Compose 환경변수 설정

`docker-compose.yaml` 파일에 다음 환경변수들을 추가하세요:

```yaml
environment:
  - JETSON_USER=jetson
  - JETSON_HOST=192.168.0.10
  - JETSON_SSH_PORT=22
  - JETSON_DEST_GUEST=/opt/app/guest_model
  - JETSON_DEST_MEMBER=/opt/app/member_model
  - OPENAI_API_KEY=your_openai_api_key_here
  - REPORT_SENDER_EMAIL=your_email@gmail.com
  - REPORT_SENDER_PASSWORD=your_app_password_here
  - REPORT_RECEIVER=recipient@example.com
```

## 젯슨 SSH 키 설정

1. SSH 키가 `infra/airflow/ssh/` 디렉토리에 있는지 확인
2. 키 파일 권한 설정:
   ```bash
   chmod 600 infra/airflow/ssh/id_ed25519_jetson
   chmod 644 infra/airflow/ssh/id_ed25519_jetson.pub
   ```

## DAG 실행 확인

### 1. 전처리 DAG (02:00)
- `daily_preprocessing` DAG 실행 상태 확인
- `training_data` 테이블에 오늘 데이터 추가 확인

### 2. AI 학습 DAG (03:00)
- `daily_recommender_train` DAG 실행 상태 확인
- Guest/Member 모델 학습 완료 확인
- 젯슨 동기화 완료 확인

### 3. 주간리포트 DAG (월요일 06:00)
- `weekly_report_mail` DAG 실행 상태 확인
- PDF 생성 및 메일 발송 완료 확인

### 4. 젯슨 동기화 확인
```bash
ssh jetson@192.168.0.10 "cat /opt/app/health.txt"
```

## 문제 해결

### SSH 연결 실패
- 젯슨 IP 주소 확인
- SSH 키 권한 확인
- 방화벽 설정 확인

### 메일 발송 실패
- Gmail 앱 비밀번호 확인
- 수신자 이메일 주소 확인
- OpenAI API 키 확인

### 모델 동기화 실패
- 젯슨 디스크 공간 확인
- SSH 키 권한 확인
- 네트워크 연결 확인

### 전처리 실패
- sobi-db 연결 상태 확인
- receipt 테이블 데이터 존재 확인
- preprocessing 모듈 설치 확인

## 로그 확인

```bash
# Airflow 로그 확인
docker logs mlops_airflow

# 전처리 로그 확인
docker logs mlops_trainer

# 주간리포트 로그 확인
docker logs mlops_weekly_report
```
