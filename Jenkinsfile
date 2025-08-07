pipeline {
    agent any

    environment {
        BLUE_COMPOSE = 'docker-compose.yaml'
        GREEN_COMPOSE = 'docker-compose.green.yaml'
        ACTIVE_FILE = '/var/jenkins_home/.active_color'
    }

    stages {
        stage('Determine Active Color') {
            steps {
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

        stage('Build') {
            steps {
                script {
                    def composeFile = (INACTIVE == 'blue') ? BLUE_COMPOSE : GREEN_COMPOSE
                    echo "Building images using ${composeFile}"
                    sh "docker compose -f ${composeFile} build"
                }
            }
        }

        stage('Deploy to Inactive') {
            steps {
                script {
                    def composeFile = (INACTIVE == 'blue') ? BLUE_COMPOSE : GREEN_COMPOSE
                    def projectName = "sobi-${INACTIVE}"

                    echo "Deploying to inactive environment: ${INACTIVE}"
                    sh "docker compose -f ${composeFile} -p ${projectName} up -d"

                    echo "Waiting for backend to be ready..."
                    sleep(time: 5, unit: 'SECONDS')

                    echo "Health check on new backend..."
                    def backendPort = (INACTIVE == 'blue') ? '8080' : '8081'
                    sh "curl -f http://localhost:${backendPort}/actuator/health"
                }
            }
        }

        stage('Switch Nginx') {
            steps {
                script {
                    echo "Switching Nginx config to ${INACTIVE}"
                    // Nginx 설정 파일 교체 (green용, blue용 따로 만들어두기)
                    sh "cp ./nginx/nginx.${INACTIVE}.conf ./nginx/nginx.conf"
                    sh "docker exec sobi-nginx nginx -s reload"
                }
            }
        }

        stage('Cleanup Old Version') {
            steps {
                script {
                    def composeFile = (ACTIVE == 'blue') ? BLUE_COMPOSE : GREEN_COMPOSE
                    def projectName = "sobi-${ACTIVE}"

                    echo "Stopping old environment: ${ACTIVE}"
                    sh "docker compose -f ${composeFile} -p ${projectName} down -v --remove-orphans"
                }
            }
        }

        stage('Update Active Color') {
            steps {
                echo "Updating active color to ${INACTIVE}"
                writeFile file: ACTIVE_FILE, text: "${INACTIVE}"
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
