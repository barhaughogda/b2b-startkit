# Zenthea AWS Staging Infrastructure

This directory contains Terraform infrastructure-as-code for deploying Zenthea to AWS ECS Fargate with an Application Load Balancer.

## 📚 Documentation

- **🤖 Automated Setup**: [`scripts/automated-setup.sh`](./scripts/automated-setup.sh) - **Run this to automate everything!**
- **👶 Beginner's Guide**: [`BEGINNER_GUIDE.md`](./BEGINNER_GUIDE.md) - **Start here if you're new to AWS!**
- **⌨️ CLI-Only Guide**: [`CLI_GUIDE.md`](./CLI_GUIDE.md) - All CLI commands, no browser needed
- **🚀 Quick Start**: [`QUICKSTART.md`](./QUICKSTART.md) - Fast reference for experienced users
- **📋 Quick Reference**: [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md) - Command cheat sheet
- **📖 Detailed Guide**: [`DEPLOYMENT.md`](./DEPLOYMENT.md) - Complete deployment documentation

## Architecture

- **VPC**: Custom VPC with public and private subnets across multiple AZs
- **ECS Fargate**: Containerized Next.js application
- **ALB**: Application Load Balancer with HTTPS termination
- **ECR**: Docker image repository
- **CloudWatch**: Logging and monitoring
- **Secrets Manager**: Environment variables and secrets
- **S3**: ALB access logs storage

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform** >= 1.5.0 installed
3. **AWS CLI** configured with credentials
4. **Docker** for building images
5. **ACM Certificate** in `us-east-1` for your domain
6. **S3 Buckets** already created (or create them separately)

## 🎯 Getting Started

**New to AWS?** → Read [`BEGINNER_GUIDE.md`](./BEGINNER_GUIDE.md) first!

**Experienced?** → Jump to [`QUICKSTART.md`](./QUICKSTART.md) or [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md)

## Setup Steps

### 1. Configure Variables

Copy the example tfvars file and fill in your values:

```bash
cd terraform
cp staging.tfvars.example staging.tfvars
# Edit staging.tfvars with your actual values
```

**Required values:**
- `domain_name`: e.g., `staging.zenthea.ai`
- `acm_certificate_arn`: ACM certificate ARN (must be in us-east-1)
- `s3_bucket_name`: Existing S3 bucket for images
- `s3_medical_bucket_name`: Existing S3 bucket for medical images

### 2. Request ACM Certificate (if not done)

```bash
# Request certificate via AWS Console or CLI
aws acm request-certificate \
  --domain-name staging.zenthea.ai \
  --validation-method DNS \
  --region us-east-1

# Note the ARN and add it to staging.tfvars
# Complete DNS validation before proceeding
```

### 3. Initialize Terraform

```bash
cd terraform
terraform init
```

### 4. Plan Infrastructure

```bash
terraform plan -var-file=staging.tfvars
```

Review the plan carefully. This will create:
- VPC with public/private subnets
- ECS cluster and service
- ECR repository
- ALB with HTTPS listener
- IAM roles and policies
- CloudWatch log groups
- Security groups

### 5. Apply Infrastructure

```bash
terraform apply -var-file=staging.tfvars
```

This will take 10-15 minutes. Note the outputs:
- `alb_dns_name`: ALB DNS name (use for DNS configuration)
- `ecr_repository_url`: ECR repository URL (for pushing images)

### 6. Configure Secrets Manager

Create secrets in AWS Secrets Manager (one secret per environment variable):

```bash
# Example: Create DATABASE_URL secret
aws secretsmanager create-secret \
  --name staging/zenthea/DATABASE_URL \
  --secret-string "postgresql://user:password@host:port/database" \
  --region us-east-1

# Required secrets (see apps/zenthea/env.template for full list):
# - staging/zenthea/DATABASE_URL
# - staging/zenthea/CLERK_SECRET_KEY
# - staging/zenthea/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# - staging/zenthea/CLERK_WEBHOOK_SECRET
# - staging/zenthea/STRIPE_SECRET_KEY
# - staging/zenthea/NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# - staging/zenthea/STRIPE_WEBHOOK_SECRET
```

See `DEPLOYMENT.md` for a complete secrets setup script.

### 7. Build and Push Docker Image

```bash
# From repo root
cd infra/aws/zenthea-staging

# Get ECR login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(terraform -chdir=terraform output -raw ecr_repository_url | cut -d'/' -f1)

# Build image
docker build -f Dockerfile -t zenthea:latest ../../..

# Tag image
ECR_REPO=$(terraform -chdir=terraform output -raw ecr_repository_url)
docker tag zenthea:latest ${ECR_REPO}:latest

# Push image
docker push ${ECR_REPO}:latest
```

### 8. Update ECS Service

After pushing a new image, update the ECS service to use the new image:

```bash
# Force new deployment
aws ecs update-service \
  --cluster staging-zenthea-cluster \
  --service staging-zenthea-service \
  --force-new-deployment \
  --region us-east-1
```

### 9. Configure DNS

Point your domain to the ALB:

```bash
# Get ALB DNS name
ALB_DNS=$(terraform -chdir=terraform output -raw alb_dns_name)

# Create Route 53 record (or configure in your DNS provider)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "staging.zenthea.ai",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "'${ALB_DNS}'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

Or configure manually:
- Type: A (Alias)
- Alias: Yes
- Alias Target: ALB (select your ALB)
- Evaluate Target Health: Yes

## Health Checks

The ECS service includes health checks:
- **ALB Health Check**: `/api/health` endpoint (must return 200)
- **Container Health Check**: HTTP check on port 3000

Ensure your Next.js app has a `/api/health` route that returns 200 OK.

## Monitoring

### CloudWatch Logs

View application logs:

```bash
aws logs tail /ecs/staging-zenthea --follow --region us-east-1
```

### ECS Service Metrics

Monitor in CloudWatch:
- CPU/Memory utilization
- Task count
- Request count (ALB metrics)

## Updating Infrastructure

After making changes to Terraform files:

```bash
terraform plan -var-file=staging.tfvars
terraform apply -var-file=staging.tfvars
```

## Destroying Infrastructure

⚠️ **Warning**: This will delete all resources!

```bash
terraform destroy -var-file=staging.tfvars
```

## Troubleshooting

### ECS Tasks Not Starting

1. Check CloudWatch logs: `/ecs/staging-zenthea`
2. Verify secrets exist in Secrets Manager
3. Check ECS task definition for correct image tag
4. Verify security groups allow traffic

### ALB Health Checks Failing

1. Ensure `/api/health` endpoint exists and returns 200
2. Check security groups allow ALB → ECS traffic
3. Verify ECS tasks are running and healthy

### Image Pull Errors

1. Verify ECR repository exists
2. Check IAM role has ECR pull permissions
3. Ensure image tag matches task definition

## Security Notes

- All secrets stored in AWS Secrets Manager (encrypted)
- ECS tasks run in private subnets (no public IPs)
- ALB terminates TLS/HTTPS
- Security groups follow least-privilege principle
- CloudWatch logs retention configured (30 days default)

## Cost Optimization

- Use Fargate Spot for non-production (not configured by default)
- Adjust `desired_task_count` based on load
- Consider reserved capacity for production
- Monitor CloudWatch costs

## Next Steps

After infrastructure is deployed:
1. Configure DNS (T06)
2. Set up CI/CD pipeline for automated deployments
3. Configure monitoring alerts
4. Set up backup/restore procedures
