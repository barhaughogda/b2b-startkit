# Variables for Zenthea staging infrastructure

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  default     = "staging"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "domain_name" {
  description = "Domain name for the application (e.g., staging.zenthea.ai)"
  type        = string
}

variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for HTTPS (must be in us-east-1 for ALB)"
  type        = string
}

variable "task_cpu" {
  description = "CPU units for ECS task (256 = 0.25 vCPU, 512 = 0.5 vCPU, 1024 = 1 vCPU)"
  type        = number
  default     = 1024
}

variable "task_memory" {
  description = "Memory for ECS task in MB (must match CPU: 512MB for 256 CPU, 1GB for 512 CPU, 2GB for 1024 CPU)"
  type        = number
  default     = 2048
}

variable "desired_task_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "s3_bucket_name" {
  description = "Name of S3 bucket for images"
  type        = string
}

variable "s3_medical_bucket_name" {
  description = "Name of S3 bucket for medical images"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}
