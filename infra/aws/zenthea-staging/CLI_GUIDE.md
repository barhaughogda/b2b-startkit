# CLI-Only Setup Guide

This guide uses **only CLI commands** - no browser needed (except for DNS validation which requires your DNS provider).

## Prerequisites

```bash
# Verify tools
aws --version
terraform version
docker --version

# Verify AWS access
aws sts get-caller-identity
```

## Step 1: Request ACM Certificate

```bash
# Request certificate
CERT_ARN=$(aws acm request-certificate \
  --domain-name staging.zenthea.ai \
  --validation-method DNS \
  --region us-east-1 \
  --query 'CertificateArn' \
  --output text)

echo "Certificate ARN: $CERT_ARN"

# Get DNS validation record
aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output json
```

**Add the DNS validation record to your DNS provider, then wait:**

```bash
# Check status (run every few minutes)
aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text

# When it shows "ISSUED", continue
```

## Step 2: Create S3 Buckets

```bash
# Create buckets
aws s3 mb s3://zenthea-images-staging --region us-east-1
aws s3 mb s3://zenthea-medical-images-staging --region us-east-1

# Enable versioning
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

## Step 3: Configure Terraform

```bash
cd infra/aws/zenthea-staging/terraform

# Create config file
cat > staging.tfvars <<EOF
aws_region  = "us-east-1"
environment = "staging"
domain_name = "staging.zenthea.ai"
acm_certificate_arn = "$CERT_ARN"
task_cpu = 1024
task_memory = 2048
desired_task_count = 2
s3_bucket_name = "zenthea-images-staging"
s3_medical_bucket_name = "zenthea-medical-images-staging"
log_retention_days = 30
EOF
```

## Step 4: Deploy Infrastructure

```bash
# Initialize
terraform init

# Review plan
terraform plan -var-file=staging.tfvars

# Apply (takes 10-15 minutes)
terraform apply -var-file=staging.tfvars -auto-approve

# Save outputs
ALB_DNS=$(terraform output -raw alb_dns_name)
ECR_REPO=$(terraform output -raw ecr_repository_url)
CLUSTER=$(terraform output -raw ecs_cluster_name)
SERVICE=$(terraform output -raw ecs_service_name)

echo "ALB DNS: $ALB_DNS"
echo "ECR Repo: $ECR_REPO"
```

## Step 5: Set Up Secrets

```bash
cd ../scripts
./setup-secrets.sh staging

# Or create manually:
aws secretsmanager create-secret \
  --name staging/zenthea/DATABASE_URL \
  --secret-string "postgresql://user:password@host:port/database" \
  --region us-east-1

# Repeat for all 7 secrets (see BEGINNER_GUIDE.md for list)
```

## Step 6: Build and Push Docker Image

```bash
# Get ECR registry
ECR_REGISTRY=$(echo $ECR_REPO | cut -d'/' -f1)

# Login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_REGISTRY

# Build (from repo root)
cd ../../../
docker build -f infra/aws/zenthea-staging/Dockerfile -t zenthea:latest .

# Tag and push
docker tag zenthea:latest ${ECR_REPO}:latest
docker push ${ECR_REPO}:latest

# Update ECS service
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --force-new-deployment \
  --region us-east-1
```

## Step 7: Configure DNS

**For Route 53:**

```bash
# Get hosted zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='zenthea.ai.'].Id" \
  --output text | cut -d'/' -f3)

# Create DNS record
aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"UPSERT\",
      \"ResourceRecordSet\": {
        \"Name\": \"staging.zenthea.ai\",
        \"Type\": \"A\",
        \"AliasTarget\": {
          \"HostedZoneId\": \"Z35SXDOTRQ7X7K\",
          \"DNSName\": \"$ALB_DNS\",
          \"EvaluateTargetHealth\": true
        }
      }
    }]
  }"
```

**For other DNS providers:** Add CNAME record manually in their console.

## Step 8: Verify

```bash
# Wait for DNS propagation (check every minute)
for i in {1..30}; do
  if dig +short staging.zenthea.ai | grep -q "elb.amazonaws.com"; then
    echo "✅ DNS resolving!"
    break
  fi
  echo "Attempt $i/30..."
  sleep 10
done

# Test health endpoint
curl https://staging.zenthea.ai/api/health

# View logs
aws logs tail /ecs/staging-zenthea --follow --region us-east-1
```

## One-Line Automated Setup

Or use the automated script:

```bash
cd infra/aws/zenthea-staging/scripts
./automated-setup.sh staging.zenthea.ai
```

This does everything automatically, pausing only for:
- DNS validation (add record to your DNS provider)
- Secrets setup (interactive prompts)
