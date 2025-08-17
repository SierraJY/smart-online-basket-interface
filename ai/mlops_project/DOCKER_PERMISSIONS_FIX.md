# Docker 권한 문제 해결 가이드

## 문제 상황
Airflow DAG에서 `DockerOperator`를 사용할 때 다음과 같은 권한 오류가 발생합니다:
```
Permission denied: '/var/run/docker.sock'
```

## 원인
Airflow 컨테이너 내부의 `airflow` 유저가 Docker 소켓에 접근할 권한이 없기 때문입니다.

## 해결 방법

### 1. Dockerfile 수정 (완료됨)
`infra/airflow/Dockerfile`에 다음 내용이 추가되었습니다:
```dockerfile
# Docker 소켓 접근을 위한 그룹 설정
RUN groupadd -g 999 docker || true && \
    usermod -aG docker airflow
```

### 2. docker-compose.yml 설정 (완료됨)
- Docker 소켓 마운트: `/var/run/docker.sock:/var/run/docker.sock:rw`
- 그룹 추가: `group_add: - docker`

### 3. 컨테이너 재빌드 및 재시작
```bash
# 1. 컨테이너 중지
docker-compose down

# 2. 이미지 재빌드
docker-compose build airflow

# 3. 컨테이너 시작
docker-compose up -d

# 4. 권한 문제 해결 스크립트 실행
./fix_docker_permissions.sh
```

### 4. 권한 문제 해결 스크립트 실행
```bash
# 스크립트 실행
./fix_docker_permissions.sh

# 또는 수동으로 권한 수정
docker exec --user root mlops_airflow bash -c "
    groupadd -g 999 docker 2>/dev/null || true
    usermod -aG docker airflow
    chown root:docker /var/run/docker.sock
    chmod 666 /var/run/docker.sock
"
```

### 5. 컨테이너 재시작
```bash
docker-compose restart airflow
```

## 확인 방법

### 1. 권한 확인
```bash
# 호스트에서
ls -la /var/run/docker.sock

# 컨테이너 내부에서
docker exec mlops_airflow ls -la /var/run/docker.sock
docker exec mlops_airflow groups
```

### 2. Docker 접근 테스트
```bash
# 컨테이너 내부에서 Docker 명령어 테스트
docker exec mlops_airflow docker ps
```

### 3. Airflow DAG 테스트
- Airflow UI에서 `daily_recommender_train` DAG 활성화
- `train_guest` 또는 `train_member` 태스크 수동 실행
- 로그에서 권한 오류가 없는지 확인

## 예상 결과
- `train_guest` 태스크가 정상적으로 실행됨
- `train_member` 태스크가 정상적으로 실행됨
- Docker 컨테이너가 성공적으로 생성되고 실행됨

## 문제가 지속되는 경우

### 1. 호스트 권한 확인
```bash
# 호스트에서 docker 그룹에 현재 사용자 추가
sudo usermod -aG docker $USER
newgrp docker
```

### 2. 컨테이너 권한 강제 설정
```bash
docker exec --user root mlops_airflow chmod 666 /var/run/docker.sock
```

### 3. 로그 확인
```bash
# Airflow 로그 확인
docker-compose logs -f airflow

# Docker 데몬 로그 확인
sudo journalctl -u docker.service -f
```

## 참고 사항
- 이 설정은 보안상 프로덕션 환경에서는 주의가 필요합니다
- Docker 소켓 접근 권한은 최소한으로 제한하는 것이 좋습니다
- 정기적으로 권한을 확인하고 필요시 재설정하세요
