# Terraform configuration for Zenthea staging environment (ECS Fargate + ALB)
# HIPAA-compliant AWS infrastructure
# 
# Usage:
#   terraform init
#   terraform plan -var-file=staging.tfvars
#   terraform apply -var-file=staging.tfvars

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment and configure backend after initial setup
  # backend "s3" {
  #   bucket         = "zenthea-terraform-state"
  #   key            = "staging/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "zenthea-terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment   = var.environment
      Project       = "zenthea"
      ManagedBy     = "terraform"
      HIPAACompliant = "true"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC and networking
module "vpc" {
  source = "./modules/vpc"

  environment     = var.environment
  vpc_cidr        = var.vpc_cidr
  availability_zones = data.aws_availability_zones.available.names
}

# ECS Cluster
resource "aws_ecs_cluster" "zenthea" {
  name = "${var.environment}-zenthea-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.environment}-zenthea-cluster"
  }
}

# ECR Repository for Docker images
resource "aws_ecr_repository" "zenthea" {
  name                 = "${var.environment}-zenthea"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name = "${var.environment}-zenthea-ecr"
  }
}

# ECR Lifecycle Policy (keep last 10 images)
resource "aws_ecr_lifecycle_policy" "zenthea" {
  repository = aws_ecr_repository.zenthea.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus     = "any"
        countType     = "imageCountMoreThan"
        countNumber   = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

# Application Load Balancer
resource "aws_lb" "zenthea" {
  name               = "${var.environment}-zenthea-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnet_ids

  enable_deletion_protection = var.environment == "production"

  # Access logs disabled temporarily to avoid S3 permission issues
  # Can be enabled later after bucket policy is properly configured
  # access_logs {
  #   bucket  = aws_s3_bucket.alb_logs.id
  #   enabled = true
  #   prefix  = "alb"
  # }

  tags = {
    Name = "${var.environment}-zenthea-alb"
  }
}

# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "${var.environment}-zenthea-alb-sg"
  description = "Security group for Zenthea ALB"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP (redirect to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-zenthea-alb-sg"
  }
}

# ALB Target Group
resource "aws_lb_target_group" "zenthea" {
  name        = "${var.environment}-zenthea-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/api/health"
    protocol            = "HTTP"
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = {
    Name = "${var.environment}-zenthea-tg"
  }
}

# ALB HTTPS Listener (ACM certificate is now ISSUED)
resource "aws_lb_listener" "zenthea_https" {
  load_balancer_arn = aws_lb.zenthea.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.zenthea.arn
  }
}

# ALB HTTP Listener (redirect to HTTPS)
resource "aws_lb_listener" "zenthea_http" {
  load_balancer_arn = aws_lb.zenthea.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ECS Task Execution Role (for pulling images, CloudWatch logs, Secrets Manager)
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.environment}-zenthea-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    Name = "${var.environment}-zenthea-ecs-execution-role"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional permissions for Secrets Manager and SSM Parameter Store
resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name = "${var.environment}-zenthea-ecs-execution-secrets"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "ssm:GetParameters",
          "ssm:GetParameter",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.environment}/zenthea/*",
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/zenthea/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = [
              "secretsmanager.${var.aws_region}.amazonaws.com",
              "ssm.${var.aws_region}.amazonaws.com"
            ]
          }
        }
      }
    ]
  })
}

# ECS Task Role (for application-level AWS API access)
resource "aws_iam_role" "ecs_task" {
  name = "${var.environment}-zenthea-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    Name = "${var.environment}-zenthea-ecs-task-role"
  }
}

# Task role policy for S3 access (if using IAM roles instead of access keys)
resource "aws_iam_role_policy" "ecs_task_s3" {
  name = "${var.environment}-zenthea-ecs-task-s3"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.s3_bucket_name}",
          "arn:aws:s3:::${var.s3_bucket_name}/*",
          "arn:aws:s3:::${var.s3_medical_bucket_name}",
          "arn:aws:s3:::${var.s3_medical_bucket_name}/*"
        ]
      }
    ]
  })
}

# ECS Service Security Group
resource "aws_security_group" "ecs_service" {
  name        = "${var.environment}-zenthea-ecs-sg"
  description = "Security group for Zenthea ECS tasks"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-zenthea-ecs-sg"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "zenthea" {
  name              = "/ecs/${var.environment}-zenthea"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.environment}-zenthea-logs"
  }
}

# S3 Bucket for ALB Access Logs
resource "aws_s3_bucket" "alb_logs" {
  bucket = "${var.environment}-zenthea-alb-logs-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "${var.environment}-zenthea-alb-logs"
  }
}

resource "aws_s3_bucket_versioning" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ECS Task Definition
resource "aws_ecs_task_definition" "zenthea" {
  family                   = "${var.environment}-zenthea"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "zenthea"
    image = "${aws_ecr_repository.zenthea.repository_url}:latest"

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    environment = [
      {
        name  = "NODE_ENV"
        value = var.environment
      },
      {
        name  = "AWS_REGION"
        value = var.aws_region
      },
      {
        name  = "NEXT_PUBLIC_APP_URL"
        value = "https://${var.domain_name}"
      }
    ]

    secrets = [
      {
        name      = "DATABASE_URL"
        valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.environment}/zenthea/DATABASE_URL"
      },
      {
        name      = "CLERK_SECRET_KEY"
        valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.environment}/zenthea/CLERK_SECRET_KEY"
      },
      {
        name      = "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
        valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.environment}/zenthea/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
      },
      {
        name      = "CLERK_WEBHOOK_SECRET"
        valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.environment}/zenthea/CLERK_WEBHOOK_SECRET"
      },
      {
        name      = "STRIPE_SECRET_KEY"
        valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.environment}/zenthea/STRIPE_SECRET_KEY"
      },
      {
        name      = "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
        valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.environment}/zenthea/NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
      },
      {
        name      = "STRIPE_WEBHOOK_SECRET"
        valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.environment}/zenthea/STRIPE_WEBHOOK_SECRET"
      },
      {
        name      = "NEXT_PUBLIC_CONVEX_URL"
        valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.environment}/zenthea/NEXT_PUBLIC_CONVEX_URL"
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.zenthea.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])

  tags = {
    Name = "${var.environment}-zenthea-task"
  }
}

# ECS Service
resource "aws_ecs_service" "zenthea" {
  name            = "${var.environment}-zenthea-service"
  cluster         = aws_ecs_cluster.zenthea.id
  task_definition = aws_ecs_task_definition.zenthea.arn
  desired_count  = var.desired_task_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnet_ids
    security_groups  = [aws_security_group.ecs_service.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.zenthea.arn
    container_name   = "zenthea"
    container_port   = 3000
  }

  depends_on = [
    aws_lb_listener.zenthea_http
  ]

  tags = {
    Name = "${var.environment}-zenthea-service"
  }
}

# Outputs
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.zenthea.dns_name
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.zenthea.arn
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.zenthea.repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.zenthea.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.zenthea.name
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.zenthea.name
}
