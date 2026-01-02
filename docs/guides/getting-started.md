# Getting Started Guide

This guide will get you from zero to a running B2B SaaS product in **10 minutes**.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 20+ installed ([download](https://nodejs.org/))
- **pnpm** 9+ installed (`npm install -g pnpm@9`)
- Accounts for:
  - [Clerk](https://clerk.com) (authentication)
  - [Supabase](https://supabase.com) (database)
  - [Stripe](https://stripe.com) (billing)

## Step 1: Clone and Install (2 minutes)

```bash
# Clone the repository
git clone https://github.com/barhaughogda/b2b-startkit.git
cd b2b-startkit

# Install dependencies
pnpm install
```

## Step 2: Set Up External Services (5 minutes)

Follow the [External Services Setup Guide](./external-services-setup.md) to:

1. **Clerk**: Create app, enable organizations, get API keys
2. **Supabase**: Create project, get connection string
3. **Stripe**: Create account, get API keys

> 💡 **Tip**: Keep a text file open to copy all the keys you'll need.

## Step 3: Configure Environment Variables (1 minute)

```bash
# Copy the template
cp apps/web-template/env.template apps/web-template/.env.local

# Edit with your keys
# Use your preferred editor (VS Code, nano, vim, etc.)
code apps/web-template/.env.local
```

Fill in all the values from Step 2. Your `.env.local` should look like:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Step 4: Run Database Migrations (1 minute)

```bash
# Push schema to database
pnpm --filter @startkit/database db:push

# Apply RLS policies
pnpm --filter @startkit/database db:apply-rls
```

This creates all the tables and security policies needed for multi-tenancy.

## Step 5: Set Up Stripe Products (1 minute)

```bash
# Create products and prices in Stripe
pnpm setup:stripe
```

This script creates Free, Pro, and Enterprise plans in your Stripe account and outputs the price IDs. Add them to your `.env.local`:

```env
STRIPE_PRICE_ID_FREE=price_xxxxx
STRIPE_PRICE_ID_PRO=price_xxxxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxx
```

## Step 6: Start Development Server (30 seconds)

```bash
# Start all apps
pnpm dev
```

This starts:
- `zenthea` app at http://localhost:3000
- `web-template` app at http://localhost:4500
- `superadmin` app at http://localhost:4501 (if configured)

## Step 7: Verify Everything Works (30 seconds)

1. **Open** http://localhost:3000
2. **Click** "Sign Up"
3. **Create** an account (use a test email)
4. **Create** an organization
5. **Verify** you're redirected to the dashboard

🎉 **Congratulations!** Your B2B SaaS starter kit is running.

## Next Steps

### Create Your First Product

```bash
pnpm create:product --name=my-product --display-name="My Product"
```

This creates a new product from the template. See the [Creating New Product Guide](./creating-new-product.md) for details.

### Explore the Codebase

- **Packages**: Check out `packages/` for shared infrastructure
- **Apps**: See `apps/web-template/` for example pages
- **Documentation**: Browse `docs/` for guides and ADRs

### Customize Your Product

1. **Branding**: Update `apps/web-template/src/config/product.ts`
2. **Features**: Modify pages in `apps/web-template/src/app/`
3. **Components**: Use or extend `@startkit/ui` components

## Troubleshooting

### "Cannot connect to database"

- Verify `DATABASE_URL` is correct
- Check Supabase project is running (not paused)
- Ensure password in connection string matches Supabase password

### "Invalid API key" (Clerk)

- Check keys start with `pk_` (publishable) and `sk_` (secret)
- Ensure keys are from the correct environment (test/live)
- Verify keys are copied completely (no truncation)

### "Webhook signature verification failed" (Stripe)

- For local dev, use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Copy the webhook secret from CLI output (different from dashboard)
- Ensure webhook endpoint is accessible

### "Module not found" errors

- Run `pnpm install` again
- Clear `.next` cache: `rm -rf apps/web-template/.next`
- Restart dev server

## Common Commands

```bash
# Development
pnpm dev              # Start all apps
pnpm build            # Build for production
pnpm lint             # Lint all code
pnpm typecheck        # Type check all packages

# Database
pnpm --filter @startkit/database db:generate  # Generate migrations
pnpm --filter @startkit/database db:push      # Push schema (dev)
pnpm --filter @startkit/database db:migrate  # Apply migrations (prod)
pnpm --filter @startkit/database db:studio    # Open Drizzle Studio

# Testing
pnpm test:unit        # Run unit tests
pnpm test:e2e         # Run E2E tests

# Product Management
pnpm create:product --name=my-app --display-name="My App"
```

## Getting Help

- **Documentation**: See `docs/` folder
- **Issues**: Check GitHub issues
- **Discussions**: Join GitHub Discussions

## What's Next?

- [Creating New Product Guide](./creating-new-product.md) - Build your first product
- [Billing Integration Guide](./billing-integration.md) - Set up subscriptions
- [RBAC Guide](./rbac.md) - Configure roles and permissions
- [Database Guide](./database-migrations.md) - Understand the database layer
