import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyStripeSignature, handleStripeWebhook } from '@startkit/billing';

/**
 * Stripe Webhook Route for Zenthea
 *
 * Handles subscription lifecycle events, payments, and customer updates.
 * PHI Boundary: No PHI is stored in Stripe or processed in this webhook.
 * All data is isolated by organizationId in metadata.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return new NextResponse('Missing signature or webhook secret', { status: 400 });
  }

  try {
    // 1. Verify the event came from Stripe
    const event = verifyStripeSignature(body, signature, webhookSecret);

    // 2. Process the event using the shared billing package
    // The shared handler updates the 'subscriptions' table and logs audit events
    const result = await handleStripeWebhook(event);

    if (!result.processed) {
      console.warn(`[Stripe Webhook] Event ${event.type} not processed: ${result.error}`);
      // We still return 200 to Stripe to avoid retries for unhandled events
      return NextResponse.json({ received: true, error: result.error });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[Stripe Webhook] Error:`, error);
    return new NextResponse(
      `Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 400 }
    );
  }
}

export const dynamic = 'force-dynamic';
