pipeline {
    agent any

    environment {
        IMAGE_NAME = "projectmanagementsystembackend"
        CONTAINER_NAME = "projectmanagementsystembackend-container"
        PORT = "8081"
    }

    stages {

        stage('Checkout Code') {
            steps {
                git branch: 'mybranch', url: 'https://github.com/anasparacha85/Project-Management-System-Backend.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    bat "docker build -t ${IMAGE_NAME} ."
                }
            }
        }

        stage('Stop Old Container (if any)') {
            steps {
                script {
                    bat """
                    docker stop ${CONTAINER_NAME} || true
                    docker rm ${CONTAINER_NAME} || true
                    """
                }
            }
        }

        stage('Run Container') {
            steps {
                script {
                    bat """
                    docker run -d \
                    --name ${CONTAINER_NAME} \
                    -p ${PORT}:${PORT} \
                    ${IMAGE_NAME}
                    """
                }
            }
        }
    }

    post {
        success {
            echo "✅ App successfully deployed on port ${PORT}"
        }
        failure {
            echo "❌ Build or deployment failed"
        }
    }
}
