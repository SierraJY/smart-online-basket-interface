FROM openjdk:17-jdk-slim

# 빌드 도구용 패키지 설치 (gradlew 실행용)
RUN apt-get update && apt-get install -y curl unzip && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리
WORKDIR /app

# 전체 소스 복사
COPY . .

# gradlew 실행 권한 + 빌드
RUN chmod +x ./gradlew && ./gradlew build -x test

# 빌드된 JAR 추출 (정확한 파일명 지정)
RUN cp build/libs/sobi_backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]