pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-compose.yaml'
    }

    stages {
        stage('Checkout') {
            steps {
                git credentialsId: 'gitlab-token', url: 'https://lab.ssafy.com/s13-webmobile3-sub1/S13P11B103.git'
            }
        }

        stage('Build') {
            steps {
                echo "Building Docker images..."
                sh "docker compose -f $COMPOSE_FILE build"
            }
        }

        stage('Test') {
            steps {
                echo "Running tests..."
            }
        }

        stage('Deploy') {
            when {
                branch 'develop'
            }
            steps {
                echo "Deploying to server..."
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
