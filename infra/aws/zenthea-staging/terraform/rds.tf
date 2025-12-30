# RDS Postgres instance for Zenthea staging
# HIPAA-compliant configuration

# DB Subnet Group (private subnets)
resource "aws_db_subnet_group" "db" {
  name       = "${var.environment}-zenthea-db-subnet-group"
  subnet_ids = module.vpc.private_subnet_ids

  tags = {
    Name = "${var.environment}-zenthea-db-subnet-group"
  }
}

# DB Security Group
resource "aws_security_group" "db" {
  name        = "${var.environment}-zenthea-db-sg"
  description = "Allow inbound traffic from ECS service"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "Postgres from ECS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_service.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-zenthea-db-sg"
  }
}

# KMS Key for DB Encryption
resource "aws_kms_key" "db" {
  description             = "KMS key for Zenthea DB encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name = "${var.environment}-zenthea-db-key"
  }
}

# RDS Instance
resource "aws_db_instance" "zenthea" {
  identifier           = "${var.environment}-zenthea-db"
  allocated_storage    = var.db_allocated_storage
  storage_type         = "gp3"
  engine               = "postgres"
  engine_version       = "16.3" # Latest stable
  instance_class       = var.db_instance_class
  db_name              = var.db_name
  username             = var.db_username
  password             = var.db_password
  parameter_group_name = "default.postgres16"
  
  db_subnet_group_name   = aws_db_subnet_group.db.name
  vpc_security_group_ids = [aws_security_group.db.id]
  
  # HIPAA/Security best practices
  storage_encrypted = true
  kms_key_id        = aws_kms_key.db.arn
  
  publicly_accessible = false
  skip_final_snapshot = var.environment == "staging"
  
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"
  
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  copy_tags_to_snapshot = true
  
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id       = aws_kms_key.db.arn

  tags = {
    Name = "${var.environment}-zenthea-db"
  }
}

# Output DB endpoint
output "db_endpoint" {
  description = "Endpoint of the RDS instance"
  value       = aws_db_instance.zenthea.endpoint
}

output "db_port" {
  description = "Port of the RDS instance"
  value       = aws_db_instance.zenthea.port
}
