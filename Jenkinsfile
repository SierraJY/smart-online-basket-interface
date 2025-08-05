pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-compose.yaml'
    }

    stages {
        stage('Build') {
            when {
                branch 'develop'
            }
            steps {
                echo "Building Docker images..."
                sh "docker compose -f $COMPOSE_FILE build"
            }
        }

        stage('Test') {
            when {
                branch 'develop'
            }
            steps {
                echo "Running tests..."
            }
        }

        stage('Deploy') {
            when {
                branch 'develop'
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
