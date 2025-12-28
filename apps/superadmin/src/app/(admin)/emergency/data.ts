import { superadminDb } from '@startkit/database'
import { killSwitches, organizations, users } from '@startkit/database/schema'
import { eq, and, or, isNull, gt, desc } from 'drizzle-orm'

/**
 * Active kill switch item
 */
export interface ActiveKillSwitchItem {
  id: string
  scope: string
  targetId: string
  reason: string | null
  activatedBy: {
    id: string
    name: string | null
    email: string
  } | null
  activatedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
}

/**
 * Suspended organization item
 */
export interface SuspendedOrganizationItem {
  id: string
  name: string
  slug: string
  status: string
  suspendedAt: Date | null
  suspendedReason: string | null
  suspendedBy: {
    id: string
    name: string | null
    email: string
  } | null
}

/**
 * Get all active kill switches
 */
export async function getActiveKillSwitches(): Promise<ActiveKillSwitchItem[]> {
  const now = new Date()

  const switches = await superadminDb
    .select({
      id: killSwitches.id,
      scope: killSwitches.scope,
      targetId: killSwitches.targetId,
      reason: killSwitches.reason,
      activatedBy: killSwitches.activatedBy,
      activatedAt: killSwitches.activatedAt,
      expiresAt: killSwitches.expiresAt,
      createdAt: killSwitches.createdAt,
    })
    .from(killSwitches)
    .where(
      and(
        eq(killSwitches.enabled, true),
        or(isNull(killSwitches.expiresAt), gt(killSwitches.expiresAt, now))
      )
    )
    .orderBy(desc(killSwitches.activatedAt))

  // Get user info for activators
  const userIds = switches
    .filter(s => s.activatedBy)
    .map(s => s.activatedBy!) as string[]

  const usersMap = new Map<string, { id: string; name: string | null; email: string }>()
  if (userIds.length > 0) {
    const usersList = await superadminDb
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(or(...userIds.map(id => eq(users.id, id))))
    usersList.forEach(u => usersMap.set(u.id, u))
  }

  return switches.map(s => ({
    id: s.id,
    scope: s.scope,
    targetId: s.targetId,
    reason: s.reason,
    activatedBy: s.activatedBy ? usersMap.get(s.activatedBy) ?? null : null,
    activatedAt: s.activatedAt,
    expiresAt: s.expiresAt,
    createdAt: s.createdAt,
  }))
}

/**
 * Get all suspended organizations
 */
export async function getSuspendedOrganizations(): Promise<SuspendedOrganizationItem[]> {
  const orgs = await superadminDb
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      status: organizations.status,
      suspendedAt: organizations.suspendedAt,
      suspendedReason: organizations.suspendedReason,
      suspendedBy: organizations.suspendedBy,
    })
    .from(organizations)
    .where(or(
      eq(organizations.status, 'suspended'),
      eq(organizations.status, 'locked')
    ))
    .orderBy(desc(organizations.suspendedAt))

  // Get user info for suspenders
  const userIds = orgs
    .filter(o => o.suspendedBy)
    .map(o => o.suspendedBy!) as string[]

  const usersMap = new Map<string, { id: string; name: string | null; email: string }>()
  if (userIds.length > 0) {
    const usersList = await superadminDb
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(or(...userIds.map(id => eq(users.id, id))))
    usersList.forEach(u => usersMap.set(u.id, u))
  }

  return orgs.map(o => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    status: o.status,
    suspendedAt: o.suspendedAt,
    suspendedReason: o.suspendedReason,
    suspendedBy: o.suspendedBy ? usersMap.get(o.suspendedBy) ?? null : null,
  }))
}

/**
 * Get emergency dashboard stats
 */
export async function getEmergencyStats() {
  const now = new Date()

  // Count active kill switches
  const activeKillSwitchCount = await superadminDb
    .select({ id: killSwitches.id })
    .from(killSwitches)
    .where(
      and(
        eq(killSwitches.enabled, true),
        or(isNull(killSwitches.expiresAt), gt(killSwitches.expiresAt, now))
      )
    )
    .then(rows => rows.length)

  // Count suspended orgs
  const suspendedOrgCount = await superadminDb
    .select({ id: organizations.id })
    .from(organizations)
    .where(or(
      eq(organizations.status, 'suspended'),
      eq(organizations.status, 'locked')
    ))
    .then(rows => rows.length)

  // Check if global kill switch is active
  const globalKillSwitch = await superadminDb
    .select({ enabled: killSwitches.enabled })
    .from(killSwitches)
    .where(
      and(
        eq(killSwitches.scope, 'global'),
        eq(killSwitches.targetId, 'system'),
        eq(killSwitches.enabled, true),
        or(isNull(killSwitches.expiresAt), gt(killSwitches.expiresAt, now))
      )
    )
    .limit(1)
    .then(rows => rows[0])

  return {
    activeKillSwitchCount,
    suspendedOrgCount,
    isSystemDown: !!globalKillSwitch,
  }
}
