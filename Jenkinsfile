pipeline {
    agent any

    environment {
        BLUE_COMPOSE = 'docker-compose.blue.yaml'
        GREEN_COMPOSE = 'docker-compose.green.yaml'
        CORE_COMPOSE = 'docker-compose.core.yaml'
        ACTIVE_FILE = '.active_color'
        PROJECT_DIR = '.'
    }

    stages {
        stage('Determine Active Color') {
            steps {
                dir("${PROJECT_DIR}") {
                    script {
                        def ACTIVE
                        def INACTIVE
                        
                        // 실제 실행 중인 컨테이너를 확인해서 활성 색상 감지
                        def runningContainers = sh(
                            script: "docker ps --format '{{.Names}}' | grep -E 'sobi-(frontend|backend)-(blue|green)' || true",
                            returnStdout: true
                        ).trim()
                        
                        echo "Running containers: ${runningContainers}"
                        
                        if (runningContainers.contains('sobi-frontend-blue') || runningContainers.contains('sobi-backend-blue')) {
                            ACTIVE = 'blue'
                        } else if (runningContainers.contains('sobi-frontend-green') || runningContainers.contains('sobi-backend-green')) {
                            ACTIVE = 'green'
                        } else {
                            // 실행 중인 컨테이너가 없으면 파일에서 읽거나 기본값 사용
                            if (fileExists(ACTIVE_FILE)) {
                                ACTIVE = readFile(ACTIVE_FILE).trim()
                            } else {
                                ACTIVE = 'blue'
                            }
                        }
                        
                        echo "Current active color: ${ACTIVE}"
                        INACTIVE = (ACTIVE == 'blue') ? 'green' : 'blue'
                        echo "Deploying to: ${INACTIVE}"
                        env.ACTIVE = ACTIVE
                        env.INACTIVE = INACTIVE
                        
                        // nginx 설정 동기화는 Switch Nginx 단계에서만 수행
                        echo "Active environment detected: ${ACTIVE}"
                    }
                }
            }
        }

        stage('Build') {
            steps {
                dir("${PROJECT_DIR}") {
                    script {
                        def composeFile = (env.INACTIVE == 'blue') ? BLUE_COMPOSE : GREEN_COMPOSE
                        echo "Building images using ${composeFile}"
                        sh "docker compose -f ${composeFile} build"
                    }
                }
            }
        }

        stage('Deploy to Inactive') {
            steps {
                dir("${PROJECT_DIR}") {
                    script {
                        def composeFile = (env.INACTIVE == 'blue') ? BLUE_COMPOSE : GREEN_COMPOSE
                        def projectName = "sobi-${env.INACTIVE}"

                        echo "Deploying to inactive environment: ${env.INACTIVE}"
                        sh "docker compose -f ${composeFile} -p ${projectName} up -d"

                        echo "Waiting for backend to be ready..."
                        def backendService = (env.INACTIVE == 'blue') ? 'backend-blue' : 'backend-green'
                        retry(6) {
                            sleep(time: 5, unit: 'SECONDS')
                            sh "docker compose -f ${composeFile} -p ${projectName} ps ${backendService} | grep 'Up'"
                        }
                    }
                }
            }
        }

        stage('Switch Nginx') {
            steps {
                dir("${PROJECT_DIR}") {
                    script {
                        echo "Switching Nginx config to ${env.INACTIVE}"
                        sh "cp ./nginx/nginx.${env.INACTIVE}.conf ./nginx/nginx.conf"
                        sh "docker exec sobi-nginx nginx -t"  // 설정 파일 검증
                        sh "docker exec sobi-nginx nginx -s reload"
                    }
                }
            }
        }

        stage('Cleanup Old Version') {
            steps {
                dir("${PROJECT_DIR}") {
                    script {
                        def composeFile = (env.ACTIVE == 'blue') ? BLUE_COMPOSE : GREEN_COMPOSE
                        def projectName = "sobi-${env.ACTIVE}"

                        echo "Stopping old environment: ${env.ACTIVE}"
                        sh "docker compose -f ${composeFile} -p ${projectName} down --remove-orphans"
                    }
                }
            }
        }

        stage('Update Active Color') {
            steps {
                dir("${PROJECT_DIR}") {
                    echo "Updating active color to ${env.INACTIVE}"
                    writeFile file: ACTIVE_FILE, text: "${env.INACTIVE}"
                }
            }
        }
    }

    post {
    success {
        echo "✅ Blue-Green Deployment completed successfully!"
    }
    failure {
        echo "❌ Deployment failed. Please check logs."
        sh """
        echo "🧹 Cleaning up leftover containers..."
        docker compose -f docker-compose.blue.yaml -p sobi-blue down --remove-orphans || true
        docker compose -f docker-compose.green.yaml -p sobi-green down --remove-orphans || true
        """
    }
}

}
