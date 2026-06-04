pipeline {
    agent any

    stages {

        stage('Clone') {
            steps {
                echo 'Source code available from Jenkins workspace'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t asquare-backend:latest .'
            }
        }

        stage('Deploy Container') {
            steps {
                sh '''
                docker stop asquare-backend || true
                docker rm asquare-backend || true

                docker run -d \
                  --name asquare-backend \
                  -p 3000:3000 \
                  asquare-backend:latest
                '''
            }
        }
    }
}