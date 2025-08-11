pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-compose.web.yaml'
        PROJECT_NAME = 'sobi-web'
        PROJECT_DIR = '.'
    }

    stages {
        stage('Build') {
            steps {
                dir("${PROJECT_DIR}") {
                    sh "docker compose -f ${COMPOSE_FILE} build"
                }
            }
        }

        stage('Cleanup Existing Containers') {
            steps {
                echo "Cleaning up existing containers if any..."
                sh "docker rm -f sobi-backend sobi-frontend || true"
            }
        }

        // 헬스 체크 테스트는 주석 처리 상태 유지
        /*
        stage('Test') {
            steps {
                dir("${PROJECT_DIR}") {
                    sh "docker compose -f ${COMPOSE_FILE} up -d"
                    script {
                        def code = sh(script: "docker exec sobi-backend curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/health", returnStdout: true).trim()
                        if (code != '200') {
                            error "Health check failed with status ${code}"
                        }
                    }
                    sh "docker compose -f ${COMPOSE_FILE} down"
                }
            }
        }
        */

        stage('Deploy') {
            steps {
                dir("${PROJECT_DIR}") {
                    echo "Stopping old services"
                    sh "docker compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} down --remove-orphans || true"

                    echo "Starting new services"
                    sh "docker compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} up -d"
                }
            }
        }
    }

    post {
        success {
            echo "✅ Build and Deploy 완료!"
        }
        failure {
            echo "❌ 실패. 롤백 또는 확인 필요."
            sh "docker compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} down --remove-orphans || true"
        }
    }
}
