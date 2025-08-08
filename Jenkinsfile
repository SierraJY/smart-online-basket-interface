pipeline {
    agent any

    environment {
        BLUE_COMPOSE = 'docker-compose.blue.yaml'
        GREEN_COMPOSE = 'docker-compose.green.yaml'
        ACTIVE_FILE = '/var/jenkins_home/.active_color'
        PROJECT_DIR = 'S13P11B103'  // docker-compose 파일들이 있는 경로
    }

    stages {
        stage('Determine Active Color') {
            steps {
                dir("${PROJECT_DIR}") {
                    script {
                        if (fileExists(ACTIVE_FILE)) {
                            ACTIVE = readFile(ACTIVE_FILE).trim()
                        } else {
                            ACTIVE = 'blue'
                        }
                        echo "Current active color: ${ACTIVE}"
                        INACTIVE = (ACTIVE == 'blue') ? 'green' : 'blue'
                        echo "Deploying to: ${INACTIVE}"
                    }
                }
            }
        }

        stage('Build') {
            steps {
                dir("${PROJECT_DIR}") {
                    script {
                        def composeFile = (INACTIVE == 'blue') ? BLUE_COMPOSE : GREEN_COMPOSE
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
                        def composeFile = (INACTIVE == 'blue') ? BLUE_COMPOSE : GREEN_COMPOSE
                        def projectName = "sobi-${INACTIVE}"

                        echo "Deploying to inactive environment: ${INACTIVE}"
                        sh "docker compose -f ${composeFile} -p ${projectName} up -d"

                        echo "Waiting for backend to be ready..."
                        // 최대 30초까지 재시도
                        def backendPort = (INACTIVE == 'blue') ? '8080' : '8081'
                        retry(6) { // 6번 * 5초 = 30초
                            sleep(time: 5, unit: 'SECONDS')
                            sh "curl -f http://localhost:${backendPort}/actuator/health"
                        }
                    }
                }
            }
        }

        stage('Switch Nginx') {
            steps {
                dir("${PROJECT_DIR}") {
                    script {
                        echo "Switching Nginx config to ${INACTIVE}"
                        sh "cp ./nginx/nginx.${INACTIVE}.conf ./nginx/nginx.conf"
                        sh "docker exec sobi-nginx nginx -s reload"
                    }
                }
            }
        }

        stage('Cleanup Old Version') {
            steps {
                dir("${PROJECT_DIR}") {
                    script {
                        def composeFile = (ACTIVE == 'blue') ? BLUE_COMPOSE : GREEN_COMPOSE
                        def projectName = "sobi-${ACTIVE}"

                        echo "Stopping old environment: ${ACTIVE}"
                        sh "docker compose -f ${composeFile} -p ${projectName} down -v --remove-orphans"
                    }
                }
            }
        }

        stage('Update Active Color') {
            steps {
                dir("${PROJECT_DIR}") {
                    echo "Updating active color to ${INACTIVE}"
                    writeFile file: ACTIVE_FILE, text: "${INACTIVE}"
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
        }
    }
}
