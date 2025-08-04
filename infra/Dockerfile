FROM jenkins/jenkins:lts

USER root

# Docker 설치
RUN apt-get update && apt-get install -y docker.io curl

# Docker Compose V2 (plugin 방식)
RUN mkdir -p /usr/libexec/docker/cli-plugins && \
    curl -SL https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-linux-x86_64 \
    -o /usr/libexec/docker/cli-plugins/docker-compose && \
    chmod +x /usr/libexec/docker/cli-plugins/docker-compose

USER jenkins
