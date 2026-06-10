pipeline {
    agent any

    stages {

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t asquare-backend:latest .'
            }
        }

        stage('Check Kubernetes') {
            steps {
                sh 'kubectl get pods'
            }
        }
    }
}