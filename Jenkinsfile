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
                        if (fileExists(ACTIVE_FILE)) {
                            ACTIVE = readFile(ACTIVE_FILE).trim()
                        } else {
                            ACTIVE = 'blue'
                        }
                        echo "Current active color: ${ACTIVE}"
                        INACTIVE = (ACTIVE == 'blue') ? 'green' : 'blue'
                        echo "Deploying to: ${INACTIVE}"
                        env.ACTIVE = ACTIVE
                        env.INACTIVE = INACTIVE
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
                            sh "docker compose -f ${composeFile} ps ${backendService} | grep 'Up'"
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
                        sh "docker compose -f ${CORE_COMPOSE} exec nginx nginx -s reload"
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
        }
    }
}
