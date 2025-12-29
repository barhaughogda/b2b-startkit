import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { superadminDb } from '@startkit/database'
import { 
  productOrgs, 
  platformAuditLogs,
  productSubscriptions,
  billingEvents,
  customerProductOrgLinks,
} from '@startkit/database/schema'
import { eq, and } from 'drizzle-orm'
import { verifyEventSignature } from '@/lib/event-signature'

/**
 * Event schemas
 */
const baseEventSchema = z.object({
  eventId: z.string().uuid(),  // Idempotency key
  eventType: z.string(),
  timestamp: z.string().datetime(),
})

const orgCreatedEventSchema = baseEventSchema.extend({
  eventType: z.literal('product.org.created'),
  data: z.object({
    externalOrgId: z.string(),      // Clerk org ID in the product
    externalDbId: z.string().optional(), // Product DB organization ID
    name: z.string(),
    slug: z.string().optional(),
    domain: z.string().optional(),
  }),
})

const orgUpdatedEventSchema = baseEventSchema.extend({
  eventType: z.literal('product.org.updated'),
  data: z.object({
    externalOrgId: z.string(),
    externalDbId: z.string().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    domain: z.string().optional(),
    status: z.string().optional(),
  }),
})

const subscriptionCreatedEventSchema = baseEventSchema.extend({
  eventType: z.literal('product.subscription.created'),
  data: z.object({
    stripeSubscriptionId: z.string(),
    stripeCustomerId: z.string(),
    externalOrgId: z.string(),               // Product's Clerk org ID (from Stripe metadata)
    status: z.enum(['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused']),
    priceId: z.string(),
    productName: z.string().optional(),      // Human-readable plan name
    amount: z.string(),                       // In cents
    currency: z.string(),
    interval: z.enum(['month', 'year']),
    currentPeriodStart: z.string().optional(),
    currentPeriodEnd: z.string().optional(),
    trialStart: z.string().optional(),
    trialEnd: z.string().optional(),
    stripeEventId: z.string().optional(),    // Stripe event ID
  }),
})

const subscriptionUpdatedEventSchema = baseEventSchema.extend({
  eventType: z.literal('product.subscription.updated'),
  data: z.object({
    stripeSubscriptionId: z.string(),
    stripeCustomerId: z.string().optional(),
    externalOrgId: z.string().optional(),
    status: z.enum(['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused']).optional(),
    priceId: z.string().optional(),
    productName: z.string().optional(),
    amount: z.string().optional(),
    currency: z.string().optional(),
    interval: z.enum(['month', 'year']).optional(),
    currentPeriodStart: z.string().optional(),
    currentPeriodEnd: z.string().optional(),
    cancelAt: z.string().nullable().optional(),
    canceledAt: z.string().nullable().optional(),
    stripeEventId: z.string().optional(),
  }),
})

const subscriptionDeletedEventSchema = baseEventSchema.extend({
  eventType: z.literal('product.subscription.deleted'),
  data: z.object({
    stripeSubscriptionId: z.string(),
    stripeEventId: z.string().optional(),
  }),
})

const invoicePaidEventSchema = baseEventSchema.extend({
  eventType: z.literal('product.invoice.paid'),
  data: z.object({
    stripeSubscriptionId: z.string().optional(),
    stripeCustomerId: z.string(),
    amount: z.string(),
    currency: z.string(),
    stripeEventId: z.string().optional(),
  }),
})

const eventSchema = z.discriminatedUnion('eventType', [
  orgCreatedEventSchema,
  orgUpdatedEventSchema,
  subscriptionCreatedEventSchema,
  subscriptionUpdatedEventSchema,
  subscriptionDeletedEventSchema,
  invoicePaidEventSchema,
])

type ProductEvent = z.infer<typeof eventSchema>

/**
 * Idempotency check - track processed events
 */
const processedEvents = new Map<string, Date>()

// Clean up old entries every hour (in production, use Redis or a DB table)
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  for (const [eventId, timestamp] of processedEvents) {
    if (timestamp < oneHourAgo) {
      processedEvents.delete(eventId)
    }
  }
}, 60 * 60 * 1000)

/**
 * POST /api/control-plane/events
 * 
 * Receive signed events from products.
 * 
 * Required headers:
 * - X-Product-Kid: Key ID
 * - X-Product-Signature: HMAC-SHA256 signature
 * - X-Product-Timestamp: Unix timestamp
 * 
 * Request body:
 * - eventId: UUID (idempotency key)
 * - eventType: Event type (e.g., 'product.org.created')
 * - timestamp: ISO 8601 timestamp
 * - data: Event-specific payload
 */
export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await req.text()

    // Verify signature
    const verification = await verifyEventSignature(req.headers, rawBody)
    if (!verification.valid) {
      console.error('Event signature verification failed:', verification.error)
      return NextResponse.json(
        { error: 'Unauthorized', details: verification.error },
        { status: 401 }
      )
    }

    // Parse body
    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Validate event schema
    const parsed = eventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid event format', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const event = parsed.data

    // Idempotency check
    if (processedEvents.has(event.eventId)) {
      // Already processed, return success (idempotent)
      return NextResponse.json({ 
        success: true, 
        message: 'Event already processed',
        eventId: event.eventId,
      })
    }

    // Process event
    await processEvent(event, verification.productId!, verification.productName!)

    // Mark as processed
    processedEvents.set(event.eventId, new Date())

    return NextResponse.json({
      success: true,
      eventId: event.eventId,
      eventType: event.eventType,
    })
  } catch (error) {
    console.error('Failed to process event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Process a validated event
 */
async function processEvent(
  event: ProductEvent,
  productId: string,
  productName: string
) {
  switch (event.eventType) {
    case 'product.org.created':
      await handleOrgCreated(event, productId, productName)
      break
    case 'product.org.updated':
      await handleOrgUpdated(event, productId, productName)
      break
    case 'product.subscription.created':
      await handleSubscriptionCreated(event, productId, productName)
      break
    case 'product.subscription.updated':
      await handleSubscriptionUpdated(event, productId, productName)
      break
    case 'product.subscription.deleted':
      await handleSubscriptionDeleted(event, productId, productName)
      break
    case 'product.invoice.paid':
      await handleInvoicePaid(event, productId, productName)
      break
    default:
      console.warn('Unknown event type:', (event as { eventType: string }).eventType)
  }
}

/**
 * Handle product.org.created event
 */
async function handleOrgCreated(
  event: z.infer<typeof orgCreatedEventSchema>,
  productId: string,
  productName: string
) {
  const { data } = event

  // Check if org already exists (upsert)
  const [existing] = await superadminDb
    .select({ id: productOrgs.id })
    .from(productOrgs)
    .where(
      and(
        eq(productOrgs.productId, productId),
        eq(productOrgs.externalOrgId, data.externalOrgId)
      )
    )
    .limit(1)

  if (existing) {
    // Update existing
    await superadminDb
      .update(productOrgs)
      .set({
        externalDbId: data.externalDbId,
        name: data.name,
        slug: data.slug,
        domain: data.domain,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(productOrgs.id, existing.id))
  } else {
    // Create new
    await superadminDb.insert(productOrgs).values({
      productId,
      externalOrgId: data.externalOrgId,
      externalDbId: data.externalDbId,
      name: data.name,
      slug: data.slug,
      domain: data.domain,
      status: 'active',
    })
  }

  // Log the event
  await superadminDb.insert(platformAuditLogs).values({
    action: 'product.org.synced',
    resourceType: 'product_org',
    resourceId: data.externalOrgId,
    productId,
    metadata: {
      eventId: event.eventId,
      eventType: event.eventType,
      productName,
      orgName: data.name,
      domain: data.domain,
    },
  })
}

/**
 * Handle product.org.updated event
 */
async function handleOrgUpdated(
  event: z.infer<typeof orgUpdatedEventSchema>,
  productId: string,
  productName: string
) {
  const { data } = event

  // Find existing org
  const [existing] = await superadminDb
    .select({ id: productOrgs.id })
    .from(productOrgs)
    .where(
      and(
        eq(productOrgs.productId, productId),
        eq(productOrgs.externalOrgId, data.externalOrgId)
      )
    )
    .limit(1)

  if (!existing) {
    // Org doesn't exist - might be a race condition, create it
    await superadminDb.insert(productOrgs).values({
      productId,
      externalOrgId: data.externalOrgId,
      externalDbId: data.externalDbId,
      name: data.name || 'Unknown',
      slug: data.slug,
      domain: data.domain,
      status: data.status || 'active',
    })
  } else {
    // Update existing
    const updates: Record<string, unknown> = {
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    }

    if (data.externalDbId !== undefined) updates.externalDbId = data.externalDbId
    if (data.name !== undefined) updates.name = data.name
    if (data.slug !== undefined) updates.slug = data.slug
    if (data.domain !== undefined) updates.domain = data.domain
    if (data.status !== undefined) updates.status = data.status

    await superadminDb
      .update(productOrgs)
      .set(updates)
      .where(eq(productOrgs.id, existing.id))
  }

  // Log the event
  await superadminDb.insert(platformAuditLogs).values({
    action: 'product.org.synced',
    resourceType: 'product_org',
    resourceId: data.externalOrgId,
    productId,
    metadata: {
      eventId: event.eventId,
      eventType: event.eventType,
      productName,
      updates: data,
    },
  })
}

/**
 * Handle product.subscription.created event
 */
async function handleSubscriptionCreated(
  event: z.infer<typeof subscriptionCreatedEventSchema>,
  productId: string,
  productName: string
) {
  const { data } = event

  // Find the product org if it exists
  let productOrgId: string | null = null
  let customerId: string | null = null

  if (data.externalOrgId) {
    const [productOrg] = await superadminDb
      .select({ 
        id: productOrgs.id,
      })
      .from(productOrgs)
      .where(
        and(
          eq(productOrgs.productId, productId),
          eq(productOrgs.externalOrgId, data.externalOrgId)
        )
      )
      .limit(1)

    if (productOrg) {
      productOrgId = productOrg.id

      // Check if this product org is linked to a customer
      const [link] = await superadminDb
        .select({ customerId: customerProductOrgLinks.customerId })
        .from(customerProductOrgLinks)
        .where(eq(customerProductOrgLinks.productOrgId, productOrg.id))
        .limit(1)

      if (link) {
        customerId = link.customerId
      }
    }
  }

  // Upsert subscription
  const [existing] = await superadminDb
    .select({ id: productSubscriptions.id })
    .from(productSubscriptions)
    .where(eq(productSubscriptions.stripeSubscriptionId, data.stripeSubscriptionId))
    .limit(1)

  if (existing) {
    await superadminDb
      .update(productSubscriptions)
      .set({
        stripeCustomerId: data.stripeCustomerId,
        productOrgId,
        customerId,
        status: data.status,
        priceId: data.priceId,
        productName: data.productName,
        amount: data.amount,
        currency: data.currency,
        interval: data.interval,
        currentPeriodStart: data.currentPeriodStart ? new Date(data.currentPeriodStart) : null,
        currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null,
        trialStart: data.trialStart ? new Date(data.trialStart) : null,
        trialEnd: data.trialEnd ? new Date(data.trialEnd) : null,
        externalOrgId: data.externalOrgId,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(productSubscriptions.id, existing.id))
  } else {
    await superadminDb.insert(productSubscriptions).values({
      productId,
      productOrgId,
      customerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      stripeCustomerId: data.stripeCustomerId,
      status: data.status,
      priceId: data.priceId,
      productName: data.productName,
      amount: data.amount,
      currency: data.currency,
      interval: data.interval,
      currentPeriodStart: data.currentPeriodStart ? new Date(data.currentPeriodStart) : undefined,
      currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : undefined,
      trialStart: data.trialStart ? new Date(data.trialStart) : undefined,
      trialEnd: data.trialEnd ? new Date(data.trialEnd) : undefined,
      externalOrgId: data.externalOrgId,
    })
  }

  // Record billing event
  if (data.stripeEventId) {
    await superadminDb.insert(billingEvents).values({
      productId,
      customerId,
      eventType: 'subscription.created',
      stripeEventId: data.stripeEventId,
      amount: data.amount,
      currency: data.currency,
      occurredAt: new Date(event.timestamp),
      metadata: { productName, priceId: data.priceId },
    })
  }

  // Audit log
  await superadminDb.insert(platformAuditLogs).values({
    action: 'product.subscription.synced',
    resourceType: 'subscription',
    resourceId: data.stripeSubscriptionId,
    productId,
    customerId,
    metadata: {
      eventId: event.eventId,
      eventType: event.eventType,
      productName,
      status: data.status,
      amount: data.amount,
      currency: data.currency,
    },
  })
}

/**
 * Handle product.subscription.updated event
 */
async function handleSubscriptionUpdated(
  event: z.infer<typeof subscriptionUpdatedEventSchema>,
  productId: string,
  productName: string
) {
  const { data } = event

  // Find existing subscription
  const [existing] = await superadminDb
    .select({ 
      id: productSubscriptions.id,
      customerId: productSubscriptions.customerId,
    })
    .from(productSubscriptions)
    .where(eq(productSubscriptions.stripeSubscriptionId, data.stripeSubscriptionId))
    .limit(1)

  if (!existing) {
    console.warn('Subscription not found for update:', data.stripeSubscriptionId)
    return
  }

  // Build update object
  const updates: Record<string, unknown> = {
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
  }

  if (data.stripeCustomerId !== undefined) updates.stripeCustomerId = data.stripeCustomerId
  if (data.status !== undefined) updates.status = data.status
  if (data.priceId !== undefined) updates.priceId = data.priceId
  if (data.productName !== undefined) updates.productName = data.productName
  if (data.amount !== undefined) updates.amount = data.amount
  if (data.currency !== undefined) updates.currency = data.currency
  if (data.interval !== undefined) updates.interval = data.interval
  if (data.currentPeriodStart !== undefined) updates.currentPeriodStart = new Date(data.currentPeriodStart)
  if (data.currentPeriodEnd !== undefined) updates.currentPeriodEnd = new Date(data.currentPeriodEnd)
  if (data.cancelAt !== undefined) updates.cancelAt = data.cancelAt ? new Date(data.cancelAt) : null
  if (data.canceledAt !== undefined) updates.canceledAt = data.canceledAt ? new Date(data.canceledAt) : null

  await superadminDb
    .update(productSubscriptions)
    .set(updates)
    .where(eq(productSubscriptions.id, existing.id))

  // Record billing event
  if (data.stripeEventId) {
    await superadminDb.insert(billingEvents).values({
      productId,
      customerId: existing.customerId,
      eventType: 'subscription.updated',
      stripeEventId: data.stripeEventId,
      amount: data.amount,
      currency: data.currency,
      occurredAt: new Date(event.timestamp),
      metadata: { productName, status: data.status },
    })
  }

  // Audit log
  await superadminDb.insert(platformAuditLogs).values({
    action: 'product.subscription.synced',
    resourceType: 'subscription',
    resourceId: data.stripeSubscriptionId,
    productId,
    customerId: existing.customerId,
    metadata: {
      eventId: event.eventId,
      eventType: event.eventType,
      productName,
      updates: data,
    },
  })
}

/**
 * Handle product.subscription.deleted event
 */
async function handleSubscriptionDeleted(
  event: z.infer<typeof subscriptionDeletedEventSchema>,
  productId: string,
  productName: string
) {
  const { data } = event

  // Find existing subscription
  const [existing] = await superadminDb
    .select({ 
      id: productSubscriptions.id,
      customerId: productSubscriptions.customerId,
    })
    .from(productSubscriptions)
    .where(eq(productSubscriptions.stripeSubscriptionId, data.stripeSubscriptionId))
    .limit(1)

  if (!existing) {
    console.warn('Subscription not found for deletion:', data.stripeSubscriptionId)
    return
  }

  // Mark as canceled
  await superadminDb
    .update(productSubscriptions)
    .set({
      status: 'canceled',
      canceledAt: new Date(),
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(productSubscriptions.id, existing.id))

  // Record billing event
  if (data.stripeEventId) {
    await superadminDb.insert(billingEvents).values({
      productId,
      customerId: existing.customerId,
      eventType: 'subscription.deleted',
      stripeEventId: data.stripeEventId,
      occurredAt: new Date(event.timestamp),
      metadata: { productName },
    })
  }

  // Audit log
  await superadminDb.insert(platformAuditLogs).values({
    action: 'product.subscription.deleted',
    resourceType: 'subscription',
    resourceId: data.stripeSubscriptionId,
    productId,
    customerId: existing.customerId,
    metadata: {
      eventId: event.eventId,
      eventType: event.eventType,
      productName,
    },
  })
}

/**
 * Handle product.invoice.paid event
 */
async function handleInvoicePaid(
  event: z.infer<typeof invoicePaidEventSchema>,
  productId: string,
  productName: string
) {
  const { data } = event

  // Find customer if subscription is linked
  let subscriptionId: string | null = null
  let customerId: string | null = null

  if (data.stripeSubscriptionId) {
    const [sub] = await superadminDb
      .select({ 
        id: productSubscriptions.id,
        customerId: productSubscriptions.customerId,
      })
      .from(productSubscriptions)
      .where(eq(productSubscriptions.stripeSubscriptionId, data.stripeSubscriptionId))
      .limit(1)

    if (sub) {
      subscriptionId = sub.id
      customerId = sub.customerId
    }
  }

  // Record billing event
  await superadminDb.insert(billingEvents).values({
    productId,
    subscriptionId,
    customerId,
    eventType: 'invoice.paid',
    stripeEventId: data.stripeEventId,
    amount: data.amount,
    currency: data.currency,
    occurredAt: new Date(event.timestamp),
    metadata: { productName, stripeCustomerId: data.stripeCustomerId },
  })

  // Audit log
  await superadminDb.insert(platformAuditLogs).values({
    action: 'product.invoice.paid',
    resourceType: 'invoice',
    resourceId: data.stripeEventId,
    productId,
    customerId,
    metadata: {
      eventId: event.eventId,
      eventType: event.eventType,
      productName,
      amount: data.amount,
      currency: data.currency,
    },
  })
}
