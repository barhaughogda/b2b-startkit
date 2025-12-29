import { createHmac, timingSafeEqual } from 'crypto'
import { superadminDb } from '@startkit/database'
import { productKeys, products } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'

/**
 * Event signature verification result
 */
export interface SignatureVerificationResult {
  valid: boolean
  productId?: string
  productName?: string
  error?: string
}

/**
 * Verify HMAC signature for incoming events
 * 
 * Expected headers:
 * - X-Product-Kid: Key ID (kid)
 * - X-Product-Signature: HMAC-SHA256 signature of the request body
 * - X-Product-Timestamp: Unix timestamp (for replay protection)
 * 
 * Signature computation:
 * signature = HMAC-SHA256(secret, timestamp + "." + body)
 * 
 * Where `secret` is the full secret string (e.g., "cpsk_abc123...")
 * 
 * @ai-no-modify Event signature verification is critical for security
 */
export async function verifyEventSignature(
  headers: Headers,
  body: string
): Promise<SignatureVerificationResult> {
  const kid = headers.get('X-Product-Kid')
  const signature = headers.get('X-Product-Signature')
  const timestamp = headers.get('X-Product-Timestamp')

  if (!kid || !signature || !timestamp) {
    return { valid: false, error: 'Missing required headers (X-Product-Kid, X-Product-Signature, X-Product-Timestamp)' }
  }

  // Check timestamp for replay protection (allow 5 minutes)
  const eventTime = parseInt(timestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  const timeDiff = Math.abs(now - eventTime)

  if (timeDiff > 300) {
    return { valid: false, error: 'Timestamp too old or too far in the future' }
  }

  // Look up the key
  const [key] = await superadminDb
    .select({
      id: productKeys.id,
      productId: productKeys.productId,
      signingKey: productKeys.signingKey,
      isActive: productKeys.isActive,
      revokedAt: productKeys.revokedAt,
      expiresAt: productKeys.expiresAt,
    })
    .from(productKeys)
    .where(eq(productKeys.kid, kid))
    .limit(1)

  if (!key) {
    return { valid: false, error: 'Invalid key ID' }
  }

  if (!key.isActive || key.revokedAt) {
    return { valid: false, error: 'Key has been revoked' }
  }

  if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
    return { valid: false, error: 'Key has expired' }
  }

  // Get the product
  const [product] = await superadminDb
    .select({ id: products.id, name: products.name, status: products.status })
    .from(products)
    .where(eq(products.id, key.productId))
    .limit(1)

  if (!product || product.status !== 'active') {
    return { valid: false, error: 'Product not found or inactive' }
  }

  // Verify HMAC signature
  // The full secret is: cpsk_ + signingKey
  const fullSecret = `cpsk_${key.signingKey}`
  const payload = `${timestamp}.${body}`
  const expectedSignature = createHmac('sha256', fullSecret)
    .update(payload)
    .digest('hex')

  // Timing-safe comparison to prevent timing attacks
  let isValid = false
  try {
    const signatureBuffer = Buffer.from(signature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    
    if (signatureBuffer.length === expectedBuffer.length) {
      isValid = timingSafeEqual(signatureBuffer, expectedBuffer)
    }
  } catch {
    // Invalid hex encoding
    return { valid: false, error: 'Invalid signature format' }
  }

  if (!isValid) {
    return { valid: false, error: 'Invalid signature' }
  }

  // Update last used timestamp
  await superadminDb
    .update(productKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(productKeys.id, key.id))

  return {
    valid: true,
    productId: product.id,
    productName: product.name,
  }
}

/**
 * Generate HMAC signature for outgoing requests (control plane -> product)
 * Used when calling product admin APIs
 */
export function generateSignature(secret: string, body: string): { signature: string; timestamp: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const payload = `${timestamp}.${body}`
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return { signature, timestamp }
}
