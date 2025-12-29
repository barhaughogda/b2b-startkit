import { superadminDb } from '@startkit/database'
import { auditLogs, users, organizations } from '@startkit/database/schema'
import { eq, desc, ilike, or, sql, count, inArray } from 'drizzle-orm'

/**
 * Activity log item
 */
export interface ActivityLogItem {
  id: string
  userId: string | null
  userEmail: string | null
  organizationId: string | null
  organizationName: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  isSuperadminAction: boolean
  createdAt: Date
}

/**
 * Search parameters for activity logs
 */
export interface ActivitySearchParams {
  search?: string
  action?: string
  superadminOnly?: boolean
  page?: number
  limit?: number
}

/**
 * Get paginated activity logs
 */
export async function getActivityLogs(params: ActivitySearchParams = {}) {
  const { search, action, superadminOnly, page = 1, limit = 50 } = params
  const offset = (page - 1) * limit

  // Build query
  let query = superadminDb
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      userEmail: auditLogs.userEmail,
      organizationId: auditLogs.organizationId,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      metadata: auditLogs.metadata,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      isSuperadminAction: auditLogs.isSuperadminAction,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .$dynamic()

  // Apply search filter
  if (search) {
    query = query.where(
      or(
        ilike(auditLogs.userEmail, `%${search}%`),
        ilike(auditLogs.action, `%${search}%`),
        ilike(auditLogs.resourceType, `%${search}%`)
      )
    )
  }

  // Apply action filter
  if (action && action !== 'all') {
    query = query.where(ilike(auditLogs.action, `${action}%`))
  }

  // Apply superadmin filter
  if (superadminOnly) {
    query = query.where(sql`${auditLogs.isSuperadminAction} IS NOT NULL`)
  }

  // Get total count
  const countResult = await superadminDb.select({ count: count() }).from(auditLogs)

  // Execute query with pagination
  const logsResult = await query
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset)

  // Get organization names for logs with organizationId
  const orgIds = [...new Set(logsResult.filter((l) => l.organizationId).map((l) => l.organizationId!))]
  
  const orgsMap = new Map<string, string>()
  if (orgIds.length > 0) {
    const orgs = await superadminDb
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(inArray(organizations.id, orgIds))
    orgs.forEach((o) => orgsMap.set(o.id, o.name))
  }

  const items: ActivityLogItem[] = logsResult.map((log) => ({
    ...log,
    organizationName: log.organizationId ? orgsMap.get(log.organizationId) || null : null,
    isSuperadminAction: !!log.isSuperadminAction,
    metadata: log.metadata as Record<string, unknown> | null,
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
 * Get available action types for filtering
 */
export function getActionTypes(): string[] {
  return [
    'user',
    'organization',
    'subscription',
    'impersonation',
    'settings',
    'billing',
    'feature_flag',
  ]
}
