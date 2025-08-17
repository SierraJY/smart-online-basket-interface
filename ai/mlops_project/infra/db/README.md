# MLOps Database 연결 설정

## 개요

AI MLOps 프로젝트는 Core PostgreSQL 데이터베이스(`sobi-db`)에 연결하여 데이터를 읽어옵니다.

## 사용자 설정

### 1. Core PostgreSQL에 MLOps 사용자 추가

Core 서비스가 실행 중인 상태에서 다음 명령어를 실행하세요:

```bash
# Core PostgreSQL 컨테이너에 접속
docker exec -it sobi-db psql -U sobiuser -d sobi

# MLOps 사용자 생성 스크립트 실행
\i /docker-entrypoint-initdb.d/create_mlops_user.sql
```

또는 직접 SQL 실행:

```sql
-- MLOps 전용 사용자 생성
CREATE USER mlops_reader WITH PASSWORD 'mlops_read_only';

-- sobi 데이터베이스에 대한 읽기 권한 부여
GRANT CONNECT ON DATABASE sobi TO mlops_reader;
GRANT USAGE ON SCHEMA public TO mlops_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mlops_reader;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO mlops_reader;

-- 향후 생성될 테이블들에 대한 읽기 권한 부여
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO mlops_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO mlops_reader;
```

### 2. 사용자 생성 확인

```sql
SELECT usename, usesuper, usecreatedb FROM pg_user WHERE usename = 'mlops_reader';
```

## 연결 정보

- **호스트**: `sobi-db` (Docker 네트워크 내)
- **포트**: `5432`
- **데이터베이스**: `sobi`
- **사용자**: `mlops_reader`
- **비밀번호**: `mlops_read_only`
- **연결 문자열**: `postgresql://mlops_reader:mlops_read_only@sobi-db:5432/sobi`

## 권한

`mlops_reader` 사용자는 다음 권한을 가집니다:
- ✅ 데이터베이스 연결
- ✅ 모든 테이블 읽기
- ✅ 모든 시퀀스 읽기
- ❌ 데이터 수정/삭제 불가
- ❌ 테이블 생성/삭제 불가

## 실행 순서

1. **Core 서비스 시작**
   ```bash
   cd S13P11B103
   docker-compose -f docker-compose.core.yaml up -d
   ```

2. **MLOps 사용자 생성** (위의 SQL 실행)

3. **MLOps 서비스 시작**
   ```bash
   cd ai/mlops_project
   docker-compose up -d
   ```

## 문제 해결

### 연결 실패 시 확인사항

1. **Core PostgreSQL 실행 상태 확인**
   ```bash
   docker ps | grep sobi-db
   ```

2. **네트워크 연결 확인**
   ```bash
   docker network ls | grep sobi-net
   ```

3. **사용자 존재 확인**
   ```bash
   docker exec -it sobi-db psql -U sobiuser -d sobi -c "SELECT usename FROM pg_user WHERE usename = 'mlops_reader';"
   ```

4. **권한 확인**
   ```bash
   docker exec -it sobi-db psql -U sobiuser -d sobi -c "SELECT table_name, privilege_type FROM information_schema.table_privileges WHERE grantee = 'mlops_reader';"
   ```
