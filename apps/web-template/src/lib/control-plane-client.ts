import { createHmac, randomUUID } from 'crypto'

/**
 * Control Plane Client
 * 
 * Sends events from this product to the platform control plane.
 * 
 * Configuration via environment variables:
 * - CONTROL_PLANE_URL: Base URL of the control plane (e.g., https://admin.example.com)
 * - CONTROL_PLANE_KID: Product key ID
 * - CONTROL_PLANE_SECRET: Product signing secret
 * 
 * @ai-context This is the product-side client for control plane communication
 */

interface ControlPlaneConfig {
  url: string
  kid: string
  secret: string
}

// Cache the config check to avoid repeated warnings
let configChecked = false
let cachedConfig: ControlPlaneConfig | null = null

function getConfig(): ControlPlaneConfig | null {
  // Return cached result after first check
  if (configChecked) {
    return cachedConfig
  }

  const url = process.env.CONTROL_PLANE_URL
  const kid = process.env.CONTROL_PLANE_KID
  const secret = process.env.CONTROL_PLANE_SECRET

  configChecked = true

  if (!url || !kid || !secret) {
    // Only log once, at debug level (not a warning - this is expected in standalone mode)
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Control Plane] Not configured - running in standalone mode')
    }
    cachedConfig = null
    return null
  }

  cachedConfig = { url, kid, secret }
  return cachedConfig
}

/**
 * Check if control plane integration is configured
 */
export function isControlPlaneConfigured(): boolean {
  return getConfig() !== null
}

/**
 * Generate HMAC signature for control plane requests
 */
function generateSignature(secret: string, body: string): { signature: string; timestamp: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const payload = `${timestamp}.${body}`
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return { signature, timestamp }
}

/**
 * Send an event to the control plane
 * 
 * This is fire-and-forget by design - it should never block or fail
 * the calling code even if the control plane is unavailable.
 */
async function sendEvent(eventType: string, data: Record<string, unknown>): Promise<boolean> {
  const config = getConfig()
  if (!config) {
    // Control plane not configured - skip silently (standalone mode)
    return false
  }

  const event = {
    eventId: randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    data,
  }

  const body = JSON.stringify(event)
  const { signature, timestamp } = generateSignature(config.secret, body)

  try {
    const response = await fetch(`${config.url}/api/control-plane/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Product-Kid': config.kid,
        'X-Product-Signature': signature,
        'X-Product-Timestamp': timestamp,
      },
      body,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('Control plane event failed:', response.status, error)
      return false
    }

    const result = await response.json()
    console.debug('Control plane event sent:', result)
    return true
  } catch (error) {
    console.error('Failed to send control plane event:', error)
    return false
  }
}

// ============================================================================
// Event emitters
// ============================================================================

/**
 * Emit organization created event
 */
export async function emitOrgCreated(data: {
  externalOrgId: string    // Clerk org ID
  externalDbId?: string    // Our DB organization ID
  name: string
  slug?: string
  domain?: string
}): Promise<boolean> {
  return sendEvent('product.org.created', data)
}

/**
 * Emit organization updated event
 */
export async function emitOrgUpdated(data: {
  externalOrgId: string
  externalDbId?: string
  name?: string
  slug?: string
  domain?: string
  status?: string
}): Promise<boolean> {
  return sendEvent('product.org.updated', data)
}

/**
 * Emit usage report event (for billing)
 */
export async function emitUsageReport(data: {
  externalOrgId: string
  metric: string
  value: number
  periodStart: string  // ISO 8601
  periodEnd: string    // ISO 8601
}): Promise<boolean> {
  return sendEvent('product.usage.reported', data)
}

/**
 * Emit subscription created event
 * Call this when a new subscription is created in Stripe
 */
export async function emitSubscriptionCreated(data: {
  stripeSubscriptionId: string
  stripeCustomerId: string
  externalOrgId: string          // Product's Clerk org ID (from Stripe metadata)
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused'
  priceId: string
  productName?: string           // Human-readable plan name
  amount: string                 // In cents
  currency: string
  interval: 'month' | 'year'
  currentPeriodStart?: string    // ISO 8601
  currentPeriodEnd?: string      // ISO 8601
  trialStart?: string            // ISO 8601
  trialEnd?: string              // ISO 8601
  stripeEventId?: string         // Stripe event ID for idempotency
}): Promise<boolean> {
  return sendEvent('product.subscription.created', data)
}

/**
 * Emit subscription updated event
 * Call this when a subscription status or details change
 */
export async function emitSubscriptionUpdated(data: {
  stripeSubscriptionId: string
  stripeCustomerId?: string
  externalOrgId?: string
  status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused'
  priceId?: string
  productName?: string
  amount?: string
  currency?: string
  interval?: 'month' | 'year'
  currentPeriodStart?: string
  currentPeriodEnd?: string
  cancelAt?: string | null
  canceledAt?: string | null
  stripeEventId?: string
}): Promise<boolean> {
  return sendEvent('product.subscription.updated', data)
}

/**
 * Emit subscription deleted event
 * Call this when a subscription is fully canceled/deleted in Stripe
 */
export async function emitSubscriptionDeleted(data: {
  stripeSubscriptionId: string
  stripeEventId?: string
}): Promise<boolean> {
  return sendEvent('product.subscription.deleted', data)
}

/**
 * Emit invoice paid event
 * Call this when an invoice is successfully paid
 */
export async function emitInvoicePaid(data: {
  stripeSubscriptionId?: string
  stripeCustomerId: string
  amount: string                 // In cents
  currency: string
  stripeEventId?: string
}): Promise<boolean> {
  return sendEvent('product.invoice.paid', data)
}
