# Zenthea AWS Staging - Quick Start Guide

## Prerequisites Checklist

- [ ] AWS account with admin access
- [ ] Terraform >= 1.5.0 installed (`terraform version`)
- [ ] AWS CLI configured (`aws configure`)
- [ ] Docker installed (`docker --version`)
- [ ] Domain name ready (`staging.zenthea.ai`)
- [ ] ACM certificate requested and validated

## 5-Minute Setup

### 1. Request ACM Certificate (if not done)

```bash
aws acm request-certificate \
  --domain-name staging.zenthea.ai \
  --validation-method DNS \
  --region us-east-1
# Complete DNS validation, note the ARN
```

### 2. Configure Terraform

```bash
cd infra/aws/zenthea-staging/terraform
cp staging.tfvars.example staging.tfvars
# Edit staging.tfvars with your values
```

### 3. Deploy Infrastructure

```bash
terraform init
terraform plan -var-file=staging.tfvars
terraform apply -var-file=staging.tfvars
```

### 4. Set Up Secrets

```bash
cd ../scripts
./setup-secrets.sh staging
# Follow prompts to enter secrets
```

### 5. Build and Deploy App

```bash
# Get ECR repo URL
cd ../terraform
ECR_REPO=$(terraform output -raw ecr_repository_url)
ECR_REGISTRY=$(echo $ECR_REPO | cut -d'/' -f1)

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_REGISTRY

# Build and push (from repo root)
cd ../../..
docker build -f infra/aws/zenthea-staging/Dockerfile -t zenthea:latest .
docker tag zenthea:latest ${ECR_REPO}:latest
docker push ${ECR_REPO}:latest

# Update ECS service
CLUSTER=$(terraform -chdir=infra/aws/zenthea-staging/terraform output -raw ecs_cluster_name)
SERVICE=$(terraform -chdir=infra/aws/zenthea-staging/terraform output -raw ecs_service_name)
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --force-new-deployment \
  --region us-east-1
```

### 6. Configure DNS

```bash
# Get ALB DNS
ALB_DNS=$(terraform -chdir=infra/aws/zenthea-staging/terraform output -raw alb_dns_name)

# Create Route 53 A record (Alias) pointing to ALB
# Or configure manually in Route 53 console
```

### 7. Verify

```bash
# Wait 5-10 minutes for DNS propagation
curl https://staging.zenthea.ai/api/health
# Should return: {"status":"ok",...}
```

## Troubleshooting

**ECS tasks not starting?**
```bash
# Check logs
aws logs tail /ecs/staging-zenthea --follow --region us-east-1

# Check task status
aws ecs list-tasks --cluster staging-zenthea-cluster --region us-east-1
```

**Health checks failing?**
- Verify `/api/health` endpoint exists (✅ already created)
- Check security groups allow ALB → ECS traffic
- Verify ECS tasks are running

**Image pull errors?**
- Verify ECR repository exists
- Check IAM role has ECR permissions
- Ensure image tag matches task definition

## Next Steps

- [ ] Complete T06: DNS configuration
- [ ] Set up CI/CD pipeline
- [ ] Configure monitoring alerts
- [ ] Test rollback procedure

## Full Documentation

- **Detailed Guide**: `DEPLOYMENT.md`
- **Infrastructure Docs**: `README.md`
- **Migration Plan**: `docs/plans/zenthea-migration-hipaa.md`
