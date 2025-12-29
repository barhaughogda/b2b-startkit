import { headers } from 'next/headers'
import type Stripe from 'stripe'
import { handleStripeWebhook, verifyStripeSignature } from '@startkit/billing/webhooks'
import {
  emitSubscriptionCreated,
  emitSubscriptionUpdated,
  emitSubscriptionDeleted,
  emitInvoicePaid,
} from '@/lib/control-plane-client'

/**
 * Stripe webhook handler
 *
 * Syncs subscription and payment data from Stripe to our database.
 * Control plane events are emitted fire-and-forget style after successful
 * database sync - they don't block the webhook response.
 *
 * @ai-no-modify Webhook handlers are critical for billing.
 */
export async function POST(req: Request) {
  const body = await req.text()
  const headerPayload = await headers()
  const signature = headerPayload.get('stripe-signature')

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  try {
    // Verify signature and parse event
    const event = verifyStripeSignature(body, signature, webhookSecret)

    // Handle the event (database sync)
    const result = await handleStripeWebhook(event)

    if (!result.processed) {
      console.error('Stripe webhook processing error:', result.error)
      // Return 200 anyway to prevent Stripe from retrying
      // Log the error for manual investigation
    } else {
      // Fire-and-forget: emit to control plane on successful processing
      emitControlPlaneEvent(event)
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Stripe webhook error:', err)
    return new Response('Webhook error', { status: 400 })
  }
}

/**
 * Emit control plane events based on Stripe event type
 * All calls are fire-and-forget - errors are logged but don't affect the response
 */
function emitControlPlaneEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0]?.price.id
      const price = sub.items.data[0]?.price
      
      emitSubscriptionCreated({
        stripeSubscriptionId: sub.id,
        stripeCustomerId: sub.customer as string,
        externalOrgId: sub.metadata?.organizationId ?? '',
        status: sub.status as 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused',
        priceId: priceId ?? '',
        productName: price?.nickname ?? undefined,
        amount: String(price?.unit_amount ?? 0),
        currency: price?.currency ?? 'usd',
        interval: (price?.recurring?.interval ?? 'month') as 'month' | 'year',
        currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        trialStart: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : undefined,
        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : undefined,
        stripeEventId: event.id,
      }).catch((err) => console.warn('[Control Plane] Failed to emit subscription.created:', err.message))
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0]?.price.id
      const price = sub.items.data[0]?.price
      
      emitSubscriptionUpdated({
        stripeSubscriptionId: sub.id,
        stripeCustomerId: sub.customer as string,
        externalOrgId: sub.metadata?.organizationId,
        status: sub.status as 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused',
        priceId: priceId,
        productName: price?.nickname ?? undefined,
        amount: price?.unit_amount ? String(price.unit_amount) : undefined,
        currency: price?.currency,
        interval: price?.recurring?.interval as 'month' | 'year' | undefined,
        currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        stripeEventId: event.id,
      }).catch((err) => console.warn('[Control Plane] Failed to emit subscription.updated:', err.message))
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      
      emitSubscriptionDeleted({
        stripeSubscriptionId: sub.id,
        stripeEventId: event.id,
      }).catch((err) => console.warn('[Control Plane] Failed to emit subscription.deleted:', err.message))
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      
      emitInvoicePaid({
        stripeSubscriptionId: invoice.subscription as string | undefined,
        stripeCustomerId: invoice.customer as string,
        amount: String(invoice.amount_paid),
        currency: invoice.currency,
        stripeEventId: event.id,
      }).catch((err) => console.warn('[Control Plane] Failed to emit invoice.paid:', err.message))
      break
    }

    // Other events (invoice.payment_failed, customer.deleted, etc.) are handled
    // in the database but not forwarded to control plane - the local subscription
    // status is authoritative
  }
}
