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

        // stage('Test') {
        //     steps {
        //         dir("${PROJECT_DIR}") {
        //             // 테스트용 컨테이너 띄우기
        //             sh "docker compose -f ${COMPOSE_FILE} up -d"

        //             // 컨테이너 네트워크 내 backend 컨테이너 이름으로 헬스체크
        //             script {
        //                 def code = sh(script: "docker exec sobi-backend curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/health", returnStdout: true).trim()
        //                 if (code != '200') {
        //                     error "Health check failed with status ${code}"
        //                 }
        //             }

        //             // 테스트 후 컨테이너 종료
        //             sh "docker compose -f ${COMPOSE_FILE} down"
        //         }
        //     }
        // }

        stage('Deploy') {
            steps {
                dir("${PROJECT_DIR}") {
                    // 기존 서비스 내리고
                    sh "docker compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} down --remove-orphans"

                    // 새 버전 서비스 올리기
                    sh "docker compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} up -d"
                }
            }
        }
    }

    post {
        success {
            echo "✅ Build, Test, Deploy 완료!"
        }
        failure {
            echo "❌ 실패. 롤백 또는 확인 필요."
            sh "docker compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} down --remove-orphans || true"
        }
    }
}
