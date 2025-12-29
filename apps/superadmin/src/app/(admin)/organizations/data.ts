import { superadminDb } from '@startkit/database'
import { organizations, subscriptions, organizationMembers, users } from '@startkit/database/schema'
import { eq, desc, ilike, count, sql, or, inArray } from 'drizzle-orm'

/**
 * Organization list item
 */
export interface OrganizationListItem {
  id: string
  name: string
  slug: string
  createdAt: Date
  memberCount: number
  subscription: {
    plan: string
    status: string
  } | null
}

/**
 * Organization detail with full information
 */
export interface OrganizationDetail extends OrganizationListItem {
  clerkOrgId: string
  settings: Record<string, unknown>
  members: {
    id: string
    userId: string
    role: string
    joinedAt: Date
    user: {
      id: string
      email: string
      name: string | null
      avatarUrl: string | null
    }
  }[]
  subscriptionDetails: {
    id: string
    stripeCustomerId: string
    stripeSubscriptionId: string | null
    plan: string
    status: string
    seatCount: number
    maxSeats: number | null
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: Date | null
  } | null
}

/**
 * Search parameters for organizations list
 */
export interface OrganizationSearchParams {
  search?: string
  plan?: string
  status?: string
  page?: number
  limit?: number
}

/**
 * Get paginated list of organizations
 */
export async function getOrganizations(params: OrganizationSearchParams = {}) {
  const { search, plan, status, page = 1, limit = 20 } = params
  const offset = (page - 1) * limit

  // Build base query
  let query = superadminDb
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      createdAt: organizations.createdAt,
      subscriptionPlan: subscriptions.plan,
      subscriptionStatus: subscriptions.status,
    })
    .from(organizations)
    .leftJoin(subscriptions, eq(organizations.id, subscriptions.organizationId))
    .$dynamic()

  // Apply search filter
  if (search) {
    query = query.where(
      or(
        ilike(organizations.name, `%${search}%`),
        ilike(organizations.slug, `%${search}%`)
      )
    )
  }

  // Apply plan filter
  if (plan && plan !== 'all') {
    query = query.where(eq(subscriptions.plan, plan as 'free' | 'starter' | 'pro' | 'enterprise'))
  }

  // Apply status filter
  if (status && status !== 'all') {
    query = query.where(eq(subscriptions.status, status as 'active' | 'trialing' | 'canceled' | 'past_due'))
  }

  // Get total count for pagination
  const countResult = await superadminDb
    .select({ count: count() })
    .from(organizations)

  // Execute query with pagination
  const orgsResult = await query
    .orderBy(desc(organizations.createdAt))
    .limit(limit)
    .offset(offset)

  // Get member counts for each org
  const orgIds = orgsResult.map((o) => o.id)
  const memberCounts = orgIds.length > 0
    ? await superadminDb
        .select({
          organizationId: organizationMembers.organizationId,
          count: count(),
        })
        .from(organizationMembers)
        .where(inArray(organizationMembers.organizationId, orgIds))
        .groupBy(organizationMembers.organizationId)
    : []

  const memberCountMap = new Map(
    memberCounts.map((m) => [m.organizationId, m.count])
  )

  const items: OrganizationListItem[] = orgsResult.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    createdAt: org.createdAt,
    memberCount: memberCountMap.get(org.id) || 0,
    subscription: org.subscriptionPlan
      ? {
          plan: org.subscriptionPlan,
          status: org.subscriptionStatus || 'unknown',
        }
      : null,
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
 * Get organization by ID with full details
 */
export async function getOrganizationById(id: string): Promise<OrganizationDetail | null> {
  // Get organization with subscription
  const [org] = await superadminDb
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1)

  if (!org) {
    return null
  }

  // Get subscription
  const [subscription] = await superadminDb
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, id))
    .limit(1)

  // Get members with user info
  const membersResult = await superadminDb
    .select({
      id: organizationMembers.id,
      userId: organizationMembers.userId,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, id))
    .orderBy(organizationMembers.joinedAt)

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    clerkOrgId: org.clerkOrgId,
    settings: (org.settings as Record<string, unknown>) || {},
    createdAt: org.createdAt,
    memberCount: membersResult.length,
    members: membersResult,
    subscription: subscription
      ? { plan: subscription.plan, status: subscription.status }
      : null,
    subscriptionDetails: subscription
      ? {
          id: subscription.id,
          stripeCustomerId: subscription.stripeCustomerId,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          plan: subscription.plan,
          status: subscription.status,
          seatCount: subscription.seatCount,
          maxSeats: subscription.maxSeats,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        }
      : null,
  }
}
