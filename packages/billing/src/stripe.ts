import Stripe from 'stripe'

/**
 * Stripe client singleton
 *
 * @ai-no-modify Stripe client configuration is critical
 */
let stripeInstance: Stripe | null = null

/**
 * Get or create the Stripe client
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
      // Telemetry is opt-in
      telemetry: false,
    })
  }

  return stripeInstance
}

/**
 * Stripe client for direct access
 */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe]
  },
})
