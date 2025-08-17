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
            echo "✅ Build and Deploy Success!"
        }
        failure {
            echo "❌ Failed. Rollback or verification required."
            sh "docker compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} down --remove-orphans || true"
        }
    }
}
