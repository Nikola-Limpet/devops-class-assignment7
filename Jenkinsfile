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
        REPO_URL      = 'https://github.com/Nikola-Limpet/devops-class-assignment7.git'
    }

    options {
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main', url: "${REPO_URL}"
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
                sh '''
                    for i in $(seq 1 10); do
                        if curl -fs "http://${EC2_IP}/menu" > /dev/null; then
                            echo "App is healthy at http://${EC2_IP}/menu"
                            exit 0
                        fi
                        echo "Waiting for app (attempt $i)..."
                        sleep 3
                    done
                    echo "App did not become healthy, dumping container logs:"
                    ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
                        ec2-user@${EC2_IP} "docker logs ${APP_NAME}" || true
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo "FoodExpress is live at http://${env.EC2_IP}/menu"
        }
        failure {
            echo "Pipeline failed. EC2 IP (if provisioned): ${env.EC2_IP}"
        }
        always {
            sh 'rm -f ${IMAGE_TAR} || true'
        }
    }
}
