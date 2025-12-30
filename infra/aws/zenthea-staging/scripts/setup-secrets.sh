#!/bin/bash
# Setup AWS Secrets Manager secrets for Zenthea staging environment
# 
# Usage:
#   ./setup-secrets.sh staging
# 
# This script creates or updates secrets in AWS Secrets Manager.
# Fill in the actual values before running.

set -e

ENV="${1:-staging}"
REGION="${AWS_REGION:-us-east-1}"
SECRET_PREFIX="${ENV}/zenthea"

if [ -z "$ENV" ]; then
  echo "Usage: $0 <environment>"
  echo "Example: $0 staging"
  exit 1
fi

echo "Setting up secrets for environment: $ENV"
echo "Region: $REGION"
echo "Secret prefix: $SECRET_PREFIX"
echo ""

# Function to create or update secret
create_secret() {
  local name=$1
  local value=$2
  local secret_id="${SECRET_PREFIX}/${name}"
  
  # Check if secret exists
  if aws secretsmanager describe-secret \
    --secret-id "$secret_id" \
    --region "$REGION" > /dev/null 2>&1; then
    echo "⚠️  Updating existing secret: $secret_id"
    aws secretsmanager update-secret \
      --secret-id "$secret_id" \
      --secret-string "$value" \
      --region "$REGION" > /dev/null
    echo "✅ Updated: $secret_id"
  else
    echo "➕ Creating new secret: $secret_id"
    aws secretsmanager create-secret \
      --name "$secret_id" \
      --secret-string "$value" \
      --region "$REGION" > /dev/null
    echo "✅ Created: $secret_id"
  fi
}

# Function to prompt for secret value
prompt_secret() {
  local name=$1
  local description=$2
  local current_value=""
  
  # Try to get existing value
  if aws secretsmanager describe-secret \
    --secret-id "${SECRET_PREFIX}/${name}" \
    --region "$REGION" > /dev/null 2>&1; then
    current_value=$(aws secretsmanager get-secret-value \
      --secret-id "${SECRET_PREFIX}/${name}" \
      --region "$REGION" \
      --query SecretString \
      --output text 2>/dev/null || echo "")
  fi
  
  if [ -n "$current_value" ]; then
    echo ""
    echo "Current value for $name: ${current_value:0:20}..."
    read -p "Update $description? (y/N): " update
    if [ "$update" != "y" ] && [ "$update" != "Y" ]; then
      echo "⏭️  Skipping $name"
      return
    fi
  fi
  
  echo ""
  read -sp "Enter $description: " value
  echo ""
  
  if [ -z "$value" ]; then
    echo "⚠️  Empty value, skipping $name"
    return
  fi
  
  create_secret "$name" "$value"
}

# Required secrets
echo "=========================================="
echo "Setting up required secrets"
echo "=========================================="
echo ""
echo "You can either:"
echo "1. Enter values interactively (recommended for first time)"
echo "2. Set environment variables and re-run with --env-vars flag"
echo ""

# Database
prompt_secret "DATABASE_URL" "Database URL (postgresql://user:password@host:port/database)"

# Clerk
prompt_secret "CLERK_SECRET_KEY" "Clerk Secret Key (sk_...)"
prompt_secret "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" "Clerk Publishable Key (pk_...)"
prompt_secret "CLERK_WEBHOOK_SECRET" "Clerk Webhook Secret (whsec_...)"

# Stripe
prompt_secret "STRIPE_SECRET_KEY" "Stripe Secret Key (sk_...)"
prompt_secret "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "Stripe Publishable Key (pk_...)"
prompt_secret "STRIPE_WEBHOOK_SECRET" "Stripe Webhook Secret (whsec_...)"

echo ""
echo "=========================================="
echo "✅ Secrets setup complete!"
echo "=========================================="
echo ""
echo "Optional: Set up additional secrets manually:"
echo "  aws secretsmanager create-secret \\"
echo "    --name ${SECRET_PREFIX}/AWS_S3_BUCKET \\"
echo "    --secret-string 'your-bucket-name' \\"
echo "    --region $REGION"
echo ""
