# ADR-003: Use Stripe for Billing

## Status
Accepted

## Date
2024-12-28

## Context

We are building a B2B SaaS starter kit that needs:
1. Subscription management (monthly/yearly)
2. Multiple pricing models (per-seat, usage-based, flat-rate)
3. Payment processing (credit cards, ACH, etc.)
4. Invoice generation
5. Billing portal for customers
6. Webhook-based subscription sync
7. Usage-based billing support
8. Trial periods
9. Promotional codes

The original consideration included building custom billing or using alternative payment processors.

## Decision

Use **Stripe** as the billing and payment processor.

## Rationale

### 1. Subscription Management

Stripe provides comprehensive subscription features:
- Recurring billing (monthly/yearly)
- Proration handling (upgrades/downgrades)
- Trial periods
- Subscription lifecycle management
- Dunning management (failed payments)

This eliminates the need to build custom subscription logic.

### 2. Multiple Pricing Models

Stripe supports all pricing models we need:
- **Per-seat**: Charge per user (`quantity` parameter)
- **Usage-based**: Metered billing with usage records
- **Flat-rate**: Fixed monthly/yearly price

```typescript
// Per-seat
stripe.checkout.sessions.create({
  line_items: [{ price: 'price_xxx', quantity: 10 }] // 10 seats
})

// Usage-based
stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
  quantity: 1000, // 1000 API calls
})
```

### 3. Payment Methods

Stripe supports multiple payment methods:
- Credit/debit cards
- ACH (US)
- SEPA (EU)
- Bank transfers
- Digital wallets (Apple Pay, Google Pay)

This is essential for B2B customers who prefer different payment methods.

### 4. Billing Portal

Stripe provides a hosted billing portal:
- Update payment methods
- View invoices
- Cancel subscriptions
- Update billing address

No need to build custom billing UI.

### 5. Webhook-Based Sync

Stripe webhooks sync subscription state:
- `checkout.session.completed` - New subscription
- `customer.subscription.updated` - Plan changes, renewals
- `customer.subscription.deleted` - Cancellations
- `invoice.paid` - Successful payments
- `invoice.payment_failed` - Failed payments

This keeps our database in sync with Stripe's source of truth.

### 6. Developer Experience

Stripe provides excellent DX:
- TypeScript SDK
- Comprehensive documentation
- Test mode for development
- Webhook testing tools (Stripe CLI)
- Dashboard for debugging

```typescript
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const session = await stripe.checkout.sessions.create({
  // Type-safe API
})
```

### 7. Enterprise Features

Stripe supports enterprise needs:
- Custom pricing (contact sales)
- Volume discounts
- Annual invoicing
- Multi-currency
- Tax calculation (Stripe Tax)

### 8. Compliance

Stripe handles compliance:
- PCI DSS Level 1 (we never touch card data)
- GDPR compliance
- SCA (Strong Customer Authentication) for EU
- Tax collection (Stripe Tax)

### 9. Cost-Effective

Stripe's pricing is transparent:
- 2.9% + $0.30 per transaction (standard)
- No monthly fees
- No setup fees
- Volume discounts available

Building custom billing would require:
- Payment processor integration
- PCI compliance
- Subscription logic
- Invoice generation
- Dunning management

## Consequences

### Positive

- **Fast Development**: Billing ready in days, not months
- **Payment Methods**: Support for cards, ACH, SEPA, etc.
- **Compliance**: PCI compliance handled
- **Scalability**: Stripe handles scale automatically
- **Maintenance**: No billing code to maintain
- **Enterprise Ready**: Supports enterprise billing needs

### Negative

- **Vendor Lock-In**: Tied to Stripe's API
- **Transaction Fees**: 2.9% + $0.30 per transaction
- **Dependency**: External service dependency
- **Customization Limits**: Some flows are Stripe-controlled

## Alternatives Considered

### Custom Billing

**Pros:**
- Full control
- No transaction fees
- No vendor lock-in

**Cons:**
- Months of development
- PCI compliance required
- Payment processor integration needed
- Subscription logic to build
- Invoice generation
- Dunning management
- Security risks

**Rejected:** Development time and compliance requirements outweigh benefits.

### Paddle

**Pros:**
- Handles tax/VAT automatically
- Merchant of record (simpler compliance)
- Good for SaaS

**Cons:**
- More expensive (5% + $0.50)
- Less flexible than Stripe
- Smaller ecosystem

**Rejected:** Higher fees and less flexibility than Stripe.

### Chargebee

**Pros:**
- Subscription management focus
- Good for complex pricing

**Cons:**
- More expensive (starts at $99/month)
- Requires Stripe/PayPal underneath
- More complex setup

**Rejected:** Adds cost and complexity without significant benefits.

### PayPal

**Pros:**
- Widely recognized
- Lower fees for some regions

**Cons:**
- Less developer-friendly API
- Weaker subscription features
- Poor B2B support
- Limited webhook reliability

**Rejected:** Weaker subscription management and B2B support.

## Implementation Details

### Architecture Pattern

1. **Stripe as Source of Truth**: Subscription state lives in Stripe
2. **Database Cache**: Webhooks sync to local database for quick access
3. **Webhook Handlers**: Idempotent handlers sync state changes
4. **Usage Tracking**: Track usage locally, report to Stripe at billing cycle

### Subscription Flow

```
User Clicks Upgrade → Create Checkout Session → Redirect to Stripe → 
Payment → Webhook → Update Database → Grant Access
```

### Usage-Based Billing Flow

```
Track Usage Locally → Aggregate Monthly → Report to Stripe → 
Stripe Bills → Webhook → Update Database
```

### Webhook Flow

```
Stripe Event → Webhook → Verify Signature → Handle Event → 
Update Database → Audit Log
```

## Migration Path

If we ever need to migrate away from Stripe:

1. Export subscription data from Stripe
2. Migrate to new payment processor
3. Update webhook handlers
4. Update checkout flows
5. Migrate payment methods

This is feasible but requires significant effort and may involve payment method re-collection.

## Best Practices

### 1. Always Verify Webhook Signatures

```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
)
```

### 2. Handle Idempotency

Stripe may retry webhooks. Ensure handlers are idempotent:

```typescript
if (processedEvents.has(event.id)) {
  return // Already processed
}
```

### 3. Sync from Stripe

Stripe is the source of truth. Always sync subscription state from Stripe, not the other way around.

### 4. Use Test Mode

Always test in Stripe test mode before going live:
- Test cards: `4242 4242 4242 4242`
- Test webhooks: Use Stripe CLI

## References

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Usage-Based Billing](https://stripe.com/docs/billing/subscriptions/usage-based)
