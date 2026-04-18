output "public_ip" {
  description = "Public IP of the FoodExpress EC2 instance"
  value       = aws_instance.foodexpress.public_ip
}

output "public_dns" {
  description = "Public DNS hostname of the EC2 instance"
  value       = aws_instance.foodexpress.public_dns
}

output "ssh_user" {
  description = "Default SSH username for Amazon Linux 2023"
  value       = "ec2-user"
}

output "app_url" {
  description = "Public URL of the running FoodExpress API"
  value       = "http://${aws_instance.foodexpress.public_ip}/menu"
}
