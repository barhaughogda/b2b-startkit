# Creating a New Product Guide

This guide walks you through creating a new SaaS product from the StartKit template.

## Overview

The `create-product` script scaffolds a new Next.js app from `web-template`, configures it for your product, and sets up the necessary files.

## Quick Start

### Using Flags (Recommended)

```bash
pnpm create:product \
  --name=my-product \
  --display-name="My Product" \
  --description="A great SaaS product" \
  --pricing-model=per_seat \
  --has-ai-features=false
```

### Interactive Mode

If you don't provide flags, the script will prompt you:

```bash
pnpm create:product
```

You'll be asked:
- Product name (kebab-case, e.g., `my-product`)
- Display name (human-readable, e.g., "My Product")
- Description
- Pricing model (`per_seat`, `usage_based`, or `flat_rate`)
- Whether to include AI features

## What Gets Created

After running the script, you'll have:

```
apps/my-product/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # Product-specific components
│   ├── config/
│   │   └── product.ts    # Product configuration
│   └── middleware.ts     # Auth middleware
├── package.json          # Updated with product name
└── .env.local            # Environment template
```

## Step-by-Step Process

### 1. Run the Script

```bash
pnpm create:product --name=my-product --display-name="My Product"
```

### 2. Review Generated Files

The script creates:
- **Product config** (`src/config/product.ts`): Branding, pricing, features
- **Environment template** (`.env.local`): Copy from `web-template`
- **Package.json**: Updated with product name

### 3. Set Up External Services

Each product needs its own:
- **Clerk Application**: Create a new app in Clerk dashboard
- **Supabase Project**: Create a new project (or use shared database)
- **Stripe Account**: Use same account, create product-specific prices

> 💡 **Tip**: For development, you can share one Supabase project across products. For production, use separate projects for better isolation.

### 4. Configure Environment Variables

```bash
cd apps/my-product
cp .env.local .env.local
# Edit .env.local with your service keys
```

Required variables:
- Clerk keys (from new Clerk app)
- Supabase keys (from Supabase project)
- Stripe keys (from Stripe account)
- Stripe price IDs (run `pnpm setup:stripe`)

### 5. Run Database Migrations

If using a shared database, migrations are already applied. If using a new database:

```bash
# From root
pnpm --filter @startkit/database db:push
pnpm --filter @startkit/database db:apply-rls
```

### 6. Start Development Server

```bash
# From root
pnpm dev

# Or run just your product
pnpm --filter my-product dev
```

Your product will be available at http://localhost:3000 (or next available port).

## Product Configuration

Edit `apps/my-product/src/config/product.ts` to customize:

### Branding

```typescript
branding: {
  primaryColor: '#0070f3',  // Your brand color
  logo: '/logo.svg',         // Path to logo
  favicon: '/favicon.ico',   // Path to favicon
}
```

### Pricing Model

```typescript
pricing: {
  model: 'per_seat' as const,  // or 'usage_based' or 'flat_rate'
  trialDays: 14,
  plans: [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: ['Basic features', 'Community support'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 29,
      features: ['All features', 'Priority support', 'API access'],
    },
  ],
}
```

### Feature Flags

```typescript
features: {
  aiFeatures: false,  // Enable AI features
}
```

## Customizing Your Product

### 1. Update Landing Page

Edit `apps/my-product/src/app/page.tsx` to customize the landing page:

```typescript
export default function LandingPage() {
  return (
    <div>
      <h1>Welcome to {productConfig.displayName}</h1>
      {/* Your custom content */}
    </div>
  )
}
```

### 2. Add Product-Specific Pages

Create new pages in `apps/my-product/src/app/`:

```typescript
// apps/my-product/src/app/my-feature/page.tsx
export default function MyFeaturePage() {
  return <div>My Feature</div>
}
```

### 3. Create Custom Components

Add product-specific components in `apps/my-product/src/components/`:

```typescript
// apps/my-product/src/components/MyComponent.tsx
export function MyComponent() {
  return <div>Custom component</div>
}
```

### 4. Use Shared Packages

Import from `@startkit/*` packages:

```typescript
import { getServerAuth } from '@startkit/auth'
import { can } from '@startkit/rbac'
import { Button } from '@startkit/ui'
```

## Multi-Product Setup

### Shared Database (Development)

For development, you can share one Supabase project:

1. Use the same `DATABASE_URL` in all products
2. Run migrations once from root
3. Each product's data is isolated by `organization_id` (RLS)

### Separate Databases (Production)

For production, use separate Supabase projects:

1. Create a new Supabase project per product
2. Copy `DATABASE_URL` to product's `.env.local`
3. Run migrations per product: `pnpm --filter my-product db:push`

## Updating Turbo Configuration

The script automatically updates `turbo.json` to include your new product. Verify:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**"]
    }
  }
}
```

All products inherit the same build pipeline.

## Best Practices

### 1. Naming Conventions

- **Product name**: Use kebab-case (`my-product`)
- **Display name**: Use title case ("My Product")
- **Package name**: Matches product name in `package.json`

### 2. Environment Variables

- Never commit `.env.local` (already in `.gitignore`)
- Use `.env.example` for documentation
- Use different Clerk apps per environment (dev/staging/prod)

### 3. Database Strategy

- **Development**: Share one database (easier setup)
- **Production**: Separate databases (better isolation)
- **Staging**: Can share with dev or use separate

### 4. Code Organization

- Product-specific code: `apps/my-product/src/`
- Shared code: `packages/`
- Don't duplicate code from `packages/` in products

## Troubleshooting

### "Product already exists"

The script checks if a product with the same name exists. Either:
- Choose a different name
- Delete the existing product folder (if you want to recreate)

### "Template not found"

Ensure `apps/web-template` exists. If missing:
- Clone the repository again
- Check you're in the root directory

### "Module not found" errors

After creating a product:
```bash
pnpm install  # Reinstall dependencies
```

### Port conflicts

If port 3000 is in use, Next.js will use the next available port (3001, 3002, etc.).

## Control Plane Integration (Optional)

If you're running the StartKit platform with multiple products, connect your product to the **Control Plane** for centralized management:

### What the Control Plane Provides

- **Unified customer view** across all products
- **Billing aggregation** - MRR, subscriptions, revenue per product
- **Organization management** - Link customer orgs across products
- **Platform audit logs** - Track all administrative actions

### How to Connect Your Product

1. **Register the product** in the Superadmin dashboard:
   ```
   https://admin.yourdomain.com/products → Register Product
   ```

2. **Generate a signing key** for the product:
   - Click on your product → Generate Key
   - Copy the Key ID (`sk_xxxx`) and Secret (`cpsk_xxxx`)
   - **Save the secret immediately** - it's only shown once!

3. **Add environment variables** to your product:
   ```env
   # In your product's .env.local
   CONTROL_PLANE_URL=https://admin.yourdomain.com
   CONTROL_PLANE_KID=sk_xxxxxxxx
   CONTROL_PLANE_SECRET=cpsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

4. **Verify the connection** by creating an organization in your product - it should appear in the Control Plane's customer list.

### What Gets Synced Automatically

When connected, your product automatically syncs:

| Event | Description |
|-------|-------------|
| `organization.created` | New orgs appear in Control Plane |
| `organization.updated` | Name/slug changes are reflected |
| `subscription.created` | New subscriptions tracked in billing |
| `subscription.updated` | Plan changes, cancellations sync |
| `invoice.paid` | Payment events for revenue tracking |

### Running Standalone (No Control Plane)

If you don't configure the control plane variables:
- The product works normally in **standalone mode**
- No errors or warnings (graceful skip)
- You can connect later by adding the environment variables

## Next Steps

After creating your product:

1. **Customize branding**: Update `product.ts` config
2. **Set up billing**: See [Billing Integration Guide](./billing-integration.md)
3. **Configure RBAC**: See [RBAC Guide](./rbac.md)
4. **Connect to Control Plane** (optional): See above
5. **Deploy**: Follow deployment guide (coming soon)

## Example: Creating "TaskMaster"

```bash
# Create product
pnpm create:product \
  --name=taskmaster \
  --display-name="TaskMaster" \
  --description="Project management for teams" \
  --pricing-model=per_seat \
  --has-ai-features=true

# Set up environment
cd apps/taskmaster
cp .env.local .env.local
# Edit .env.local with your keys

# Start development
cd ../..
pnpm dev
```

## Related Documentation

- [Getting Started Guide](./getting-started.md) - Initial setup
- [Billing Integration Guide](./billing-integration.md) - Stripe setup
- [RBAC Guide](./rbac.md) - Permissions and roles
- [Database Guide](./database-migrations.md) - Database management
- [Control Plane Integration](./control-plane-integration.md) - Multi-product management
- [Control Plane Production Checklist](./control-plane-production-checklist.md) - Going live