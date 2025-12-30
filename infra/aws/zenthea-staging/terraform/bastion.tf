# Small Bastion host for secure SSM tunneling to RDS
# HIPAA-compliant: No SSH keys, no open inbound ports

# AMI for Amazon Linux 2023 (latest stable)
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }
}

# IAM Role for SSM Access
resource "aws_iam_role" "bastion_ssm" {
  name = "${var.environment}-zenthea-bastion-ssm-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

# Attach SSM Managed Instance Core policy
resource "aws_iam_role_policy_attachment" "bastion_ssm" {
  role       = aws_iam_role.bastion_ssm.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Instance Profile for EC2
resource "aws_iam_instance_profile" "bastion" {
  name = "${var.environment}-zenthea-bastion-profile"
  role = aws_iam_role.bastion_ssm.name
}

# Bastion Security Group (No Inbound)
resource "aws_security_group" "bastion" {
  name        = "${var.environment}-zenthea-bastion-sg"
  description = "No inbound traffic, only outbound for SSM"
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-zenthea-bastion-sg"
  }
}

# Allow Bastion to connect to RDS
resource "aws_security_group_rule" "allow_bastion_to_db" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db.id # The RDS SG
  source_security_group_id = aws_security_group.bastion.id
  description              = "Allow Postgres from Bastion tunnel"
}

# EC2 Bastion Instance
resource "aws_instance" "bastion" {
  ami                  = data.aws_ami.amazon_linux_2023.id
  instance_type        = "t3.nano"
  subnet_id            = module.vpc.public_subnet_ids[0] # Public subnet for SSM communication
  iam_instance_profile = aws_iam_instance_profile.bastion.name
  vpc_security_group_ids = [aws_security_group.bastion.id]

  metadata_options {
    http_tokens = "required" # Enforce IMDSv2
  }

  root_block_device {
    encrypted = true
  }

  tags = {
    Name = "${var.environment}-zenthea-bastion"
  }
}

output "bastion_instance_id" {
  description = "Instance ID of the Bastion host"
  value       = aws_instance.bastion.id
}
