# Billing Integration Guide

This guide explains how to set up and use Stripe billing in your StartKit product.

## Overview

StartKit uses Stripe for subscription management with support for:
- **Per-seat pricing**: Charge per user (e.g., $29/user/month)
- **Usage-based pricing**: Charge based on usage metrics (e.g., API calls, storage)
- **Flat-rate pricing**: Fixed monthly/yearly price

## Prerequisites

- Stripe account ([sign up](https://stripe.com))
- Stripe API keys (test mode for development)
- Products and prices created in Stripe

## Step 1: Set Up Stripe Products

### Using the Setup Script (Recommended)

```bash
pnpm setup:stripe
```

This script:
1. Creates Free, Pro, and Enterprise products in Stripe
2. Creates monthly and yearly prices for each
3. Outputs price IDs for your `.env.local`

### Manual Setup

If you prefer to create products manually:

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Create products:
   - **Free**: $0/month
   - **Pro**: $29/month (or your price)
   - **Enterprise**: Custom pricing
3. Copy the `price_xxx` IDs for each plan

### Add Price IDs to Environment

```env
# In apps/[your-product]/.env.local
STRIPE_PRICE_ID_FREE=price_xxxxx
STRIPE_PRICE_ID_PRO=price_xxxxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxx
```

## Step 2: Configure Webhooks

### Production Setup

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
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
5. Copy the webhook secret (starts with `whsec_`)

### Local Development

Use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook secret from the CLI output (different from dashboard secret).

## Step 3: Create Checkout Session

### Basic Example

```typescript
import { createCheckoutSession } from '@startkit/billing'

// In your API route or server action
const session = await createCheckoutSession({
  organizationId: org.id,
  priceId: process.env.STRIPE_PRICE_ID_PRO!,
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
})

// Redirect to checkout
redirect(session.url)
```

### With Trial Period

```typescript
const session = await createCheckoutSession({
  organizationId: org.id,
  priceId: process.env.STRIPE_PRICE_ID_PRO!,
  successUrl: '/billing/success',
  cancelUrl: '/billing',
  trialDays: 14, // 14-day free trial
})
```

### With Promotion Code

```typescript
const session = await createCheckoutSession({
  organizationId: org.id,
  priceId: process.env.STRIPE_PRICE_ID_PRO!,
  successUrl: '/billing/success',
  cancelUrl: '/billing',
  promotionCode: 'SUMMER2024', // Discount code
})
```

### Per-Seat Pricing

```typescript
const session = await createCheckoutSession({
  organizationId: org.id,
  priceId: process.env.STRIPE_PRICE_ID_PRO!,
  quantity: org.memberCount, // Number of seats
  successUrl: '/billing/success',
  cancelUrl: '/billing',
})
```

## Step 4: Handle Webhooks

### API Route Setup

Create `apps/[your-product]/src/app/api/webhooks/stripe/route.ts`:

```typescript
import { handleStripeWebhook, verifyStripeSignature } from '@startkit/billing'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  try {
    // Verify webhook signature
    const event = verifyStripeSignature(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    // Handle webhook event
    const result = await handleStripeWebhook(event)

    if (!result.processed) {
      console.error('Webhook error:', result.error)
      return NextResponse.json(
        { error: 'Webhook processing failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 400 }
    )
  }
}
```

### Webhook Events Handled

The `handleStripeWebhook` function automatically handles:

- **`checkout.session.completed`**: Creates subscription in database
- **`customer.subscription.created`**: Syncs subscription status
- **`customer.subscription.updated`**: Updates subscription (plan changes, renewals)
- **`customer.subscription.deleted`**: Marks subscription as canceled
- **`invoice.paid`**: Records successful payment
- **`invoice.payment_failed`**: Triggers grace period logic
- **`customer.deleted`**: Cleans up customer data

## Step 5: Manage Subscriptions

### Get Current Subscription

```typescript
import { getSubscription } from '@startkit/billing'

const subscription = await getSubscription(organizationId)

if (!subscription) {
  // No active subscription
  return
}

console.log(subscription.plan) // 'free' | 'pro' | 'enterprise'
console.log(subscription.status) // 'active' | 'canceled' | 'past_due'
```

### Open Billing Portal

```typescript
import { createBillingPortalSession } from '@startkit/billing'

const portal = await createBillingPortalSession(
  organizationId,
  '/billing' // Return URL
)

redirect(portal.url)
```

Users can:
- Update payment method
- View invoices
- Cancel subscription
- Update billing address

### Cancel Subscription

```typescript
import { cancelSubscription } from '@startkit/billing'

await cancelSubscription(organizationId)
// Subscription cancels at period end
```

### Resume Canceled Subscription

```typescript
import { resumeSubscription } from '@startkit/billing'

await resumeSubscription(organizationId)
// Reactivates subscription immediately
```

### Change Plan (Upgrade/Downgrade)

```typescript
import { changeSubscription } from '@startkit/billing'

await changeSubscription({
  organizationId: org.id,
  newPriceId: process.env.STRIPE_PRICE_ID_ENTERPRISE!,
  prorationBehavior: 'always_invoice', // or 'create_prorations'
})
```

### Update Seat Count (Per-Seat Plans)

```typescript
import { updateSubscriptionQuantity } from '@startkit/billing'

await updateSubscriptionQuantity(organizationId, 10) // 10 seats
```

## Step 6: Usage-Based Billing

### Track Usage

```typescript
import { trackUsage } from '@startkit/billing'

// Track API calls
await trackUsage({
  organizationId: org.id,
  metric: 'api_calls',
  quantity: 1000, // 1000 API calls
  timestamp: new Date(),
})
```

### Get Usage Summary

```typescript
import { getUsageSummary } from '@startkit/billing'

const usage = await getUsageSummary({
  organizationId: org.id,
  metric: 'api_calls',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
})

console.log(usage.total) // Total usage for period
console.log(usage.period) // 'month' | 'year'
```

### Report Usage to Stripe

For usage-based pricing, report usage at billing cycle:

```typescript
import { reportUsageToStripe } from '@startkit/billing'

await reportUsageToStripe({
  organizationId: org.id,
  metric: 'api_calls',
  quantity: 1000,
  timestamp: new Date(),
})
```

## Step 7: Check Subscription Status

### In API Routes

```typescript
import { getSubscription } from '@startkit/billing'
import { requireAuth } from '@startkit/auth'

export async function GET(req: Request) {
  const { organizationId } = await requireAuth(req)

  const subscription = await getSubscription(organizationId)

  if (!subscription || subscription.status !== 'active') {
    return NextResponse.json(
      { error: 'No active subscription' },
      { status: 403 }
    )
  }

  // Proceed with feature access
}
```

### In Components

```typescript
'use client'

import { useSubscription } from '@startkit/billing' // If you create this hook

export function PremiumFeature() {
  const { subscription, isLoading } = useSubscription()

  if (isLoading) return <div>Loading...</div>
  if (!subscription || subscription.plan === 'free') {
    return <UpgradePrompt />
  }

  return <PremiumContent />
}
```

## Pricing Models

### Per-Seat Pricing

Best for: Team collaboration tools, project management

```typescript
// Create checkout with seat count
const session = await createCheckoutSession({
  organizationId: org.id,
  priceId: process.env.STRIPE_PRICE_ID_PRO!,
  quantity: org.memberCount,
  successUrl: '/billing/success',
  cancelUrl: '/billing',
})

// Update seats when team grows
await updateSubscriptionQuantity(organizationId, newMemberCount)
```

### Usage-Based Pricing

Best for: API services, storage, compute

```typescript
// Track usage throughout the month
await trackUsage({
  organizationId: org.id,
  metric: 'api_calls',
  quantity: 1,
})

// Report to Stripe at billing cycle
await reportUsageToStripe({
  organizationId: org.id,
  metric: 'api_calls',
  quantity: totalUsage,
})
```

### Flat-Rate Pricing

Best for: Simple SaaS products

```typescript
// Simple checkout, no quantity needed
const session = await createCheckoutSession({
  organizationId: org.id,
  priceId: process.env.STRIPE_PRICE_ID_PRO!,
  successUrl: '/billing/success',
  cancelUrl: '/billing',
})
```

## Testing

### Test Cards

Use Stripe test cards:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

### Test Webhooks

Use Stripe CLI to trigger test events:

```bash
# Trigger checkout completed
stripe trigger checkout.session.completed

# Trigger subscription updated
stripe trigger customer.subscription.updated

# Trigger payment failed
stripe trigger invoice.payment_failed
```

## Best Practices

### 1. Always Verify Webhook Signatures

Never skip signature verification. This prevents malicious requests:

```typescript
const event = verifyStripeSignature(body, signature, webhookSecret)
```

### 2. Handle Idempotency

Webhook handlers are idempotent by default. Stripe may retry webhooks, so ensure your handlers can handle duplicate events.

### 3. Sync from Stripe

Stripe is the source of truth. Always sync subscription state from Stripe, not the other way around.

### 4. Handle Payment Failures Gracefully

```typescript
// In your webhook handler
if (event.type === 'invoice.payment_failed') {
  // Send email notification
  // Show warning in UI
  // Give grace period before downgrading
}
```

### 5. Use Metadata

Attach metadata to subscriptions for easier debugging:

```typescript
const session = await createCheckoutSession({
  organizationId: org.id,
  priceId: priceId,
  metadata: {
    source: 'landing_page',
    campaign: 'summer2024',
  },
})
```

## Troubleshooting

### "Webhook signature verification failed"

- Check `STRIPE_WEBHOOK_SECRET` is correct
- For local dev, use Stripe CLI secret (different from dashboard)
- Ensure request body is raw (not parsed JSON)

### "Subscription not found"

- Check webhook handlers are running
- Verify `checkout.session.completed` event is handled
- Check database for subscription record

### "Price ID not found"

- Verify price IDs in `.env.local` match Stripe dashboard
- Check price IDs are from correct environment (test/live)
- Ensure prices are active in Stripe

### "Customer already exists"

This is normal. The system creates or reuses customers automatically.

## Related Documentation

- [Getting Started Guide](./getting-started.md) - Initial setup
- [Creating New Product Guide](./creating-new-product.md) - Product setup
- [Database Guide](./database-migrations.md) - Database schema
