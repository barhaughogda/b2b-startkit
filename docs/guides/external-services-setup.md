# External Services Setup Guide

This guide walks you through setting up the external services required for StartKit.

## Overview

| Service | Purpose | Required |
|---------|---------|----------|
| Clerk | Authentication & Organizations | Yes |
| Supabase | Database & Real-time | Yes |
| Stripe | Billing & Subscriptions | Yes |

---

## 1. Clerk Setup (Authentication)

### Create Application

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Click **"Create application"**
3. Name it: `startkit-development` (or your product name)
4. Select authentication methods:
   - ✅ Email
   - ✅ Google (recommended)
   - ✅ GitHub (optional)

### Enable Organizations

1. In Clerk dashboard, go to **Organizations**
2. Click **"Enable organizations"**
3. Configure:
   - Allow users to create organizations: **Yes**
   - Allow users to delete organizations: **Yes** (or No for control)

### Configure Roles

1. Go to **Organizations → Roles**
2. Default roles are fine:
   - `org:admin` → Admin
   - `org:member` → Member
3. Add custom role if needed:
   - `org:owner` → Owner (full access)

### Get API Keys

1. Go to **API Keys**
2. Copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_`)
   - `CLERK_SECRET_KEY` (starts with `sk_`)

### Set Up Webhooks

1. Go to **Webhooks**
2. Click **"Add endpoint"**
3. URL: `https://your-domain.com/api/webhooks/clerk`
   - For local dev: Use ngrok or similar
4. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `organization.created`
   - `organization.updated`
   - `organization.deleted`
   - `organizationMembership.created`
   - `organizationMembership.deleted`
5. Copy `CLERK_WEBHOOK_SECRET` (starts with `whsec_`)

---

## 2. Supabase Setup (Database)

### Create Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New project"**
3. Configure:
   - Name: `startkit-development`
   - Database Password: Generate a strong password (save it!)
   - Region: Choose closest to your users
   - Plan: Free tier is fine for development

### Get API Keys

1. Go to **Settings → API**
2. Copy:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon/public key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role key - keep secret!)

### Get Database Connection String

1. Go to **Settings → Database**
2. Under **Connection string**, select **URI**
3. Copy the connection string for `DATABASE_URL`
4. Replace `[YOUR-PASSWORD]` with your database password

### Run Migrations

After setting up environment variables:

```bash
cd /path/to/b2b-startkit
pnpm --filter @startkit/database db:push
```

---

## 3. Stripe Setup (Billing)

### Create Account

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Create account or sign in
3. Stay in **Test mode** for development

### Get API Keys

1. Go to **Developers → API keys**
2. Copy:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (starts with `pk_test_`)
   - `STRIPE_SECRET_KEY` (starts with `sk_test_`)

### Create Products & Prices

1. Go to **Products**
2. Click **"Add product"**
3. Create your plans:

**Free Plan:**
- Name: "Free"
- Price: $0/month
- Features: Basic features

**Pro Plan:**
- Name: "Pro"
- Price: $29/month (or your price)
- Features: All features

**Enterprise Plan:**
- Name: "Enterprise"
- Price: Custom (contact sales)

4. Copy the `price_xxx` IDs for each plan

### Set Up Webhooks

1. Go to **Developers → Webhooks**
2. Click **"Add endpoint"**
3. URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.deleted`
5. Copy `STRIPE_WEBHOOK_SECRET` (starts with `whsec_`)

### For Local Development

Use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## 4. Environment File

Create `.env.local` in your app:

```bash
cd apps/web-template
cp .env.example .env.local
```

Fill in all the values you collected above.

---

## 5. Verify Setup

### Test Clerk

```bash
pnpm --filter web-template dev
```

1. Open http://localhost:3000
2. Click "Sign Up"
3. Create an account
4. Verify you're redirected to dashboard

### Test Supabase

1. Open Supabase dashboard
2. Go to **Table Editor**
3. Verify tables were created by migration

### Test Stripe

1. In the app, go to Billing
2. Click "Upgrade"
3. Use test card: `4242 4242 4242 4242`
4. Verify subscription created

---

## Troubleshooting

### Clerk: "Invalid API key"
- Check `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_`
- Check `CLERK_SECRET_KEY` starts with `sk_`
- Ensure keys are from the correct environment (dev/prod)

### Supabase: "Connection refused"
- Check `DATABASE_URL` has correct password
- Ensure project is running (not paused)
- Check region matches your connection string

### Stripe: "Webhook signature verification failed"
- Ensure `STRIPE_WEBHOOK_SECRET` is correct
- For local dev, use Stripe CLI secret (different from dashboard)
- Check request body is raw (not parsed JSON)

---

## Local Development with Webhooks

For testing webhooks locally, you need to expose your localhost:

### Option 1: Stripe CLI (Stripe only)
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Option 2: ngrok (All webhooks)
```bash
ngrok http 3000
```
Then update webhook URLs in Clerk and Stripe with your ngrok URL.

### Option 3: Cloudflare Tunnel
```bash
cloudflared tunnel --url http://localhost:3000
```
