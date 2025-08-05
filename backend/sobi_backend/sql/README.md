# init.sql을 컨테이너로 복사
```
docker cp init.sql sobi-db:/tmp/init.sql
```

# 컨테이너 내에서 psql로 실행
### Window
```
docker exec -it sobi-db psql -U sobiuser -d sobi -f //tmp/init.sql
```

### Others
```
docker exec -it sobi-db psql -U sobiuser -d sobi -f /tmp/init.sql
```