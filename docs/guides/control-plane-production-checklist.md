# Control Plane Integration Guide

This guide explains how to complete the control plane integration in the B2B StartKit framework.

> **Note:** This is for the **framework itself**, not for deployed products. The goal is to prepare `web-template` so that new products created from it automatically have control plane integration built-in.

## Overview

| Step | Description | Who | Status |
|------|-------------|-----|--------|
| 1 | Add control plane env vars to web-template | 🤖 AI | ✅ Done |
| 2 | Add webhook hooks to web-template | 🤖 AI | ✅ Done |
| 3 | Update "Creating New Product" guide | 🤖 AI | ✅ Done |
| 4 | Consider KMS encryption (future) | 👤 Manual | Optional |

---

## Step 1: Add Control Plane Environment Variables to Web Template ✅

### What Was Done

- [x] Added control plane variables to `apps/web-template/env.template`
- [x] Updated the control plane client to handle missing config gracefully (no warnings in standalone mode)
- [x] Added `isControlPlaneConfigured()` helper function

### How It Will Work

When a new product is created from the template:
1. The `.env.example` will include control plane variables (commented out)
2. The control plane client will silently skip if not configured
3. When the product operator deploys, they configure:
   - Register product in superadmin
   - Generate signing key
   - Add credentials to environment

### Environment Variables (Template)

```env
# Control Plane Integration (Optional)
# Configure these to sync data with the platform control plane
# CONTROL_PLANE_URL=https://admin.yourdomain.com
# CONTROL_PLANE_KID=sk_xxxxxxxx
# CONTROL_PLANE_SECRET=cpsk_your_signing_secret_here
```

---

## Step 2: Add Webhook Hooks to Web Template ✅

### What Was Done

- [x] Updated Clerk webhook handler to emit `org.created` and `org.updated` events
- [x] Updated Stripe webhook handler to emit subscription and invoice events
- [x] All events are fire-and-forget (don't block webhook response)

### How It Will Work

The webhook handlers in `apps/web-template` will be updated to:
1. Check if control plane is configured
2. If yes, emit events (non-blocking)
3. If no, skip silently

New products created from the template will inherit this behavior automatically.

### Code Changes (Preview)

#### Clerk Webhook (`apps/web-template/src/app/api/webhooks/clerk/route.ts`)

```typescript
import { emitOrgCreated, emitOrgUpdated } from '@/lib/control-plane-client'

// In organization.created handler:
// Fire-and-forget - don't await, don't block
emitOrgCreated({
  externalOrgId: organization.id,
  externalDbId: dbOrg.id,
  name: organization.name,
  slug: organization.slug,
}).catch(err => console.warn('Control plane sync failed:', err.message))
```

#### Stripe Webhook (`apps/web-template/src/app/api/webhooks/stripe/route.ts`)

```typescript
import { emitSubscriptionCreated, emitInvoicePaid } from '@/lib/control-plane-client'

// In customer.subscription.created handler:
emitSubscriptionCreated({
  stripeSubscriptionId: subscription.id,
  stripeCustomerId: subscription.customer as string,
  externalOrgId: subscription.metadata?.organizationId,
  status: subscription.status,
  // ... other fields
}).catch(err => console.warn('Control plane sync failed:', err.message))
```

---

## Step 3: Update "Creating New Product" Guide ✅

### What Was Done

- [x] Added "Control Plane Integration (Optional)" section to `docs/guides/creating-new-product.md`
- [x] Documented the registration flow with step-by-step instructions
- [x] Added table of automatically synced events
- [x] Explained standalone mode (graceful skip when not configured)
- [x] Updated "Related Documentation" with control plane links

---

## Step 4: KMS Encryption for Signing Keys (Future/Optional)

### Why?
Currently, `signingKey` is stored in plain text in the database. For production security at scale, consider encrypting it at rest using a Key Management Service (KMS).

### Priority
**Low** - This is a nice-to-have for production hardening. The current implementation is secure for most use cases since:
- The database itself should be encrypted at rest (Supabase default)
- Access is restricted to superadmin-only operations
- Keys can be rotated easily

### What AI Can Do (When Needed)

- [ ] Design the encryption/decryption abstraction layer
- [ ] Implement envelope encryption pattern
- [ ] Update key creation and verification to use encryption

**Request:** Say "add KMS encryption" when ready to implement.

### KMS Options

| Provider | Best For | Cost |
|----------|----------|------|
| AWS KMS | AWS infrastructure | ~$1/month + $0.03/10k requests |
| Supabase Vault | Supabase users | Included in Pro plan |
| Google Cloud KMS | GCP infrastructure | ~$0.06/10k operations |
| HashiCorp Vault | Self-hosted | Infrastructure only |

---

## Quick Start Commands

All core integration steps are complete! The only optional step remaining:

| Command | What It Does |
|---------|--------------|
| `add KMS encryption` | Implement signing key encryption (optional, future) |

### Completed Steps
- ✅ Control plane env vars added to `apps/web-template/env.template`
- ✅ Webhook hooks added to Clerk and Stripe handlers
- ✅ "Creating New Product" guide updated with control plane section

---

## Framework Testing Checklist

Test the control plane integration in the framework itself:

### Superadmin Dashboard
- [ ] Can register a test product at `/products`
- [ ] Can generate signing keys for products
- [ ] Keys show "never used" until events are received
- [ ] Can create customers at `/customers`
- [ ] Can link product orgs to customers
- [ ] Billing dashboard shows at `/billing` (empty state is OK)

### Web Template Integration
- [ ] `control-plane-client.ts` exists in web-template
- [ ] Client gracefully handles missing config (no errors)
- [ ] Webhook handlers include control plane event emission (fire-and-forget)
- [ ] `.env.example` includes control plane variables (commented out)

### Documentation
- [ ] `control-plane-integration.md` guide is complete
- [ ] `creating-new-product.md` includes control plane setup section
- [ ] This checklist is accurate for framework context

---

## Troubleshooting (For Future Products)

### Events not appearing in control plane

1. Check environment variables are set:
   ```bash
   echo $CONTROL_PLANE_URL
   echo $CONTROL_PLANE_KID
   ```

2. Check server logs for signature verification errors

3. Verify the timestamp is within 5 minutes of server time

### Signature verification failing

1. Ensure you're using a freshly generated key
2. Verify the secret hasn't been truncated when copying
3. Check that `CONTROL_PLANE_SECRET` includes the correct prefix

### Products not showing in control plane

1. Verify the product was registered in `/products`
2. Check that the product status is "active"
3. Ensure the base URL is correct

---

## Architecture Reference

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          B2B StartKit Framework                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  apps/superadmin/           ← Control Plane (platform management)        │
│  apps/web-template/         ← Product template (copied for new products) │
│  packages/database/         ← Shared schema (includes control-plane.ts)  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ When deployed...
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Production Deployment                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  admin.yourdomain.com       ← Control Plane instance                     │
│  product-a.yourdomain.com   ← Product A (from web-template)              │
│  product-b.yourdomain.com   ← Product B (from web-template)              │
│                                                                          │
│  Each product syncs events → Control Plane aggregates                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```
