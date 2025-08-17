#!/bin/bash

# Docker 권한 문제 해결 스크립트
# 이 스크립트는 Airflow 컨테이너에서 Docker 소켓 접근 권한을 확인하고 수정합니다.

echo "🔧 Docker 권한 문제 해결 시작..."

# 1. 호스트의 docker.sock 권한 확인
echo "📋 호스트 docker.sock 권한 확인:"
ls -la /var/run/docker.sock

# 2. docker 그룹 확인
echo "📋 docker 그룹 확인:"
getent group docker

# 3. Airflow 컨테이너에서 권한 확인 및 수정
echo "📋 Airflow 컨테이너 권한 확인 및 수정:"

# 컨테이너가 실행 중인지 확인
if docker ps | grep -q mlops_airflow; then
    echo "✅ mlops_airflow 컨테이너가 실행 중입니다."
    
    # 컨테이너 내부에서 권한 확인
    echo "📋 컨테이너 내부 docker 그룹 확인:"
    docker exec mlops_airflow groups
    
    # 컨테이너 내부에서 docker 소켓 접근 테스트
    echo "📋 Docker 소켓 접근 테스트:"
    docker exec mlops_airflow ls -la /var/run/docker.sock
    
    # 필요시 권한 수정 (root로 실행)
    echo "🔧 권한 수정 중..."
    docker exec --user root mlops_airflow bash -c "
        groupadd -g 999 docker 2>/dev/null || true
        usermod -aG docker airflow
        chown root:docker /var/run/docker.sock
        chmod 666 /var/run/docker.sock
    "
    
    echo "✅ 권한 수정 완료!"
    
    # 수정 후 권한 확인
    echo "📋 수정 후 권한 확인:"
    docker exec mlops_airflow ls -la /var/run/docker.sock
    docker exec mlops_airflow groups
    
else
    echo "❌ mlops_airflow 컨테이너가 실행 중이 아닙니다."
    echo "💡 컨테이너를 먼저 시작해주세요:"
    echo "   docker-compose up -d airflow"
fi

echo "🎉 Docker 권한 문제 해결 완료!"
echo ""
echo "📝 다음 단계:"
echo "1. 컨테이너 재시작: docker-compose restart airflow"
echo "2. Airflow DAG에서 DockerOperator 테스트"
echo "3. 로그 확인: docker-compose logs -f airflow"
