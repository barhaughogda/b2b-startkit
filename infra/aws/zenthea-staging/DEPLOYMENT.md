# Zenthea AWS Deployment Guide

Complete step-by-step guide for deploying Zenthea to AWS staging environment.

## Prerequisites Checklist

- [ ] AWS account with admin access
- [ ] Domain name configured (e.g., `staging.zenthea.ai`)
- [ ] ACM certificate requested and validated
- [ ] Terraform >= 1.5.0 installed
- [ ] AWS CLI configured (`aws configure`)
- [ ] Docker installed and running
- [ ] S3 buckets created (or will create via Terraform)

## Phase 1: Infrastructure Setup

### Step 1: Request ACM Certificate

```bash
# Request certificate for staging domain
aws acm request-certificate \
  --domain-name staging.zenthea.ai \
  --subject-alternative-names "*.staging.zenthea.ai" \
  --validation-method DNS \
  --region us-east-1

# Note the CertificateArn from output
# Complete DNS validation in ACM console before proceeding
```

### Step 2: Create S3 Buckets (if not exist)

```bash
# Create image bucket
aws s3 mb s3://zenthea-images-staging --region us-east-1

# Create medical images bucket
aws s3 mb s3://zenthea-medical-images-staging --region us-east-1

# Enable versioning and encryption
for bucket in zenthea-images-staging zenthea-medical-images-staging; do
  aws s3api put-bucket-versioning \
    --bucket $bucket \
    --versioning-configuration Status=Enabled \
    --region us-east-1
  
  aws s3api put-bucket-encryption \
    --bucket $bucket \
    --server-side-encryption-configuration '{
      "Rules": [{
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }]
    }' \
    --region us-east-1
done
```

### Step 3: Configure Terraform Variables

```bash
cd infra/aws/zenthea-staging/terraform
cp staging.tfvars.example staging.tfvars

# Edit staging.tfvars with your values:
# - domain_name: staging.zenthea.ai
# - acm_certificate_arn: <from Step 1>
# - s3_bucket_name: zenthea-images-staging
# - s3_medical_bucket_name: zenthea-medical-images-staging
```

### Step 4: Initialize and Apply Terraform

```bash
terraform init
terraform plan -var-file=staging.tfvars
terraform apply -var-file=staging.tfvars
```

**Expected outputs:**
- `alb_dns_name`: Use for DNS configuration
- `ecr_repository_url`: Use for pushing Docker images
- `ecs_cluster_name`: Use for ECS commands

## Phase 2: Secrets Configuration

### Step 5: Create Secrets in Secrets Manager

Create a script to set up all required secrets:

```bash
#!/bin/bash
# save as: setup-secrets.sh

ENV="staging"
REGION="us-east-1"
SECRET_PREFIX="${ENV}/zenthea"

# Function to create or update secret
create_secret() {
  local name=$1
  local value=$2
  
  aws secretsmanager describe-secret \
    --secret-id "${SECRET_PREFIX}/${name}" \
    --region $REGION > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "Updating secret: ${SECRET_PREFIX}/${name}"
    aws secretsmanager update-secret \
      --secret-id "${SECRET_PREFIX}/${name}" \
      --secret-string "$value" \
      --region $REGION
  else
    echo "Creating secret: ${SECRET_PREFIX}/${name}"
    aws secretsmanager create-secret \
      --name "${SECRET_PREFIX}/${name}" \
      --secret-string "$value" \
      --region $REGION
  fi
}

# Required secrets (fill in actual values)
create_secret "DATABASE_URL" "postgresql://user:password@host:port/database"
create_secret "CLERK_SECRET_KEY" "sk_test_xxxxx"
create_secret "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" "pk_test_xxxxx"
create_secret "CLERK_WEBHOOK_SECRET" "whsec_xxxxx"
create_secret "STRIPE_SECRET_KEY" "sk_test_xxxxx"
create_secret "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "pk_test_xxxxx"
create_secret "STRIPE_WEBHOOK_SECRET" "whsec_xxxxx"

echo "Secrets configured successfully!"
```

**Run the script:**
```bash
chmod +x setup-secrets.sh
./setup-secrets.sh
```

**Or manually create each secret:**
```bash
aws secretsmanager create-secret \
  --name staging/zenthea/DATABASE_URL \
  --secret-string "postgresql://zenthea:password@zenthea-db.xxxxx.us-east-1.rds.amazonaws.com:5432/zenthea" \
  --region us-east-1
```

## Phase 3: Application Deployment

### Step 6: Build Docker Image

```bash
# From repo root
cd infra/aws/zenthea-staging

# Get ECR repository URL
ECR_REPO=$(terraform -chdir=terraform output -raw ecr_repository_url)
ECR_REGISTRY=$(echo $ECR_REPO | cut -d'/' -f1)

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_REGISTRY

# Build image (from repo root, 3 levels up)
docker build -f Dockerfile -t zenthea:latest ../../..

# Tag and push
docker tag zenthea:latest ${ECR_REPO}:latest
docker push ${ECR_REPO}:latest
```

### Step 7: Update ECS Service

```bash
CLUSTER_NAME=$(terraform -chdir=terraform output -raw ecs_cluster_name)
SERVICE_NAME=$(terraform -chdir=terraform output -raw ecs_service_name)

# Force new deployment with latest image
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force-new-deployment \
  --region us-east-1
```

### Step 8: Verify Deployment

```bash
# Check service status
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region us-east-1

# Check running tasks
aws ecs list-tasks \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --region us-east-1

# View logs
aws logs tail /ecs/staging-zenthea --follow --region us-east-1
```

## Phase 4: DNS Configuration

### Step 9: Configure DNS (Route 53)

```bash
# Get ALB DNS name
ALB_DNS=$(terraform -chdir=terraform output -raw alb_dns_name)

# Get ALB hosted zone ID (always Z35SXDOTRQ7X7K for us-east-1 ALBs)
ALB_ZONE_ID="Z35SXDOTRQ7X7K"

# Create A record (replace HOSTED_ZONE_ID with your Route 53 hosted zone ID)
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "staging.zenthea.ai",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "'${ALB_ZONE_ID}'",
          "DNSName": "'${ALB_DNS}'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

**Or configure manually in Route 53 Console:**
1. Go to Route 53 → Hosted Zones
2. Select your domain
3. Create Record:
   - Name: `staging`
   - Type: `A - Routes traffic to an IPv4 address and some AWS resources`
   - Alias: Yes
   - Route traffic to: `Alias to Application and Classic Load Balancer`
   - Region: `us-east-1`
   - Load balancer: Select your ALB
   - Evaluate target health: Yes
   - Create record

### Step 10: Test Deployment

```bash
# Wait for DNS propagation (5-10 minutes)
# Then test the endpoint
curl https://staging.zenthea.ai/api/health

# Should return: {"status":"ok"} or similar
```

## Phase 5: Post-Deployment

### Step 11: Configure Health Check Endpoint

Ensure your Next.js app has a health check endpoint:

```typescript
// apps/zenthea/src/app/api/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
}
```

### Step 12: Set Up Monitoring

1. **CloudWatch Alarms** (optional):
   - High CPU utilization
   - High memory utilization
   - Unhealthy task count
   - ALB 5xx errors

2. **CloudWatch Dashboard** (optional):
   - ECS service metrics
   - ALB request metrics
   - Error rates

### Step 13: Configure CI/CD (Future)

Set up GitHub Actions or similar to:
- Build Docker image on push
- Push to ECR
- Update ECS service

## Troubleshooting

### ECS Tasks Failing to Start

```bash
# Check task status
aws ecs describe-tasks \
  --cluster staging-zenthea-cluster \
  --tasks TASK_ID \
  --region us-east-1

# Common issues:
# - Missing secrets in Secrets Manager
# - Incorrect IAM permissions
# - Image pull errors
# - Health check failures
```

### Health Check Failures

```bash
# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn TARGET_GROUP_ARN \
  --region us-east-1

# Ensure /api/health endpoint exists and returns 200
```

### Logs Not Appearing

```bash
# Verify log group exists
aws logs describe-log-groups \
  --log-group-name-prefix /ecs/staging-zenthea \
  --region us-east-1

# Check ECS task execution role has CloudWatch permissions
```

## Rollback Procedure

If deployment fails:

1. **Rollback ECS Service:**
   ```bash
   # Revert to previous task definition
   aws ecs update-service \
     --cluster staging-zenthea-cluster \
     --service staging-zenthea-service \
     --task-definition PREVIOUS_TASK_DEF_ARN \
     --region us-east-1
   ```

2. **DNS Rollback:**
   - Point DNS back to `legacy.zenthea.ai` (old Vercel deployment)
   - Or remove the A record temporarily

## Cleanup

To destroy all resources:

```bash
cd terraform
terraform destroy -var-file=staging.tfvars
```

⚠️ **Warning**: This will delete all infrastructure. Ensure you have backups!

## Next Steps

After successful deployment:
1. Complete T06: DNS control + rollback hostnames
2. Set up production environment (copy staging config)
3. Configure automated deployments
4. Set up monitoring and alerting
