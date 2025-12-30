#!/bin/bash
# Automated Setup Script for Zenthea AWS Staging
# This script automates as much as possible, with browser assistance for DNS validation
#
# Usage:
#   ./automated-setup.sh staging.zenthea.ai
#
# Prerequisites:
#   - AWS CLI configured
#   - Terraform installed
#   - Docker installed and running
#   - Domain DNS access (for validation)

set -e

DOMAIN="${1:-staging.zenthea.ai}"
ENV="staging"
REGION="us-east-1"
BASE_NAME=$(echo $DOMAIN | cut -d'.' -f1)  # staging

echo "🚀 Zenthea AWS Staging Automated Setup"
echo "======================================"
echo "Domain: $DOMAIN"
echo "Environment: $ENV"
echo "Region: $REGION"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Request ACM Certificate
echo -e "${GREEN}Step 1: Requesting ACM Certificate...${NC}"
CERT_ARN=$(aws acm request-certificate \
  --domain-name "$DOMAIN" \
  --validation-method DNS \
  --region "$REGION" \
  --query 'CertificateArn' \
  --output text)

echo "✅ Certificate requested: $CERT_ARN"
echo ""
echo -e "${YELLOW}⚠️  ACTION REQUIRED:${NC}"
echo "1. Open AWS Console: https://console.aws.amazon.com/acm/home?region=$REGION"
echo "2. Click on certificate: $CERT_ARN"
echo "3. Copy the DNS validation CNAME record"
echo "4. Add it to your DNS provider"
echo ""
read -p "Press Enter after you've added the DNS validation record and the certificate shows 'Issued' status..."

# Wait for certificate validation
echo "⏳ Waiting for certificate validation..."
while true; do
  STATUS=$(aws acm describe-certificate \
    --certificate-arn "$CERT_ARN" \
    --region "$REGION" \
    --query 'Certificate.Status' \
    --output text)
  
  if [ "$STATUS" == "ISSUED" ]; then
    echo "✅ Certificate validated!"
    break
  elif [ "$STATUS" == "FAILED" ]; then
    echo -e "${RED}❌ Certificate validation failed. Please check DNS records.${NC}"
    exit 1
  else
    echo "   Status: $STATUS (waiting...)"
    sleep 10
  fi
done

# Step 2: Create S3 Buckets
echo ""
echo -e "${GREEN}Step 2: Creating S3 Buckets...${NC}"

BUCKET_IMAGES="${BASE_NAME}-zenthea-images-${ENV}"
BUCKET_MEDICAL="${BASE_NAME}-zenthea-medical-images-${ENV}"

# Create buckets if they don't exist
for BUCKET in "$BUCKET_IMAGES" "$BUCKET_MEDICAL"; do
  if aws s3 ls "s3://$BUCKET" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "Creating bucket: $BUCKET"
    aws s3 mb "s3://$BUCKET" --region "$REGION"
    
    # Enable versioning
    aws s3api put-bucket-versioning \
      --bucket "$BUCKET" \
      --versioning-configuration Status=Enabled \
      --region "$REGION"
    
    # Enable encryption
    aws s3api put-bucket-encryption \
      --bucket "$BUCKET" \
      --server-side-encryption-configuration '{
        "Rules": [{
          "ApplyServerSideEncryptionByDefault": {
            "SSEAlgorithm": "AES256"
          }
        }]
      }' \
      --region "$REGION"
    
    echo "✅ Created and configured: $BUCKET"
  else
    echo "✅ Bucket already exists: $BUCKET"
  fi
done

# Step 3: Configure Terraform
echo ""
echo -e "${GREEN}Step 3: Configuring Terraform...${NC}"

cd "$(dirname "$0")/../terraform"

# Create staging.tfvars if it doesn't exist
if [ ! -f "staging.tfvars" ]; then
  cp staging.tfvars.example staging.tfvars
  
  # Update with actual values
  sed -i.bak "s|domain_name.*|domain_name = \"$DOMAIN\"|" staging.tfvars
  sed -i.bak "s|acm_certificate_arn.*|acm_certificate_arn = \"$CERT_ARN\"|" staging.tfvars
  sed -i.bak "s|s3_bucket_name.*|s3_bucket_name = \"$BUCKET_IMAGES\"|" staging.tfvars
  sed -i.bak "s|s3_medical_bucket_name.*|s3_medical_bucket_name = \"$BUCKET_MEDICAL\"|" staging.tfvars
  
  rm staging.tfvars.bak 2>/dev/null || true
  echo "✅ Created staging.tfvars with your values"
else
  echo "⚠️  staging.tfvars already exists. Please verify it has correct values:"
  echo "   - domain_name: $DOMAIN"
  echo "   - acm_certificate_arn: $CERT_ARN"
  echo "   - s3_bucket_name: $BUCKET_IMAGES"
  echo "   - s3_medical_bucket_name: $BUCKET_MEDICAL"
  read -p "Press Enter to continue..."
fi

# Step 4: Deploy Infrastructure
echo ""
echo -e "${GREEN}Step 4: Deploying Infrastructure with Terraform...${NC}"

terraform init
echo ""
echo "📋 Terraform will create:"
terraform plan -var-file=staging.tfvars | head -50
echo ""
read -p "Review the plan above. Press Enter to apply (or Ctrl+C to cancel)..."

terraform apply -var-file=staging.tfvars -auto-approve

# Get outputs
ALB_DNS=$(terraform output -raw alb_dns_name)
ECR_REPO=$(terraform output -raw ecr_repository_url)
CLUSTER=$(terraform output -raw ecs_cluster_name)
SERVICE=$(terraform output -raw ecs_service_name)

echo ""
echo "✅ Infrastructure deployed!"
echo "   ALB DNS: $ALB_DNS"
echo "   ECR Repo: $ECR_REPO"
echo "   Cluster: $CLUSTER"
echo "   Service: $SERVICE"

# Step 5: Set up secrets (interactive)
echo ""
echo -e "${GREEN}Step 5: Setting Up Secrets...${NC}"
echo ""
echo "You'll need to provide secrets. Run this command:"
echo "  cd ../scripts && ./setup-secrets.sh $ENV"
echo ""
read -p "Press Enter after secrets are configured..."

# Verify secrets exist
SECRET_COUNT=$(aws secretsmanager list-secrets \
  --filters Key=name,Values="$ENV/zenthea" \
  --region "$REGION" \
  --query 'length(SecretList)' \
  --output text)

if [ "$SECRET_COUNT" -lt 7 ]; then
  echo -e "${YELLOW}⚠️  Warning: Only $SECRET_COUNT secrets found. Expected 7.${NC}"
  echo "Required secrets:"
  echo "  - $ENV/zenthea/DATABASE_URL"
  echo "  - $ENV/zenthea/CLERK_SECRET_KEY"
  echo "  - $ENV/zenthea/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  echo "  - $ENV/zenthea/CLERK_WEBHOOK_SECRET"
  echo "  - $ENV/zenthea/STRIPE_SECRET_KEY"
  echo "  - $ENV/zenthea/NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  echo "  - $ENV/zenthea/STRIPE_WEBHOOK_SECRET"
fi

# Step 6: Build and push Docker image
echo ""
echo -e "${GREEN}Step 6: Building and Pushing Docker Image...${NC}"

# Get ECR registry
ECR_REGISTRY=$(echo $ECR_REPO | cut -d'/' -f1)

# Login to ECR
echo "Logging into ECR..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$ECR_REGISTRY"

# Build image (from repo root)
REPO_ROOT="$(cd ../../.. && pwd)"
echo "Building Docker image from: $REPO_ROOT"
cd "$REPO_ROOT"

docker build -f infra/aws/zenthea-staging/Dockerfile -t zenthea:latest .

# Tag and push
echo "Tagging and pushing image..."
docker tag zenthea:latest "${ECR_REPO}:latest"
docker push "${ECR_REPO}:latest"

echo "✅ Image pushed to ECR"

# Update ECS service
echo "Updating ECS service..."
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --force-new-deployment \
  --region "$REGION" > /dev/null

echo "✅ ECS service updated. Waiting for deployment..."

# Wait for service to stabilize
echo "⏳ Waiting for tasks to start..."
sleep 30

# Check service status
for i in {1..12}; do
  RUNNING=$(aws ecs describe-services \
    --cluster "$CLUSTER" \
    --services "$SERVICE" \
    --region "$REGION" \
    --query 'services[0].runningCount' \
    --output text)
  
  DESIRED=$(aws ecs describe-services \
    --cluster "$CLUSTER" \
    --services "$SERVICE" \
    --region "$REGION" \
    --query 'services[0].desiredCount' \
    --output text)
  
  if [ "$RUNNING" == "$DESIRED" ] && [ "$RUNNING" -gt 0 ]; then
    echo "✅ All tasks running ($RUNNING/$DESIRED)"
    break
  fi
  
  echo "   Tasks: $RUNNING/$DESIRED (waiting...)"
  sleep 10
done

# Step 7: DNS Configuration
echo ""
echo -e "${GREEN}Step 7: DNS Configuration${NC}"
echo ""
echo -e "${YELLOW}⚠️  ACTION REQUIRED:${NC}"
echo "Configure DNS to point $DOMAIN to the ALB:"
echo ""
echo "ALB DNS Name: $ALB_DNS"
echo ""
echo "For Route 53:"
echo "  1. Go to: https://console.aws.amazon.com/route53"
echo "  2. Select your hosted zone for zenthea.ai"
echo "  3. Create A record (Alias) pointing to: $ALB_DNS"
echo ""
echo "For other DNS providers:"
echo "  Create CNAME record: $DOMAIN → $ALB_DNS"
echo ""
read -p "Press Enter after DNS is configured..."

# Wait for DNS propagation
echo "⏳ Waiting for DNS propagation (this may take 5-30 minutes)..."
for i in {1..30}; do
  if dig +short "$DOMAIN" | grep -q "elb.amazonaws.com"; then
    echo "✅ DNS is resolving!"
    break
  fi
  echo "   Attempt $i/30 (waiting...)"
  sleep 10
done

# Test health endpoint
echo ""
echo "Testing health endpoint..."
sleep 5
if curl -sf "https://$DOMAIN/api/health" > /dev/null; then
  echo "✅ Health check passed!"
  curl "https://$DOMAIN/api/health"
else
  echo -e "${YELLOW}⚠️  Health check failed. This might be normal if DNS is still propagating.${NC}"
  echo "Try again in a few minutes: curl https://$DOMAIN/api/health"
fi

echo ""
echo -e "${GREEN}======================================"
echo "✅ Setup Complete!"
echo "======================================${NC}"
echo ""
echo "Your application should be available at:"
echo "  https://$DOMAIN"
echo ""
echo "Useful commands:"
echo "  View logs: aws logs tail /ecs/$ENV-zenthea --follow --region $REGION"
echo "  Check service: aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION"
echo "  Health check: curl https://$DOMAIN/api/health"
echo ""
