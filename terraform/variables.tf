variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type. t3.medium (2 vCPU / 4 GB RAM) gives comfortable headroom for Docker + the app + Jenkins agent / extra tooling. Downgrade to t2.micro only if you strictly want free-tier."
  type        = string
  default     = "t3.medium"
}

variable "key_name" {
  description = "Name of the existing AWS EC2 key pair. The private half must be stored in Jenkins as an SSH credential."
  type        = string
}
