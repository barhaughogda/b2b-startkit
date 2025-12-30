# Deployment Checklist

Print this page and check off items as you complete them.

## Prerequisites

- [ ] AWS account created and accessible
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS credentials configured (`aws configure`)
- [ ] Terraform installed (`terraform version`)
- [ ] Docker installed and running (`docker ps`)
- [ ] Access to DNS settings for `zenthea.ai`
- [ ] Domain `staging.zenthea.ai` ready to use

## Step 1: ACM Certificate

- [ ] Opened AWS Console → Certificate Manager (us-east-1)
- [ ] Requested certificate for `staging.zenthea.ai`
- [ ] Added DNS validation record
- [ ] Certificate status changed to "Issued"
- [ ] **Saved Certificate ARN:** `arn:aws:acm:us-east-1:...`

## Step 2: Configure Terraform

- [ ] Navigated to `infra/aws/zenthea-staging/terraform`
- [ ] Copied `staging.tfvars.example` to `staging.tfvars`
- [ ] Filled in `acm_certificate_arn` (from Step 1)
- [ ] Filled in `domain_name`: `staging.zenthea.ai`
- [ ] Created S3 buckets (or verified existing)
- [ ] Updated `s3_bucket_name` and `s3_medical_bucket_name`
- [ ] Verified all values in `staging.tfvars`

## Step 3: Deploy Infrastructure

- [ ] Ran `terraform init` (successful)
- [ ] Ran `terraform plan -var-file=staging.tfvars` (reviewed output)
- [ ] Ran `terraform apply -var-file=staging.tfvars` (completed)
- [ ] **Saved ALB DNS:** `staging-zenthea-alb-xxxxx.us-east-1.elb.amazonaws.com`
- [ ] **Saved ECR URL:** `123456789012.dkr.ecr.us-east-1.amazonaws.com/staging-zenthea`
- [ ] **Saved Cluster Name:** `staging-zenthea-cluster`
- [ ] **Saved Service Name:** `staging-zenthea-service`
- [ ] Verified resources in AWS Console

## Step 4: Set Up Secrets

- [ ] Navigated to `infra/aws/zenthea-staging/scripts`
- [ ] Ran `./setup-secrets.sh staging`
- [ ] Created `DATABASE_URL` secret
- [ ] Created `CLERK_SECRET_KEY` secret
- [ ] Created `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` secret
- [ ] Created `CLERK_WEBHOOK_SECRET` secret
- [ ] Created `STRIPE_SECRET_KEY` secret
- [ ] Created `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` secret
- [ ] Created `STRIPE_WEBHOOK_SECRET` secret
- [ ] Verified all 7 secrets exist in Secrets Manager

## Step 5: Build and Push Docker Image

- [ ] Got ECR repository URL from Terraform output
- [ ] Logged into ECR (`docker login` successful)
- [ ] Built Docker image (`docker build` successful)
- [ ] Tagged image for ECR
- [ ] Pushed image to ECR (`docker push` successful)
- [ ] Verified image in ECR Console
- [ ] Updated ECS service (`aws ecs update-service`)
- [ ] Waited for deployment (tasks running)
- [ ] Checked logs (no errors)

## Step 6: Configure DNS

- [ ] Got ALB DNS name from Terraform output
- [ ] Opened DNS provider (Route 53 or other)
- [ ] Created A record (Alias) for `staging.zenthea.ai`
- [ ] Pointed to ALB
- [ ] Enabled "Evaluate target health"
- [ ] Saved DNS record
- [ ] Waited 5-30 minutes for propagation
- [ ] Tested: `curl https://staging.zenthea.ai/api/health`
- [ ] **Response:** `{"status":"ok",...}` ✅

## Verification

- [ ] Application accessible at `https://staging.zenthea.ai`
- [ ] Health endpoint returns 200 OK
- [ ] ECS tasks running and healthy
- [ ] CloudWatch logs showing no errors
- [ ] ALB health checks passing

## Optional: Rollback Setup

- [ ] Created `legacy.zenthea.ai` DNS record
- [ ] Pointed to old Vercel deployment
- [ ] Tested rollback hostname works

## Notes

**Certificate ARN:**
```
_________________________________________________
```

**ALB DNS:**
```
_________________________________________________
```

**ECR Repository:**
```
_________________________________________________
```

**Cluster Name:**
```
_________________________________________________
```

**Service Name:**
```
_________________________________________________
```

**Issues Encountered:**
```
_________________________________________________
_________________________________________________
_________________________________________________
```

---

**Deployment Date:** _______________

**Completed By:** _______________

**Status:** ⬜ In Progress  ⬜ Complete  ⬜ Failed
