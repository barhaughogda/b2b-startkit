import type Stripe from 'stripe'
import { getStripe } from './stripe'
import type { WebhookEvent } from './types'

/**
 * Verify Stripe webhook signature
 *
 * @ai-no-modify Signature verification is critical for security.
 * Never skip this step.
 */
export function verifyStripeSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  const stripe = getStripe()

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${(err as Error).message}`)
  }
}

/**
 * Handle Stripe webhook events
 *
 * @example
 * // In your API route
 * const result = await handleStripeWebhook(event)
 * if (!result.processed) {
 *   console.error('Webhook error:', result.error)
 * }
 *
 * @ai-no-modify Webhook handlers are critical for billing integrity.
 */
export async function handleStripeWebhook(event: Stripe.Event): Promise<WebhookEvent> {
  const result: WebhookEvent = {
    type: event.type,
    stripeEvent: event,
    processed: false,
  }

  try {
    switch (event.type) {
      // Checkout completed - new subscription
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      // Subscription lifecycle events
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      // Payment events
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      // Customer events
      case 'customer.deleted':
        await handleCustomerDeleted(event.data.object as Stripe.Customer)
        break

      default:
        // Log unhandled events but don't fail
        console.log(`Unhandled Stripe event: ${event.type}`)
    }

    result.processed = true
  } catch (error) {
    result.error = (error as Error).message
    console.error(`Error processing webhook ${event.type}:`, error)
  }

  return result
}

/**
 * Handle checkout.session.completed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const organizationId = session.metadata?.organizationId
  if (!organizationId) {
    throw new Error('Missing organizationId in checkout session metadata')
  }

  // TODO: Create/update subscription in database
  // const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
  // await db.insert(subscriptions).values({
  //   organizationId,
  //   stripeCustomerId: session.customer as string,
  //   stripeSubscriptionId: session.subscription as string,
  //   status: 'active',
  // })

  console.log(`Checkout completed for org ${organizationId}`)
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const organizationId = subscription.metadata?.organizationId
  if (!organizationId) {
    // Try to find by customer ID
    console.warn('Missing organizationId in subscription metadata')
    return
  }

  // TODO: Update subscription in database
  // await db.update(subscriptions)
  //   .set({
  //     status: mapStripeStatus(subscription.status),
  //     currentPeriodStart: new Date(subscription.current_period_start * 1000),
  //     currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  //     cancelAtPeriodEnd: subscription.cancel_at_period_end,
  //   })
  //   .where(eq(subscriptions.stripeSubscriptionId, subscription.id))

  console.log(`Subscription updated: ${subscription.id}`)
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  // TODO: Update subscription status to canceled
  // await db.update(subscriptions)
  //   .set({ status: 'canceled' })
  //   .where(eq(subscriptions.stripeSubscriptionId, subscription.id))

  console.log(`Subscription deleted: ${subscription.id}`)
}

/**
 * Handle successful payment
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  // TODO: Record payment, update status if needed
  console.log(`Invoice paid: ${invoice.id}`)
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  // TODO: Update subscription status to past_due, notify user
  console.log(`Payment failed: ${invoice.id}`)
}

/**
 * Handle customer deletion
 */
async function handleCustomerDeleted(customer: Stripe.Customer): Promise<void> {
  // TODO: Handle customer deletion (rare case)
  console.log(`Customer deleted: ${customer.id}`)
}
