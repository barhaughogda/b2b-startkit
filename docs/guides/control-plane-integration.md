# Control Plane Integration Guide

This guide explains how to integrate a product with the StartKit Control Plane for centralized customer management, billing aggregation, and cross-product analytics.

## Overview

The Control Plane architecture allows you to:
- **Manage customers** across multiple independent products
- **Aggregate billing** from a single Stripe account across all products
- **View platform-wide analytics** including MRR, subscriptions, and revenue by product
- **Maintain independence** - each product has its own database and Clerk instance

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Control Plane                            │
│                  (apps/superadmin)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Platform DB (Postgres)                               │   │
│  │  - customers, product_orgs                            │   │
│  │  - customer_product_org_links                         │   │
│  │  - product_subscriptions, billing_events              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
        ▲                    ▲                    ▲
        │ Signed Events      │ Signed Events      │ Signed Events
        │                    │                    │
┌───────┴───────┐   ┌───────┴───────┐   ┌───────┴───────┐
│   Product A   │   │   Product B   │   │   Product C   │
│  (Own Clerk)  │   │  (Own Clerk)  │   │  (Own Clerk)  │
│   (Own DB)    │   │   (Own DB)    │   │   (Own DB)    │
└───────────────┘   └───────────────┘   └───────────────┘
```

## Setup

### 1. Register Your Product in the Control Plane

1. Log into the Superadmin dashboard at `/products`
2. Click **Register Product**
3. Fill in:
   - **Product Name (slug)**: Lowercase identifier (e.g., `my-product`)
   - **Display Name**: Human-readable name
   - **Base URL**: Product's deployment URL
   - **Environment**: development/staging/production

### 2. Generate a Signing Key

1. Navigate to your product's detail page
2. Click **Generate Key**
3. Save the displayed secret - it's only shown once!
4. Note the Key ID (KID)

### 3. Configure Your Product

Add these environment variables to your product's `.env.local`:

```env
CONTROL_PLANE_URL=https://admin.yourdomain.com  # Or http://localhost:4501 for dev
CONTROL_PLANE_KID=your-key-id
CONTROL_PLANE_SECRET=your-secret-key
```

### 4. Import the Client

The control plane client is available in `apps/web-template/src/lib/control-plane-client.ts`. Copy this file to your product or import from a shared package.

```typescript
import {
  emitOrgCreated,
  emitOrgUpdated,
  emitSubscriptionCreated,
  emitSubscriptionUpdated,
  emitSubscriptionDeleted,
  emitInvoicePaid,
} from '@/lib/control-plane-client'
```

## Event Types

### Organization Events

#### `product.org.created`
Emit when a new organization is created in your product (typically via Clerk webhook).

```typescript
await emitOrgCreated({
  externalOrgId: 'org_abc123',        // Clerk org ID
  externalDbId: 'uuid-from-your-db',  // Your DB's organization ID
  name: 'Acme Corp',
  slug: 'acme-corp',
  domain: 'acme.com',                 // Optional
})
```

#### `product.org.updated`
Emit when organization details change.

```typescript
await emitOrgUpdated({
  externalOrgId: 'org_abc123',
  name: 'Acme Corporation',           // Updated name
  status: 'suspended',                // Optional status change
})
```

### Subscription Events

#### `product.subscription.created`
Emit when a new subscription is created. This is typically called from your Stripe webhook handler.

```typescript
await emitSubscriptionCreated({
  stripeSubscriptionId: 'sub_abc123',
  stripeCustomerId: 'cus_xyz789',
  externalOrgId: 'org_abc123',        // From Stripe metadata
  status: 'active',
  priceId: 'price_basic_monthly',
  productName: 'Basic Plan',          // Human-readable
  amount: '2900',                     // In cents ($29.00)
  currency: 'usd',
  interval: 'month',
  currentPeriodStart: '2024-01-01T00:00:00Z',
  currentPeriodEnd: '2024-02-01T00:00:00Z',
  stripeEventId: 'evt_xyz',           // For idempotency
})
```

#### `product.subscription.updated`
Emit when subscription status or details change.

```typescript
await emitSubscriptionUpdated({
  stripeSubscriptionId: 'sub_abc123',
  status: 'past_due',
  cancelAt: '2024-03-01T00:00:00Z',
  stripeEventId: 'evt_xyz',
})
```

#### `product.subscription.deleted`
Emit when a subscription is fully canceled.

```typescript
await emitSubscriptionDeleted({
  stripeSubscriptionId: 'sub_abc123',
  stripeEventId: 'evt_xyz',
})
```

#### `product.invoice.paid`
Emit when an invoice is successfully paid. This drives revenue tracking.

```typescript
await emitInvoicePaid({
  stripeSubscriptionId: 'sub_abc123',
  stripeCustomerId: 'cus_xyz789',
  amount: '2900',
  currency: 'usd',
  stripeEventId: 'evt_xyz',
})
```

## Stripe Metadata for Attribution

To enable automatic linking of subscriptions to organizations, add metadata when creating Stripe checkout sessions or subscriptions:

```typescript
const session = await stripe.checkout.sessions.create({
  // ... other options
  subscription_data: {
    metadata: {
      productId: 'my-product',           // Your product slug
      externalOrgId: organizationId,     // Clerk org ID
    },
  },
})
```

Then in your Stripe webhook, extract and forward this metadata:

```typescript
// In your subscription.created webhook handler
const subscription = event.data.object
const metadata = subscription.metadata

await emitSubscriptionCreated({
  stripeSubscriptionId: subscription.id,
  stripeCustomerId: subscription.customer as string,
  externalOrgId: metadata.externalOrgId,
  // ... rest of the data
})
```

## Integration with Clerk Webhooks

Add control plane event emission to your Clerk webhook handlers:

```typescript
// In your Clerk webhook handler (api/webhooks/clerk/route.ts)
import { emitOrgCreated, emitOrgUpdated } from '@/lib/control-plane-client'

async function handleOrganizationCreated(data: OrganizationJSON) {
  // Your existing logic...
  
  // Emit to control plane (fire-and-forget)
  emitOrgCreated({
    externalOrgId: data.id,
    name: data.name,
    slug: data.slug,
  }).catch(console.error)
}
```

## Security

### HMAC Signature Verification

All events are signed using HMAC-SHA256 with your product's secret key. The signature is verified on the control plane side before processing.

Headers sent with each request:
- `X-Product-Kid`: Your key ID
- `X-Product-Signature`: HMAC-SHA256 signature
- `X-Product-Timestamp`: Unix timestamp (for replay protection)

The signature payload format: `{timestamp}.{json_body}`

### Replay Protection

Events with timestamps older than 5 minutes are rejected. This prevents replay attacks using captured requests.

### Idempotency

Each event includes a unique `eventId`. Events that have already been processed are acknowledged but not re-processed, ensuring safe retries.

### Key Rotation

To rotate keys:
1. Generate a new key in the control plane
2. Update your product's environment variables
3. Revoke the old key after confirming the new one works

## Best Practices

1. **Fire-and-Forget**: Use `.catch()` to prevent control plane issues from affecting your product's critical paths.

2. **Background Jobs**: For high-volume events, consider queueing control plane emissions rather than sending synchronously.

3. **Error Handling**: Log control plane errors but don't fail user-facing operations if event emission fails.

4. **Idempotency**: Always include `stripeEventId` for billing events to ensure idempotent processing.

5. **Testing**: In development, the client will log events rather than sending them if not configured.

## Troubleshooting

### Events Not Appearing in Control Plane

1. Check environment variables are set correctly
2. Verify the signing key hasn't been revoked
3. Check the control plane logs for signature verification errors
4. Ensure timestamps are within the 5-minute replay window

### Subscription Data Missing

1. Verify `externalOrgId` is included in Stripe metadata
2. Check that the product org exists in the control plane (emit org events first)
3. Ensure amount is in cents as a string, not dollars

### Customer Linking Issues

1. Organizations must be synced before they can be linked to customers
2. Domain-based auto-linking requires exact domain matches
3. Manual linking is available as a fallback in the superadmin UI
