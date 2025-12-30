# Zenthea AWS Staging Setup - Complete Beginner's Guide

This guide walks you through every step of setting up Zenthea on AWS, even if you've never done this before.

## Table of Contents

1. [Prerequisites Check](#prerequisites-check)
2. [Step 1: Request ACM Certificate](#step-1-request-acm-certificate)
3. [Step 2: Configure Terraform Variables](#step-2-configure-terraform-variables)
4. [Step 3: Deploy Infrastructure with Terraform](#step-3-deploy-infrastructure-with-terraform)
5. [Step 4: Set Up Secrets](#step-4-set-up-secrets)
6. [Step 5: Build and Push Docker Image](#step-5-build-and-push-docker-image)
7. [Step 6: Configure DNS](#step-6-configure-dns)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start Options

**Want to automate everything?** Use the automated setup script:
```bash
cd infra/aws/zenthea-staging/scripts
./automated-setup.sh staging.zenthea.ai
```

This script will:
- ✅ Request ACM certificate automatically
- ✅ Create S3 buckets
- ✅ Configure Terraform
- ✅ Deploy infrastructure
- ✅ Build and push Docker image
- ⚠️ Pause for DNS validation and secrets setup (needs your input)

**Or follow the manual guide below for step-by-step control.**

---

## Prerequisites Check

Before starting, verify you have everything installed:

### 1. Check AWS CLI

```bash
aws --version
```

**If not installed:**
- macOS: `brew install awscli`
- Linux: Follow [AWS CLI installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- Windows: Download installer from AWS website

### 2. Configure AWS Credentials

```bash
aws configure
```

You'll be prompted for:
- **AWS Access Key ID**: Get this from AWS Console → IAM → Users → Your User → Security Credentials → Create Access Key
- **AWS Secret Access Key**: Shown only once when creating access key (save it!)
- **Default region**: Enter `us-east-1`
- **Default output format**: Enter `json`

**Verify it works:**
```bash
aws sts get-caller-identity
```

You should see your AWS account ID and user ARN.

### 3. Check Terraform

```bash
terraform version
```

**If not installed:**
- macOS: `brew install terraform`
- Linux/Windows: Download from [terraform.io/downloads](https://www.terraform.io/downloads)

### 4. Check Docker

```bash
docker --version
docker ps
```

**If not installed:**
- macOS: Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Linux: `sudo apt-get install docker.io` (Ubuntu) or equivalent
- Windows: Install Docker Desktop

### 5. Domain Access

You need access to DNS settings for `zenthea.ai`. This is typically:
- Route 53 (if using AWS)
- Your domain registrar's DNS panel
- A DNS provider like Cloudflare, Namecheap, etc.

---

## Step 1: Request ACM Certificate

**What this does:** Creates an SSL/TLS certificate so your site can use HTTPS (required for HIPAA compliance).

### Option A: Using AWS CLI (Recommended - Faster!)

```bash
# Request certificate
aws acm request-certificate \
  --domain-name staging.zenthea.ai \
  --validation-method DNS \
  --region us-east-1

# This will output the Certificate ARN - save it!
# Example: arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
```

**Then get DNS validation record:**
```bash
# Replace CERT_ARN with the ARN from above
CERT_ARN="arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"

# Get DNS validation record
aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output json
```

**Copy the Name and Value, then add to your DNS provider.**

**Wait for validation (or check status):**
```bash
# Check certificate status
aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text

# Should show: PENDING_VALIDATION → ISSUED
```

### Option B: Using AWS Console (Visual Alternative)

1. Go to [AWS Console](https://console.aws.amazon.com)
2. Make sure you're in **US East (N. Virginia) us-east-1** region (check top-right corner)
3. Search for "Certificate Manager" or go to: https://console.aws.amazon.com/acm/home?region=us-east-1
4. Click **"Request a certificate"** → **"Request a public certificate"**
5. **Domain name**: Enter `staging.zenthea.ai`
6. **Validation method**: Select **"DNS validation"**
7. Click **"Request"**
8. Copy the **ARN** and DNS validation record
9. Add DNS validation record to your DNS provider
10. Wait for status to change to **"Issued"** (5-30 minutes)

### 1.6: Save Certificate ARN

**Save the Certificate ARN** - you'll need it in Step 2!

**Example ARN:**
```
arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
```

**💡 Tip:** Use the automated setup script (`scripts/automated-setup.sh`) which handles this automatically!

---

## Step 2: Configure Terraform Variables

**What this does:** Tells Terraform what resources to create and how to configure them.

### 2.1: Navigate to Terraform Directory

```bash
cd infra/aws/zenthea-staging/terraform
```

### 2.2: Copy Example File

```bash
cp staging.tfvars.example staging.tfvars
```

### 2.3: Open staging.tfvars in Your Editor

```bash
# Using VS Code
code staging.tfvars

# Or using nano
nano staging.tfvars

# Or using vim
vim staging.tfvars
```

### 2.4: Fill In Required Values

Replace the placeholder values with your actual values:

```hcl
# Basic Configuration
aws_region  = "us-east-1"
environment = "staging"

# Domain Configuration
domain_name          = "staging.zenthea.ai"
acm_certificate_arn  = "arn:aws:acm:us-east-1:YOUR_ACCOUNT_ID:certificate/YOUR_CERT_ID"
# ↑ Paste the ARN you copied in Step 1.6

# ECS Task Configuration (can leave defaults for now)
task_cpu            = 1024  # 1 vCPU
task_memory         = 2048  # 2 GB
desired_task_count  = 2

# S3 Buckets
# If you already have buckets, use those names
# Otherwise, create them first (see below)
s3_bucket_name         = "zenthea-images-staging"
s3_medical_bucket_name = "zenthea-medical-images-staging"

# Logging
log_retention_days = 30
```

### 2.5: Create S3 Buckets (if they don't exist)

**Option A: Using AWS CLI (Recommended - Faster!)**

```bash
# Create image bucket
aws s3 mb s3://zenthea-images-staging --region us-east-1

# Create medical images bucket
aws s3 mb s3://zenthea-medical-images-staging --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket zenthea-images-staging \
  --versioning-configuration Status=Enabled \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket zenthea-medical-images-staging \
  --versioning-configuration Status=Enabled \
  --region us-east-1

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket zenthea-images-staging \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }' \
  --region us-east-1

aws s3api put-bucket-encryption \
  --bucket zenthea-medical-images-staging \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }' \
  --region us-east-1
```

**Option B: Using AWS Console (Visual Alternative)**

1. Go to [S3 Console](https://console.aws.amazon.com/s3)
2. Click **"Create bucket"**
3. **Bucket name**: `zenthea-images-staging`
4. **Region**: `us-east-1`
5. **Block Public Access**: Keep all checked (default)
6. **Bucket Versioning**: Enable
7. **Default encryption**: Enable (AES256)
8. Click **"Create bucket"**
9. Repeat for `zenthea-medical-images-staging`

### 2.6: Verify Your Configuration

Double-check that:
- ✅ `acm_certificate_arn` is correct (from Step 1.6)
- ✅ `domain_name` matches your certificate domain
- ✅ S3 bucket names match buckets you created
- ✅ `aws_region` is `us-east-1`

**Save the file** when done.

---

## Step 3: Deploy Infrastructure with Terraform

**What this does:** Creates all AWS resources (VPC, ECS cluster, ALB, etc.) needed to run your app.

### 3.1: Initialize Terraform

```bash
# Make sure you're in the terraform directory
cd infra/aws/zenthea-staging/terraform

# Initialize Terraform (downloads providers)
terraform init
```

**Expected output:**
```
Initializing the backend...
Initializing provider plugins...
Terraform has been successfully initialized!
```

### 3.2: Review What Will Be Created

```bash
terraform plan -var-file=staging.tfvars
```

This shows you **exactly** what resources will be created. Review it carefully.

**Look for:**
- ✅ Plan shows ~20-30 resources to be created
- ✅ No errors (red text)
- ✅ Resources look correct (VPC, ECS, ALB, etc.)

**If you see errors:**
- Check that `staging.tfvars` has all required values
- Verify ACM certificate ARN is correct
- Ensure S3 buckets exist

### 3.3: Apply Infrastructure

```bash
terraform apply -var-file=staging.tfvars
```

Terraform will:
1. Show you the plan again
2. Ask: **"Do you want to perform these actions?"**
3. Type **`yes`** and press Enter

**This takes 10-15 minutes.** Terraform will create:
- VPC and networking
- ECS cluster
- Application Load Balancer
- ECR repository
- IAM roles
- Security groups
- CloudWatch log groups

**Watch for:**
- ✅ Green "Apply complete!" message at the end
- ✅ Outputs showing ALB DNS name and ECR repository URL

### 3.4: Save Important Outputs

Terraform will show outputs like:

```
Outputs:

alb_dns_name = "staging-zenthea-alb-1234567890.us-east-1.elb.amazonaws.com"
ecr_repository_url = "123456789012.dkr.ecr.us-east-1.amazonaws.com/staging-zenthea"
ecs_cluster_name = "staging-zenthea-cluster"
ecs_service_name = "staging-zenthea-service"
```

**Save these values** - you'll need them later!

**Or get them anytime:**
```bash
terraform output alb_dns_name
terraform output ecr_repository_url
terraform output ecs_cluster_name
terraform output ecs_service_name
```

### 3.5: Verify Resources Created

**Check AWS Console:**

1. **ECS**: https://console.aws.amazon.com/ecs → Should see `staging-zenthea-cluster`
2. **ECR**: https://console.aws.amazon.com/ecr → Should see `staging-zenthea` repository
3. **Load Balancers**: https://console.aws.amazon.com/ec2/v2/home#LoadBalancers → Should see `staging-zenthea-alb`
4. **VPC**: https://console.aws.amazon.com/vpc → Should see `staging-zenthea-vpc`

---

## Step 4: Set Up Secrets

**What this does:** Stores sensitive configuration (database passwords, API keys) securely in AWS Secrets Manager.

### 4.1: Navigate to Scripts Directory

```bash
cd ../../scripts
# Or from repo root:
cd infra/aws/zenthea-staging/scripts
```

### 4.2: Run Secrets Setup Script

```bash
./setup-secrets.sh staging
```

The script will prompt you for each secret. Have these ready:

**Required Secrets:**

1. **DATABASE_URL**
   - Format: `postgresql://username:password@host:port/database`
   - Example: `postgresql://zenthea:mypassword@zenthea-db.xxxxx.us-east-1.rds.amazonaws.com:5432/zenthea`
   - ⚠️ **Note**: You'll need to create the RDS database first (T10) or use a temporary value for now

2. **CLERK_SECRET_KEY**
   - Get from: https://dashboard.clerk.com → Your App → API Keys
   - Format: `sk_test_xxxxx` or `sk_live_xxxxx`

3. **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY**
   - Get from: https://dashboard.clerk.com → Your App → API Keys
   - Format: `pk_test_xxxxx` or `pk_live_xxxxx`
   - ⚠️ This is public, safe to expose

4. **CLERK_WEBHOOK_SECRET**
   - Get from: https://dashboard.clerk.com → Your App → Webhooks → Create endpoint
   - Format: `whsec_xxxxx`

5. **STRIPE_SECRET_KEY**
   - Get from: https://dashboard.stripe.com → Developers → API keys
   - Format: `sk_test_xxxxx` or `sk_live_xxxxx`

6. **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**
   - Get from: https://dashboard.stripe.com → Developers → API keys
   - Format: `pk_test_xxxxx` or `pk_live_xxxxx`
   - ⚠️ This is public, safe to expose

7. **STRIPE_WEBHOOK_SECRET**
   - Get from: https://dashboard.stripe.com → Developers → Webhooks → Add endpoint
   - Format: `whsec_xxxxx`

### 4.3: Alternative: Create Secrets Manually

If the script doesn't work, create secrets manually:

```bash
# Example: Create DATABASE_URL secret
aws secretsmanager create-secret \
  --name staging/zenthea/DATABASE_URL \
  --secret-string "postgresql://user:password@host:port/database" \
  --region us-east-1

# Repeat for each secret, replacing:
# - staging/zenthea/DATABASE_URL with the secret name
# - "postgresql://..." with the actual secret value
```

**Required secret names:**
- `staging/zenthea/DATABASE_URL`
- `staging/zenthea/CLERK_SECRET_KEY`
- `staging/zenthea/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `staging/zenthea/CLERK_WEBHOOK_SECRET`
- `staging/zenthea/STRIPE_SECRET_KEY`
- `staging/zenthea/NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `staging/zenthea/STRIPE_WEBHOOK_SECRET`

### 4.4: Verify Secrets Created

```bash
# List all secrets
aws secretsmanager list-secrets \
  --filters Key=name,Values=staging/zenthea \
  --region us-east-1
```

You should see 7 secrets listed.

---

## Step 5: Build and Push Docker Image

**What this does:** Packages your Next.js app into a Docker image and uploads it to AWS ECR so ECS can run it.

### 5.1: Get ECR Repository URL

```bash
cd ../terraform
ECR_REPO=$(terraform output -raw ecr_repository_url)
echo $ECR_REPO
```

**Expected output:**
```
123456789012.dkr.ecr.us-east-1.amazonaws.com/staging-zenthea
```

### 5.2: Login to ECR

```bash
# Get ECR registry (first part of URL)
ECR_REGISTRY=$(echo $ECR_REPO | cut -d'/' -f1)
echo $ECR_REGISTRY

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_REGISTRY
```

**Expected output:**
```
Login Succeeded
```

### 5.3: Build Docker Image

```bash
# Navigate to repo root
cd ../../../../

# Build the image
docker build -f infra/aws/zenthea-staging/Dockerfile -t zenthea:latest .
```

**This takes 5-10 minutes** the first time (downloads dependencies).

**Watch for:**
- ✅ "Successfully built" message
- ✅ No errors (red text)

**If build fails:**
- Check that you're in the repo root directory
- Verify Docker is running (`docker ps`)
- Check that all dependencies are installed

### 5.4: Tag Image for ECR

```bash
# Get ECR repo URL again (if needed)
cd infra/aws/zenthea-staging/terraform
ECR_REPO=$(terraform output -raw ecr_repository_url)

# Tag the image
docker tag zenthea:latest ${ECR_REPO}:latest
```

### 5.5: Push Image to ECR

```bash
docker push ${ECR_REPO}:latest
```

**This takes 2-5 minutes** depending on image size.

**Watch for:**
- ✅ Progress bars showing upload
- ✅ "Pushed" message at the end

### 5.6: Verify Image in ECR

1. Go to [ECR Console](https://console.aws.amazon.com/ecr)
2. Click on `staging-zenthea` repository
3. You should see an image tagged `latest`

### 5.7: Update ECS Service

```bash
# Get cluster and service names
CLUSTER=$(terraform output -raw ecs_cluster_name)
SERVICE=$(terraform output -raw ecs_service_name)

# Force new deployment (pulls latest image)
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --force-new-deployment \
  --region us-east-1
```

**Expected output:**
```json
{
  "service": {
    "serviceName": "staging-zenthea-service",
    "status": "ACTIVE",
    ...
  }
}
```

### 5.8: Wait for Deployment

```bash
# Watch service status
aws ecs describe-services \
  --cluster $CLUSTER \
  --services $SERVICE \
  --region us-east-1 \
  --query 'services[0].deployments[0].{status:status,desiredCount:desiredCount,runningCount:runningCount}'
```

**Wait until:**
- ✅ `status` is `PRIMARY`
- ✅ `runningCount` equals `desiredCount` (usually 2)

**This takes 3-5 minutes.**

### 5.9: Check Logs

```bash
# View application logs
aws logs tail /ecs/staging-zenthea --follow --region us-east-1
```

**Look for:**
- ✅ No error messages
- ✅ Application starting successfully
- ✅ Database connection (if configured)

Press `Ctrl+C` to stop following logs.

---

## Step 6: Configure DNS

**What this does:** Points your domain (`staging.zenthea.ai`) to the AWS Load Balancer so users can access your app.

### 6.1: Get ALB DNS Name

```bash
cd infra/aws/zenthea-staging/terraform
ALB_DNS=$(terraform output -raw alb_dns_name)
echo $ALB_DNS
```

**Expected output:**
```
staging-zenthea-alb-1234567890.us-east-1.elb.amazonaws.com
```

### 6.2: Configure DNS (Route 53)

**Option A: Using AWS CLI (Recommended - Faster!)**

```bash
# Get your hosted zone ID (replace with your actual hosted zone ID)
HOSTED_ZONE_ID="Z1234567890ABC"  # Get from: aws route53 list-hosted-zones

# Get ALB hosted zone ID (always the same for us-east-1 ALBs)
ALB_ZONE_ID="Z35SXDOTRQ7X7K"

# Create DNS record
aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "staging.zenthea.ai",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "'$ALB_ZONE_ID'",
          "DNSName": "'$ALB_DNS'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

**To find your hosted zone ID:**
```bash
aws route53 list-hosted-zones --query "HostedZones[?Name=='zenthea.ai.'].Id" --output text
```

**Option B: Using AWS Console (Visual Alternative)**

1. Go to [Route 53 Console](https://console.aws.amazon.com/route53)
2. Click **"Hosted zones"**
3. Click on your domain (`zenthea.ai`)
4. Click **"Create record"**
5. Configure:
   - **Record name**: `staging`
   - **Record type**: `A - Routes traffic to an IPv4 address and some AWS resources`
   - **Alias**: ✅ **Enable** (toggle ON)
   - **Route traffic to**: Select **"Alias to Application and Classic Load Balancer"**
   - **Region**: `us-east-1`
   - **Choose load balancer**: Select `staging-zenthea-alb`
   - **Evaluate target health**: ✅ **Yes**
6. Click **"Create records"**

### 6.3: Configure DNS (Other Providers)

**If using Cloudflare, Namecheap, or another provider:**

1. Log into your DNS provider
2. Find DNS management for `zenthea.ai`
3. Add a new record:
   - **Type**: `CNAME` (or `A` if they support ALIAS)
   - **Name**: `staging`
   - **Value/Target**: `staging-zenthea-alb-1234567890.us-east-1.elb.amazonaws.com`
   - **TTL**: `300` (5 minutes) or `Auto`
4. Save

**Note:** Some providers don't support CNAME for root/apex domains. If you need `zenthea.ai` (not `staging.zenthea.ai`), you may need to use a DNS provider that supports ALIAS records or use Route 53.

### 6.4: Wait for DNS Propagation

DNS changes take **5-30 minutes** to propagate worldwide.

**Check propagation:**
```bash
# Check if DNS is resolving
dig staging.zenthea.ai +short

# Or using nslookup
nslookup staging.zenthea.ai

# Or using host
host staging.zenthea.ai
```

**Expected output:**
```
staging-zenthea-alb-1234567890.us-east-1.elb.amazonaws.com
```

### 6.5: Test Your Deployment

```bash
# Test health endpoint
curl https://staging.zenthea.ai/api/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"2025-01-XX...","environment":"staging"}
```

**Or open in browser:**
```
https://staging.zenthea.ai/api/health
```

### 6.6: Set Up Rollback Hostname (Optional but Recommended)

Create a DNS record pointing to your old Vercel deployment:

**Route 53:**
1. Create another A record:
   - **Record name**: `legacy`
   - **Type**: `CNAME` or `A`
   - **Value**: Your old Vercel deployment URL

**This allows quick rollback if needed.**

---

## Troubleshooting

### Terraform Errors

**Error: "Invalid certificate ARN"**
- Verify certificate is in `us-east-1` region
- Check ARN format is correct
- Ensure certificate status is "Issued"

**Error: "Bucket already exists"**
- Bucket names are globally unique
- Choose different bucket names in `staging.tfvars`

**Error: "Access Denied"**
- Check AWS credentials: `aws sts get-caller-identity`
- Verify IAM user has required permissions (EC2, ECS, VPC, IAM, etc.)

### Docker Build Errors

**Error: "Cannot connect to Docker daemon"**
- Start Docker Desktop
- Verify: `docker ps` works

**Error: "pnpm: command not found"**
- Dockerfile handles this automatically
- If issue persists, check Dockerfile is correct

### ECS Deployment Errors

**Tasks not starting:**
```bash
# Check task status
aws ecs describe-tasks \
  --cluster staging-zenthea-cluster \
  --tasks $(aws ecs list-tasks --cluster staging-zenthea-cluster --query 'taskArns[0]' --output text) \
  --region us-east-1
```

**Common issues:**
- Missing secrets in Secrets Manager
- Incorrect secret names/values
- Image pull errors (check ECR permissions)

### DNS Issues

**DNS not resolving:**
- Wait longer (up to 30 minutes)
- Check DNS record is correct
- Verify ALB is healthy in AWS Console

**SSL Certificate errors:**
- Verify ACM certificate is validated
- Check certificate ARN in Terraform matches
- Ensure domain matches certificate domain

### Health Check Failures

**ALB health checks failing:**
- Verify `/api/health` endpoint exists (✅ already created)
- Check ECS tasks are running
- View CloudWatch logs for errors

---

## Next Steps

After successful deployment:

1. ✅ **Test the application**: Visit `https://staging.zenthea.ai`
2. ✅ **Monitor logs**: Set up CloudWatch alarms
3. ✅ **Set up CI/CD**: Automate deployments
4. ✅ **Configure production**: Repeat for production environment

## Getting Help

- **Terraform docs**: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- **AWS ECS docs**: https://docs.aws.amazon.com/ecs/
- **Docker docs**: https://docs.docker.com/

## Summary Checklist

- [ ] ACM certificate requested and validated
- [ ] Terraform variables configured
- [ ] Infrastructure deployed (`terraform apply`)
- [ ] Secrets created in Secrets Manager
- [ ] Docker image built and pushed to ECR
- [ ] ECS service updated and running
- [ ] DNS configured and propagating
- [ ] Health endpoint responding
- [ ] Application accessible at `https://staging.zenthea.ai`

---

**Congratulations!** 🎉 You've successfully deployed Zenthea to AWS!
