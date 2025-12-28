import { superadminDb } from '@startkit/database'
import { users, organizationMembers, organizations } from '@startkit/database/schema'
import { eq, desc, ilike, count, or, sql } from 'drizzle-orm'

/**
 * User list item
 */
export interface UserListItem {
  id: string
  clerkId: string
  email: string
  name: string | null
  avatarUrl: string | null
  isSuperadmin: boolean
  createdAt: Date
  organizationCount: number
}

/**
 * User detail with full information
 */
export interface UserDetail extends UserListItem {
  organizations: {
    id: string
    name: string
    slug: string
    role: string
    joinedAt: Date
  }[]
}

/**
 * Search parameters for users list
 */
export interface UserSearchParams {
  search?: string
  superadminOnly?: boolean
  page?: number
  limit?: number
}

/**
 * Get paginated list of users
 */
export async function getUsers(params: UserSearchParams = {}) {
  const { search, superadminOnly, page = 1, limit = 20 } = params
  const offset = (page - 1) * limit

  // Build base query with organization count
  let whereConditions = []
  
  if (search) {
    whereConditions.push(
      or(
        ilike(users.email, `%${search}%`),
        ilike(users.name, `%${search}%`)
      )
    )
  }
  
  if (superadminOnly) {
    whereConditions.push(eq(users.isSuperadmin, true))
  }

  // Get total count
  const countQuery = superadminDb.select({ count: count() }).from(users)
  if (whereConditions.length > 0) {
    // @ts-ignore - drizzle types are complex
    whereConditions.forEach(condition => {
      if (condition) countQuery.where(condition)
    })
  }
  const countResult = await countQuery

  // Get users
  let usersQuery = superadminDb
    .select({
      id: users.id,
      clerkId: users.clerkId,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      isSuperadmin: users.isSuperadmin,
      createdAt: users.createdAt,
    })
    .from(users)
    .$dynamic()

  if (search) {
    usersQuery = usersQuery.where(
      or(
        ilike(users.email, `%${search}%`),
        ilike(users.name, `%${search}%`)
      )
    )
  }
  
  if (superadminOnly) {
    usersQuery = usersQuery.where(eq(users.isSuperadmin, true))
  }

  const usersResult = await usersQuery
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset)

  // Get organization counts for each user
  const userIds = usersResult.map((u) => u.id)
  const orgCounts = userIds.length > 0
    ? await superadminDb
        .select({
          userId: organizationMembers.userId,
          count: count(),
        })
        .from(organizationMembers)
        .where(sql`${organizationMembers.userId} = ANY(${userIds})`)
        .groupBy(organizationMembers.userId)
    : []

  const orgCountMap = new Map(orgCounts.map((o) => [o.userId, o.count]))

  const items: UserListItem[] = usersResult.map((user) => ({
    ...user,
    organizationCount: orgCountMap.get(user.id) || 0,
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
 * Get user by ID with full details
 */
export async function getUserById(id: string): Promise<UserDetail | null> {
  const [user] = await superadminDb
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!user) {
    return null
  }

  // Get user's organizations
  const memberships = await superadminDb
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(eq(organizationMembers.userId, id))
    .orderBy(desc(organizationMembers.joinedAt))

  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    isSuperadmin: user.isSuperadmin,
    createdAt: user.createdAt,
    organizationCount: memberships.length,
    organizations: memberships,
  }
}
