# DockerOperator 문제 해결 완료 요약

## 🔧 해결된 문제들

### 1. Docker 소켓 권한 문제 ✅
- **문제**: `Permission denied: '/var/run/docker.sock'`
- **해결**: Airflow Dockerfile에 docker 그룹 설정 추가
- **결과**: DockerOperator가 Docker 소켓에 정상 접근 가능

### 2. SSH 키 마운트 권한 문제 ✅
- **문제**: `:ro` (읽기 전용)으로 인해 chmod 600 실행 불가
- **해결**: docker-compose.yml에서 `:ro` 제거
- **결과**: 컨테이너 내부에서 SSH 키 권한 수정 가능

### 3. DAG command 파싱 문제 ✅
- **문제**: `chmod 600 && python` 명령어가 제대로 파싱되지 않음
- **해결**: `sh -c "chmod 600 && python"` 형태로 변경
- **결과**: chmod와 python 명령어가 순차적으로 정상 실행

### 4. mount_tmp_dir 문제 ✅
- **문제**: `/tmp/airflowtmp...` 바인드 경로 오류
- **해결**: `mount_tmp_dir=False` 옵션 추가
- **결과**: tmp 디렉토리 바인드 오류 방지

## 📝 수정된 파일들

### 1. `infra/airflow/Dockerfile`
```dockerfile
# Docker 소켓 접근을 위한 그룹 설정
RUN groupadd -g 999 docker || true && \
    usermod -aG docker airflow
```

### 2. `docker-compose.yaml`
```yaml
# SSH 키 마운트 (쓰기 가능)
- ./secrets/ssh:/tmp/ssh                    # :ro 제거
- ./secrets/ssh/id_ed25519_jetson:/mnt/ssh/id_ed25519_jetson  # :ro 제거
```

### 3. `infra/airflow/dags/daily_recommender_train.py`
```python
# DockerOperator 개선
train_guest = DockerOperator(
    # ... 기존 설정 ...
    mount_tmp_dir=False,  # tmp 바인드 경로 오류 방지
    mounts=[
        Mount(
            target="/mnt/ssh/id_ed25519_jetson",
            source="/home/heejun/S13P11B103/ai/mlops_project/secrets/ssh/id_ed25519_jetson",
            type="bind",
            read_only=False,  # 쓰기 가능하도록 변경
        ),
        # ... 기타 마운트 ...
    ],
    command='sh -c "chmod 600 /mnt/ssh/id_ed25519_jetson && python train_guest_model.py"',
)
```

## 🚀 적용 방법

### 1. SSH 키 권한 수정
```bash
./fix_ssh_permissions.sh
```

### 2. Docker 컨테이너 재시작
```bash
docker compose restart
```

### 3. Airflow DAG 테스트
- Airflow UI에서 `daily_recommender_train` DAG 활성화
- `train_guest` 또는 `train_member` 태스크 수동 실행
- 로그에서 권한 오류가 없는지 확인

## ✅ 예상 결과

- **train_guest 태스크**: 정상 실행, SSH 키 권한 수정 성공
- **train_member 태스크**: 정상 실행, SSH 키 권한 수정 성공
- **Docker 컨테이너**: 성공적으로 생성되고 실행됨
- **권한 오류**: 더 이상 발생하지 않음

## 🔍 확인 포인트

1. **Docker 소켓 접근**: `docker exec mlops_airflow docker ps`
2. **SSH 키 권한**: 컨테이너 내부에서 `ls -la /mnt/ssh/id_ed25519_jetson`
3. **DAG 실행**: Airflow 로그에서 "Permission denied" 오류 없음
4. **모델 훈련**: Python 스크립트가 정상적으로 실행됨

## 📚 참고 사항

- SSH 키는 보안상 600 권한으로 설정되어야 함
- Docker 소켓 접근은 보안상 주의가 필요함
- 프로덕션 환경에서는 더 엄격한 권한 설정 권장
