pipeline {
    agent any

    environment {
        APP_NAME      = 'foodexpress-api'
        IMAGE_NAME    = 'foodexpress-api'
        IMAGE_TAG     = "${env.BUILD_NUMBER}"
        IMAGE_TAR     = "foodexpress-${env.BUILD_NUMBER}.tar"
        APP_HOST_PORT = '80'
        APP_CONT_PORT = '5000'
        TF_DIR        = 'terraform'
        AWS_REGION    = 'us-east-1'
        KEY_NAME      = 'foodexpress-key'
    }

    options {
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
                    docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest
                '''
            }
        }

        stage('Save Image to Tar') {
            steps {
                sh 'docker save ${IMAGE_NAME}:${IMAGE_TAG} -o ${IMAGE_TAR}'
            }
        }

        stage('Terraform Apply') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-credentials'
                ]]) {
                    dir("${TF_DIR}") {
                        sh '''
                            terraform init -input=false
                            terraform apply -auto-approve \
                                -var="aws_region=${AWS_REGION}" \
                                -var="key_name=${KEY_NAME}"
                        '''
                        script {
                            env.EC2_IP = sh(
                                script: "terraform output -raw public_ip",
                                returnStdout: true
                            ).trim()
                        }
                    }
                }
                echo "Provisioned EC2 public IP: ${env.EC2_IP}"
            }
        }

        stage('Wait for cloud-init') {
            steps {
                sshagent(credentials: ['ec2-ssh-key']) {
                    sh '''
                        # Retry SSH until the instance accepts connections, then block
                        # until cloud-init (user_data) finishes installing Docker.
                        for i in $(seq 1 30); do
                            ssh -o StrictHostKeyChecking=no \
                                -o UserKnownHostsFile=/dev/null \
                                -o ConnectTimeout=5 \
                                ec2-user@${EC2_IP} "cloud-init status --wait" && break
                            echo "SSH not ready yet (attempt $i)..."
                            sleep 10
                        done
                    '''
                }
            }
        }

        stage('Ship Image to EC2') {
            steps {
                sshagent(credentials: ['ec2-ssh-key']) {
                    sh '''
                        scp -o StrictHostKeyChecking=no \
                            -o UserKnownHostsFile=/dev/null \
                            ${IMAGE_TAR} ec2-user@${EC2_IP}:/tmp/${IMAGE_TAR}
                    '''
                }
            }
        }

        stage('Deploy Container on EC2') {
            steps {
                sshagent(credentials: ['ec2-ssh-key']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no \
                            -o UserKnownHostsFile=/dev/null \
                            ec2-user@${EC2_IP} bash -s <<EOF
                                set -e
                                docker load -i /tmp/${IMAGE_TAR}
                                docker rm -f ${APP_NAME} 2>/dev/null || true
                                docker run -d \
                                    --name ${APP_NAME} \
                                    --restart unless-stopped \
                                    -p ${APP_HOST_PORT}:${APP_CONT_PORT} \
                                    ${IMAGE_NAME}:${IMAGE_TAG}
                                rm -f /tmp/${IMAGE_TAR}
EOF
                    '''
                }
            }
        }

        stage('Smoke Test') {
            steps {
                // TODO (student contribution): implement the health check.
                //
                // Goal: hit http://${EC2_IP}/menu from the Jenkins runner and
                // fail the build if the app isn't returning a healthy response.
                //
                // Things to decide:
                //   1. How many retries + what delay? The container starts fast
                //      but the docker run + network settle can take a few seconds.
                //   2. What counts as "healthy"? HTTP 200 alone, or should you also
                //      assert that the JSON body contains "success":true ?
                //   3. On failure, do you want to dump `docker logs` from the EC2
                //      to make debugging easier? (Bonus marks in real life.)
                //
                // Replace the echo below with your implementation.
                sh '''
                    echo "TODO: curl http://${EC2_IP}/menu with retries and fail on non-2xx"
                '''
            }
        }
    }

    post {
        success {
            echo "FoodExpress is live at http://${env.EC2_IP}/menu"
        }
        failure {
            echo "Pipeline failed. Check the stage logs above. EC2 IP (if provisioned): ${env.EC2_IP}"
        }
        always {
            sh 'rm -f ${IMAGE_TAR} || true'
        }
    }
}
