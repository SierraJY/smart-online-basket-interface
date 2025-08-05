# Redis 더미데이터 Docker 실행 명령어 (직접 입력 방식)

# 1. 사용자-바구니 매핑 생성 (고객ID 1번 → 라즈베리파이 바구니)
docker exec -it sobi-redis redis-cli SET "user_basket:1" "2c:cf:67:11:93:6b"
docker exec -it sobi-redis redis-cli EXPIRE "user_basket:1" 3600

# 2. 확인 명령어
docker exec -it sobi-redis redis-cli GET "user_basket:1"