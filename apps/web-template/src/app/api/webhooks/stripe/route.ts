import { headers } from 'next/headers'
import { handleStripeWebhook, verifyStripeSignature } from '@startkit/billing/webhooks'

/**
 * Stripe webhook handler
 *
 * Syncs subscription and payment data from Stripe to our database.
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

    // Handle the event
    const result = await handleStripeWebhook(event)

    if (!result.processed) {
      console.error('Stripe webhook processing error:', result.error)
      // Return 200 anyway to prevent Stripe from retrying
      // Log the error for manual investigation
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Stripe webhook error:', err)
    return new Response('Webhook error', { status: 400 })
  }
}
