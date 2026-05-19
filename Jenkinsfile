pipeline {
    agent any

    environment {
        DOCKER_HUB = "vinayakhebbar"
        TAG = "${BUILD_NUMBER}"
        EC2_USER = "ubuntu"
        EC2_HOST = "3.219.167.188"
    }

    stages {

        // stage('Checkout Code') {
        //     steps {
        //         git branch: 'main', url: 'YOUR_REPO_URL'
        //     }
        // }

        stage('Test Docker Build') {
            steps {
                sh 'docker --version'
            }
        }

        // stage('Build Docker Images') {
        //     steps {
        //         sh """
        //         docker build -t $DOCKER_HUB/crudapp-backend:$TAG ./backend
        //         docker build -t $DOCKER_HUB/crudapp-frontend:$TAG ./frontend
        //         """
        //     }
        // }

        // stage('Push Images to DockerHub') {
        //     steps {
        //         withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'USER', passwordVariable: 'PASS')]) {
        //             sh """
        //             echo $PASS | docker login -u $USER --password-stdin

        //             docker push $DOCKER_HUB/crudapp-backend:$TAG
        //             docker push $DOCKER_HUB/crudapp-frontend:$TAG
        //             """
        //         }
        //     }
        // }

        stage('Deploy (Blue-Green via EC2 script)') {
            steps {
                sh """
                ssh -o StrictHostKeyChecking=no $EC2_USER@$EC2_HOST '

                # STEP 1: write TAG into correct env folder
                ENV=$(cat /opt/crudapp/state/active_env)

                if [ "$ENV" == "blue" ]; then
                    TARGET="green"
                else
                    TARGET="blue"
                fi

                echo "TAG=$TAG" > /opt/crudapp/$TARGET/.env

                echo "Deploying application..."
                cd /opt/crudapp/deployment
                ./deploy.sh
                '
                """
            }
        }

        stage('Health Check') {
            steps {
                script {
                    sh """
                    ssh $EC2_USER@$EC2_HOST '

                    ENV=$(cat /opt/crudapp/state/active_env)

                    if [ "$ENV" == "blue" ]; then
                        TARGET="green"
                    else
                        TARGET="blue"
                    fi

                    cd /opt/crudapp/scripts
                    ./health-check.sh $TARGET
                    '
                    """
                }
            }
        }

        stage('Switch Traffic') {
            steps {
                sh """
                ssh $EC2_USER@$EC2_HOST '

                ENV=$(cat /opt/crudapp/state/active_env)

                if [ "$ENV" == "blue" ]; then
                    TARGET="green"
                else
                    TARGET="blue"
                fi

                cd /opt/crudapp/scripts
                ./switch.sh $TARGET
                '
                """
            }
        }
    }

    // post {
    //     failure {
    //         steps {
    //             sh """
    //             ssh $EC2_USER@$EC2_HOST '
    //             cd /opt/crudapp/scripts
    //             ./rollback.sh
    //             '
    //             """
    //         }
    //     }
    // }
}