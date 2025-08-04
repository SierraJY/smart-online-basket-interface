pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-compose.yaml'
    }

    stages {
        stage('Build') {
            when {
                expression { env.CHANGE_TARGET == 'develop' }
            }
            steps {
                echo "Building Docker images for MR targeting 'develop'..."
                sh "docker compose -f $COMPOSE_FILE build"
            }
        }

        stage('Test') {
            when {
                expression { env.CHANGE_TARGET == 'develop' }
            }
            steps {
                echo "Running tests for MR targeting 'develop'..."
            }
        }

        stage('Deploy') {
            when {
                allOf {
                    expression { env.CHANGE_TARGET == 'develop' }
                    branch 'develop'
                }
            }
            steps {
                echo "Deploying develop branch..."
                sh "docker compose -f $COMPOSE_FILE up -d"
            }
        }
    }

    post {
        success {
            echo "Pipeline completed successfully"
        }
        failure {
            echo "Pipeline failed. Please check the logs."
        }
    }
}
