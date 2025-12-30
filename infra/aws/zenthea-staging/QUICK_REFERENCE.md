# Quick Reference - Key Commands

## Prerequisites Check

```bash
aws --version                    # Check AWS CLI
aws sts get-caller-identity      # Verify AWS credentials
terraform version                # Check Terraform
docker --version                 # Check Docker
```

## Step 1: ACM Certificate

```bash
# Request certificate
aws acm request-certificate \
  --domain-name staging.zenthea.ai \
  --validation-method DNS \
  --region us-east-1

# Copy ARN from AWS Console after validation
```

## Step 2: Configure Terraform

```bash
cd infra/aws/zenthea-staging/terraform
cp staging.tfvars.example staging.tfvars
# Edit staging.tfvars with your values
```

## Step 3: Deploy Infrastructure

```bash
terraform init
terraform plan -var-file=staging.tfvars
terraform apply -var-file=staging.tfvars

# Save outputs
terraform output alb_dns_name
terraform output ecr_repository_url
terraform output ecs_cluster_name
terraform output ecs_service_name
```

## Step 4: Set Up Secrets

```bash
cd ../scripts
./setup-secrets.sh staging

# Or manually
aws secretsmanager create-secret \
  --name staging/zenthea/DATABASE_URL \
  --secret-string "postgresql://..." \
  --region us-east-1
```

## Step 5: Build and Push Docker Image

```bash
# Get ECR repo
cd ../terraform
ECR_REPO=$(terraform output -raw ecr_repository_url)
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
CLUSTER=$(terraform -chdir=infra/aws/zenthea-staging/terraform output -raw ecs_cluster_name)
SERVICE=$(terraform -chdir=infra/aws/zenthea-staging/terraform output -raw ecs_service_name)
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --force-new-deployment \
  --region us-east-1
```

## Step 6: Configure DNS

```bash
# Get ALB DNS
ALB_DNS=$(terraform -chdir=infra/aws/zenthea-staging/terraform output -raw alb_dns_name)

# Configure in Route 53 or your DNS provider
# Create A record (Alias) pointing to ALB
```

## Useful Commands

### Check ECS Service Status

```bash
aws ecs describe-services \
  --cluster staging-zenthea-cluster \
  --services staging-zenthea-service \
  --region us-east-1
```

### View Logs

```bash
aws logs tail /ecs/staging-zenthea --follow --region us-east-1
```

### Check Health

```bash
curl https://staging.zenthea.ai/api/health
```

### List Secrets

```bash
aws secretsmanager list-secrets \
  --filters Key=name,Values=staging/zenthea \
  --region us-east-1
```

### Destroy Infrastructure

```bash
cd infra/aws/zenthea-staging/terraform
terraform destroy -var-file=staging.tfvars
```

## Troubleshooting

### ECS Tasks Not Starting

```bash
# Check task status
aws ecs list-tasks --cluster staging-zenthea-cluster --region us-east-1
aws ecs describe-tasks --cluster staging-zenthea-cluster --tasks TASK_ID --region us-east-1

# Check logs
aws logs tail /ecs/staging-zenthea --follow --region us-east-1
```

### Health Check Failures

```bash
# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names staging-zenthea-tg \
    --region us-east-1 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text) \
  --region us-east-1
```

### DNS Not Resolving

```bash
dig staging.zenthea.ai +short
nslookup staging.zenthea.ai
```

## Important Values to Save

- ACM Certificate ARN: `arn:aws:acm:us-east-1:...`
- ALB DNS Name: `staging-zenthea-alb-xxxxx.us-east-1.elb.amazonaws.com`
- ECR Repository URL: `123456789012.dkr.ecr.us-east-1.amazonaws.com/staging-zenthea`
- ECS Cluster Name: `staging-zenthea-cluster`
- ECS Service Name: `staging-zenthea-service`
