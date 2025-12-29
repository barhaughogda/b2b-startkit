import { superadminDb } from '@startkit/database'
import { 
  products, 
  productKeys, 
  productOrgs,
  customerProductOrgLinks,
  platformAuditLogs,
  type ProductEnv,
  type ProductStatus,
} from '@startkit/database/schema'
import { eq, desc, ilike, count, or } from 'drizzle-orm'
import { randomBytes, createHash } from 'crypto'
import bcrypt from 'bcryptjs'

/**
 * Product list item
 */
export interface ProductListItem {
  id: string
  name: string
  displayName: string
  description: string | null
  baseUrl: string
  env: ProductEnv
  status: ProductStatus
  createdAt: Date
  activeKeyCount: number
  orgCount: number
}

/**
 * Product detail with keys and stats
 */
export interface ProductDetail extends ProductListItem {
  keys: ProductKeyItem[]
}

/**
 * Product key item (without secret)
 */
export interface ProductKeyItem {
  id: string
  kid: string
  label: string | null
  isActive: boolean
  createdAt: Date
  lastUsedAt: Date | null
  expiresAt: Date | null
  revokedAt: Date | null
}

/**
 * Search parameters for products list
 */
export interface ProductSearchParams {
  search?: string
  env?: string
  status?: string
  page?: number
  limit?: number
}

/**
 * Get paginated list of products
 */
export async function getProducts(params: ProductSearchParams = {}) {
  const { search, env, status, page = 1, limit = 20 } = params
  const offset = (page - 1) * limit

  // Build base query
  let query = superadminDb
    .select({
      id: products.id,
      name: products.name,
      displayName: products.displayName,
      description: products.description,
      baseUrl: products.baseUrl,
      env: products.env,
      status: products.status,
      createdAt: products.createdAt,
    })
    .from(products)
    .$dynamic()

  // Apply search filter
  if (search) {
    query = query.where(
      or(
        ilike(products.name, `%${search}%`),
        ilike(products.displayName, `%${search}%`)
      )
    )
  }

  // Apply env filter
  if (env && env !== 'all') {
    query = query.where(eq(products.env, env as ProductEnv))
  }

  // Apply status filter
  if (status && status !== 'all') {
    query = query.where(eq(products.status, status as ProductStatus))
  }

  // Get total count
  const countResult = await superadminDb
    .select({ count: count() })
    .from(products)

  // Execute query with pagination
  const productsResult = await query
    .orderBy(desc(products.createdAt))
    .limit(limit)
    .offset(offset)

  // Get active key counts per product
  const productIds = productsResult.map((p) => p.id)
  const keyCounts = productIds.length > 0
    ? await Promise.all(
        productIds.map(async (productId) => {
          const [result] = await superadminDb
            .select({ count: count() })
            .from(productKeys)
            .where(eq(productKeys.productId, productId))
          return { productId, count: result?.count ?? 0 }
        })
      )
    : []

  // Get org counts per product
  const orgCounts = productIds.length > 0
    ? await Promise.all(
        productIds.map(async (productId) => {
          const [result] = await superadminDb
            .select({ count: count() })
            .from(productOrgs)
            .where(eq(productOrgs.productId, productId))
          return { productId, count: result?.count ?? 0 }
        })
      )
    : []

  const keyCountMap = new Map(keyCounts.map((k) => [k.productId, k.count]))
  const orgCountMap = new Map(orgCounts.map((o) => [o.productId, o.count]))

  const items: ProductListItem[] = productsResult.map((product) => ({
    ...product,
    activeKeyCount: keyCountMap.get(product.id) || 0,
    orgCount: orgCountMap.get(product.id) || 0,
  }))

  return {
    items,
    total: countResult[0]?.count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((countResult[0]?.count ?? 0) / limit),
  }
}

/**
 * Get product by ID with full details
 */
export async function getProductById(id: string): Promise<ProductDetail | null> {
  const [product] = await superadminDb
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1)

  if (!product) {
    return null
  }

  // Get keys
  const keysResult = await superadminDb
    .select({
      id: productKeys.id,
      kid: productKeys.kid,
      label: productKeys.label,
      isActive: productKeys.isActive,
      createdAt: productKeys.createdAt,
      lastUsedAt: productKeys.lastUsedAt,
      expiresAt: productKeys.expiresAt,
      revokedAt: productKeys.revokedAt,
    })
    .from(productKeys)
    .where(eq(productKeys.productId, id))
    .orderBy(desc(productKeys.createdAt))

  // Get org count
  const [orgCountResult] = await superadminDb
    .select({ count: count() })
    .from(productOrgs)
    .where(eq(productOrgs.productId, id))

  // Get active key count
  const activeKeys = keysResult.filter((k) => k.isActive && !k.revokedAt)

  return {
    id: product.id,
    name: product.name,
    displayName: product.displayName,
    description: product.description,
    baseUrl: product.baseUrl,
    env: product.env,
    status: product.status,
    createdAt: product.createdAt,
    activeKeyCount: activeKeys.length,
    orgCount: orgCountResult?.count ?? 0,
    keys: keysResult,
  }
}

/**
 * Create a new product
 */
export async function createProduct(data: {
  name: string
  displayName: string
  description?: string
  baseUrl: string
  env: ProductEnv
  actorUserId: string
  actorEmail: string
}) {
  const [product] = await superadminDb
    .insert(products)
    .values({
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      baseUrl: data.baseUrl,
      env: data.env,
      status: 'active',
    })
    .returning()

  if (!product) {
    throw new Error('Failed to create product')
  }

  // Log the action
  await superadminDb.insert(platformAuditLogs).values({
    actorUserId: data.actorUserId,
    actorEmail: data.actorEmail,
    action: 'product.created',
    resourceType: 'product',
    resourceId: product.id,
    productId: product.id,
    metadata: {
      name: data.name,
      displayName: data.displayName,
      baseUrl: data.baseUrl,
      env: data.env,
    },
  })

  return product
}

/**
 * Update a product
 */
export async function updateProduct(
  id: string,
  data: {
    displayName?: string
    description?: string
    baseUrl?: string
    env?: ProductEnv
    status?: ProductStatus
  },
  actor: { userId: string; email: string }
) {
  // Get current state for audit
  const [current] = await superadminDb
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1)

  if (!current) {
    throw new Error('Product not found')
  }

  const [updated] = await superadminDb
    .update(products)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning()

  // Log the action
  await superadminDb.insert(platformAuditLogs).values({
    actorUserId: actor.userId,
    actorEmail: actor.email,
    action: 'product.updated',
    resourceType: 'product',
    resourceId: id,
    productId: id,
    metadata: {
      before: {
        displayName: current.displayName,
        description: current.description,
        baseUrl: current.baseUrl,
        env: current.env,
        status: current.status,
      },
      after: data,
    },
  })

  return updated
}

/**
 * Generate a new signing key for a product
 * Returns the raw secret ONCE - it cannot be retrieved again
 */
export async function createProductKey(data: {
  productId: string
  label?: string
  expiresAt?: Date
  actorUserId: string
  actorEmail: string
}): Promise<{ key: ProductKeyItem; secret: string }> {
  // Generate key ID and secret
  // Using cpsk_ prefix (control plane signing key) to avoid secret scanner false positives
  const kid = `cpk_${randomBytes(8).toString('hex')}`
  const secret = `cpsk_${randomBytes(32).toString('hex')}`
  
  // Hash the secret for storage (for reference/display purposes)
  const secretHash = await bcrypt.hash(secret, 12)
  
  // Extract the signing key portion (the random bytes after cpsk_)
  // This is what products use to generate HMAC signatures
  const signingKey = secret.replace('cpsk_', '')

  const [key] = await superadminDb
    .insert(productKeys)
    .values({
      productId: data.productId,
      kid,
      label: data.label,
      secretHash,
      signingKey,  // Store the raw signing key for HMAC verification
      expiresAt: data.expiresAt,
      createdBy: data.actorUserId,
    })
    .returning({
      id: productKeys.id,
      kid: productKeys.kid,
      label: productKeys.label,
      isActive: productKeys.isActive,
      createdAt: productKeys.createdAt,
      lastUsedAt: productKeys.lastUsedAt,
      expiresAt: productKeys.expiresAt,
      revokedAt: productKeys.revokedAt,
    })

  if (!key) {
    throw new Error('Failed to create product key')
  }

  // Log the action
  await superadminDb.insert(platformAuditLogs).values({
    actorUserId: data.actorUserId,
    actorEmail: data.actorEmail,
    action: 'product_key.created',
    resourceType: 'product_key',
    resourceId: key.id,
    productId: data.productId,
    metadata: {
      kid,
      label: data.label,
      expiresAt: data.expiresAt?.toISOString(),
    },
  })

  return { key, secret }
}

/**
 * Revoke a signing key
 */
export async function revokeProductKey(
  keyId: string,
  actor: { userId: string; email: string }
) {
  const [key] = await superadminDb
    .select()
    .from(productKeys)
    .where(eq(productKeys.id, keyId))
    .limit(1)

  if (!key) {
    throw new Error('Key not found')
  }

  await superadminDb
    .update(productKeys)
    .set({
      isActive: false,
      revokedAt: new Date(),
      revokedBy: actor.userId,
    })
    .where(eq(productKeys.id, keyId))

  // Log the action
  await superadminDb.insert(platformAuditLogs).values({
    actorUserId: actor.userId,
    actorEmail: actor.email,
    action: 'product_key.revoked',
    resourceType: 'product_key',
    resourceId: keyId,
    productId: key.productId,
    metadata: {
      kid: key.kid,
      label: key.label,
    },
  })
}

/**
 * Verify a signing key secret
 */
export async function verifyProductKeySecret(
  kid: string,
  secret: string
): Promise<{ valid: boolean; productId?: string }> {
  const [key] = await superadminDb
    .select()
    .from(productKeys)
    .where(eq(productKeys.kid, kid))
    .limit(1)

  if (!key || !key.isActive || key.revokedAt) {
    return { valid: false }
  }

  // Check expiration
  if (key.expiresAt && key.expiresAt < new Date()) {
    return { valid: false }
  }

  // Verify secret
  const isValid = await bcrypt.compare(secret, key.secretHash)

  if (isValid) {
    // Update last used timestamp
    await superadminDb
      .update(productKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(productKeys.id, key.id))
  }

  return { valid: isValid, productId: isValid ? key.productId : undefined }
}
