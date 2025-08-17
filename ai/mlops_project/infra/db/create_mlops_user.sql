-- MLOps 사용자 생성 및 권한 설정
-- Core PostgreSQL에서 실행

-- MLOps 전용 사용자 생성
CREATE USER mlops_reader WITH PASSWORD 'mlops_read_only';

-- sobi 데이터베이스에 대한 읽기 권한 부여
GRANT CONNECT ON DATABASE sobi TO mlops_reader;

-- 기존 테이블들에 대한 읽기 권한 부여
GRANT USAGE ON SCHEMA public TO mlops_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mlops_reader;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO mlops_reader;

-- 향후 생성될 테이블들에 대한 읽기 권한 부여
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO mlops_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO mlops_reader;

-- training_data 테이블이 있다면 읽기 권한 부여
GRANT SELECT ON TABLE training_data TO mlops_reader;

-- 사용자 생성 확인
SELECT usename, usesuper, usecreatedb FROM pg_user WHERE usename = 'mlops_reader';
