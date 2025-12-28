import { eq, and } from 'drizzle-orm'
import { superadminDb } from '@startkit/database'
import {
  users,
  organizations,
  organizationMembers,
  auditLogs,
  type NewUser,
  type NewOrganization,
  type NewOrganizationMember,
  type NewAuditLog,
} from '@startkit/database/schema'
import type { WebhookEvent } from '@clerk/nextjs/server'

/**
 * Webhook event handlers for Clerk
 * These sync Clerk data to our database with idempotency
 *
 * @ai-no-modify Webhook handlers are critical for data sync
 */

/**
 * Idempotency helper - checks if webhook was already processed
 * Uses svix-id as the idempotency key
 */
async function checkIdempotency(svixId: string, eventType: string): Promise<boolean> {
  // Check if we've already processed this webhook by looking for audit log
  const [existing] = await superadminDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, `webhook.${eventType}`),
        eq(auditLogs.resourceId, svixId)
      )
    )
    .limit(1)

  return !!existing
}

/**
 * Create audit log entry for webhook processing
 */
async function logWebhook(
  svixId: string,
  eventType: string,
  resourceType: string,
  resourceId: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  await superadminDb.insert(auditLogs).values({
    action: `webhook.${eventType}`,
    resourceType,
    resourceId: svixId, // Use svix-id as resource ID for idempotency
    metadata: {
      ...metadata,
      clerkEventType: eventType,
      clerkResourceId: resourceId,
    },
  } as NewAuditLog)
}

/**
 * Handle user.created webhook
 * Creates user in database if not exists (idempotent)
 */
export async function handleUserCreated(
  data: WebhookEvent['data'],
  svixId: string
): Promise<void> {
  // Check idempotency
  if (await checkIdempotency(svixId, 'user.created')) {
    console.log(`Webhook ${svixId} already processed (user.created)`)
    return
  }

  const userData = data as {
    id: string
    email_addresses: Array<{ email_address: string }>
    first_name: string | null
    last_name: string | null
    image_url: string | null
    public_metadata?: Record<string, unknown>
  }

  const email = userData.email_addresses[0]?.email_address
  if (!email) {
    throw new Error('User created without email address')
  }

  const name = [userData.first_name, userData.last_name].filter(Boolean).join(' ') || null

  // Check if user already exists (idempotency)
  const [existing] = await superadminDb
    .select()
    .from(users)
    .where(eq(users.clerkId, userData.id))
    .limit(1)

  if (existing) {
    // Update if exists but webhook wasn't logged
    await superadminDb
      .update(users)
      .set({
        email,
        name,
        avatarUrl: userData.image_url,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
  } else {
    // Create new user
    const isSuperadmin =
      (userData.public_metadata?.role as string) === 'superadmin' || false

    await superadminDb.insert(users).values({
      clerkId: userData.id,
      email,
      name,
      avatarUrl: userData.image_url,
      isSuperadmin,
    } as NewUser)
  }

  // Log webhook processing
  await logWebhook(svixId, 'user.created', 'user', userData.id, {
    email,
    name,
  })
}

/**
 * Handle user.updated webhook
 * Updates user in database
 */
export async function handleUserUpdated(
  data: WebhookEvent['data'],
  svixId: string
): Promise<void> {
  // Check idempotency
  if (await checkIdempotency(svixId, 'user.updated')) {
    console.log(`Webhook ${svixId} already processed (user.updated)`)
    return
  }

  const userData = data as {
    id: string
    email_addresses: Array<{ email_address: string }>
    first_name: string | null
    last_name: string | null
    image_url: string | null
    public_metadata?: Record<string, unknown>
  }

  const [dbUser] = await superadminDb
    .select()
    .from(users)
    .where(eq(users.clerkId, userData.id))
    .limit(1)

  if (!dbUser) {
    // User doesn't exist - create it (webhook order issue)
    await handleUserCreated(data, svixId)
    return
  }

  const email = userData.email_addresses[0]?.email_address || dbUser.email
  const name = [userData.first_name, userData.last_name].filter(Boolean).join(' ') || null
  const isSuperadmin =
    (userData.public_metadata?.role as string) === 'superadmin' || dbUser.isSuperadmin

  await superadminDb
    .update(users)
    .set({
      email,
      name,
      avatarUrl: userData.image_url,
      isSuperadmin,
      updatedAt: new Date(),
    })
    .where(eq(users.id, dbUser.id))

  await logWebhook(svixId, 'user.updated', 'user', userData.id, {
    email,
    name,
    isSuperadmin,
  })
}

/**
 * Handle user.deleted webhook
 * Soft deletes user (anonymizes data, keeps for audit)
 */
export async function handleUserDeleted(
  data: WebhookEvent['data'],
  svixId: string
): Promise<void> {
  // Check idempotency
  if (await checkIdempotency(svixId, 'user.deleted')) {
    console.log(`Webhook ${svixId} already processed (user.deleted)`)
    return
  }

  const userData = data as { id: string }

  const [dbUser] = await superadminDb
    .select()
    .from(users)
    .where(eq(users.clerkId, userData.id))
    .limit(1)

  if (!dbUser) {
    // User doesn't exist - log anyway
    await logWebhook(svixId, 'user.deleted', 'user', userData.id)
    return
  }

  // Anonymize user data (soft delete)
  await superadminDb
    .update(users)
    .set({
      email: `deleted_${dbUser.id}@deleted.local`,
      name: 'Deleted User',
      avatarUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, dbUser.id))

  await logWebhook(svixId, 'user.deleted', 'user', userData.id, {
    userId: dbUser.id,
  })
}

/**
 * Handle organization.created webhook
 * Creates organization in database
 */
export async function handleOrgCreated(
  data: WebhookEvent['data'],
  svixId: string
): Promise<void> {
  // Check idempotency
  if (await checkIdempotency(svixId, 'organization.created')) {
    console.log(`Webhook ${svixId} already processed (organization.created)`)
    return
  }

  const orgData = data as {
    id: string
    name: string
    slug: string | null
  }

  // Check if org already exists
  const [existing] = await superadminDb
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, orgData.id))
    .limit(1)

  if (existing) {
    await logWebhook(svixId, 'organization.created', 'organization', orgData.id)
    return
  }

  const slug = orgData.slug || orgData.id

  await superadminDb.insert(organizations).values({
    clerkOrgId: orgData.id,
    name: orgData.name,
    slug,
  } as NewOrganization)

  await logWebhook(svixId, 'organization.created', 'organization', orgData.id, {
    name: orgData.name,
    slug,
  })
}

/**
 * Handle organization.updated webhook
 * Updates organization in database
 */
export async function handleOrgUpdated(
  data: WebhookEvent['data'],
  svixId: string
): Promise<void> {
  // Check idempotency
  if (await checkIdempotency(svixId, 'organization.updated')) {
    console.log(`Webhook ${svixId} already processed (organization.updated)`)
    return
  }

  const orgData = data as {
    id: string
    name: string
    slug: string | null
  }

  const [dbOrg] = await superadminDb
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, orgData.id))
    .limit(1)

  if (!dbOrg) {
    // Org doesn't exist - create it
    await handleOrgCreated(data, svixId)
    return
  }

  const slug = orgData.slug || dbOrg.slug

  await superadminDb
    .update(organizations)
    .set({
      name: orgData.name,
      slug,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, dbOrg.id))

  await logWebhook(svixId, 'organization.updated', 'organization', orgData.id, {
    name: orgData.name,
    slug,
  })
}

/**
 * Handle organization.deleted webhook
 * Marks organization as deleted (soft delete)
 */
export async function handleOrgDeleted(
  data: WebhookEvent['data'],
  svixId: string
): Promise<void> {
  // Check idempotency
  if (await checkIdempotency(svixId, 'organization.deleted')) {
    console.log(`Webhook ${svixId} already processed (organization.deleted)`)
    return
  }

  const orgData = data as { id: string }

  const [dbOrg] = await superadminDb
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, orgData.id))
    .limit(1)

  if (!dbOrg) {
    await logWebhook(svixId, 'organization.deleted', 'organization', orgData.id)
    return
  }

  // Soft delete by updating name
  await superadminDb
    .update(organizations)
    .set({
      name: `Deleted Organization ${dbOrg.id}`,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, dbOrg.id))

  await logWebhook(svixId, 'organization.deleted', 'organization', orgData.id, {
    organizationId: dbOrg.id,
  })
}

/**
 * Handle organizationMembership.created webhook
 * Adds user to organization members table
 */
export async function handleMembershipCreated(
  data: WebhookEvent['data'],
  svixId: string
): Promise<void> {
  // Check idempotency
  if (await checkIdempotency(svixId, 'organizationMembership.created')) {
    console.log(`Webhook ${svixId} already processed (organizationMembership.created)`)
    return
  }

  const membershipData = data as {
    id: string
    organization: { id: string }
    public_user_data: { user_id: string }
    role: string
  }

  // Fetch user and org from database
  const [dbUser] = await superadminDb
    .select()
    .from(users)
    .where(eq(users.clerkId, membershipData.public_user_data.user_id))
    .limit(1)

  const [dbOrg] = await superadminDb
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, membershipData.organization.id))
    .limit(1)

  if (!dbUser || !dbOrg) {
    // User or org not synced yet - log and skip
    await logWebhook(svixId, 'organizationMembership.created', 'organization_member', membershipData.id, {
      error: 'User or organization not found',
    })
    return
  }

  // Check if membership already exists
  const [existing] = await superadminDb
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, dbOrg.id),
        eq(organizationMembers.userId, dbUser.id)
      )
    )
    .limit(1)

  if (existing) {
    // Update role if changed
    await superadminDb
      .update(organizationMembers)
      .set({
        role: membershipData.role as 'owner' | 'admin' | 'member',
        updatedAt: new Date(),
      })
      .where(eq(organizationMembers.id, existing.id))
  } else {
    // Create membership
    await superadminDb.insert(organizationMembers).values({
      organizationId: dbOrg.id,
      userId: dbUser.id,
      role: membershipData.role as 'owner' | 'admin' | 'member',
    } as NewOrganizationMember)
  }

  await logWebhook(svixId, 'organizationMembership.created', 'organization_member', membershipData.id, {
    organizationId: dbOrg.id,
    userId: dbUser.id,
    role: membershipData.role,
  })
}

/**
 * Handle organizationMembership.updated webhook
 * Updates user's role in organization
 */
export async function handleMembershipUpdated(
  data: WebhookEvent['data'],
  svixId: string
): Promise<void> {
  // Check idempotency
  if (await checkIdempotency(svixId, 'organizationMembership.updated')) {
    console.log(`Webhook ${svixId} already processed (organizationMembership.updated)`)
    return
  }

  const membershipData = data as {
    id: string
    organization: { id: string }
    public_user_data: { user_id: string }
    role: string
  }

  // Fetch user and org from database
  const [dbUser] = await superadminDb
    .select()
    .from(users)
    .where(eq(users.clerkId, membershipData.public_user_data.user_id))
    .limit(1)

  const [dbOrg] = await superadminDb
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, membershipData.organization.id))
    .limit(1)

  if (!dbUser || !dbOrg) {
    await logWebhook(svixId, 'organizationMembership.updated', 'organization_member', membershipData.id, {
      error: 'User or organization not found',
    })
    return
  }

  // Update membership role
  await superadminDb
    .update(organizationMembers)
    .set({
      role: membershipData.role as 'owner' | 'admin' | 'member',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(organizationMembers.organizationId, dbOrg.id),
        eq(organizationMembers.userId, dbUser.id)
      )
    )

  await logWebhook(svixId, 'organizationMembership.updated', 'organization_member', membershipData.id, {
    organizationId: dbOrg.id,
    userId: dbUser.id,
    role: membershipData.role,
  })
}

/**
 * Handle organizationMembership.deleted webhook
 * Removes user from organization members table
 */
export async function handleMembershipDeleted(
  data: WebhookEvent['data'],
  svixId: string
): Promise<void> {
  // Check idempotency
  if (await checkIdempotency(svixId, 'organizationMembership.deleted')) {
    console.log(`Webhook ${svixId} already processed (organizationMembership.deleted)`)
    return
  }

  const membershipData = data as {
    id: string
    organization: { id: string }
    public_user_data: { user_id: string }
  }

  // Fetch user and org from database
  const [dbUser] = await superadminDb
    .select()
    .from(users)
    .where(eq(users.clerkId, membershipData.public_user_data.user_id))
    .limit(1)

  const [dbOrg] = await superadminDb
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, membershipData.organization.id))
    .limit(1)

  if (!dbUser || !dbOrg) {
    await logWebhook(svixId, 'organizationMembership.deleted', 'organization_member', membershipData.id)
    return
  }

  // Delete membership
  await superadminDb
    .delete(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, dbOrg.id),
        eq(organizationMembers.userId, dbUser.id)
      )
    )

  await logWebhook(svixId, 'organizationMembership.deleted', 'organization_member', membershipData.id, {
    organizationId: dbOrg.id,
    userId: dbUser.id,
  })
}
