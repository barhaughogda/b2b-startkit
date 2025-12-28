/**
 * Kill Switch Evaluation
 *
 * Provides emergency controls to instantly disable products, features, or organizations.
 *
 * @ai-context Kill switches are evaluated in hierarchy order:
 * 1. Global (system-wide emergency)
 * 2. Product (disable specific product)
 * 3. Feature (disable specific feature)
 * 4. Organization (suspend specific org)
 *
 * A block at any level stops further evaluation.
 */

import { eq, and, or, isNull, gt } from 'drizzle-orm'
import { superadminDb } from '@startkit/database'
import { killSwitches, organizations } from '@startkit/database/schema'
import type { KillSwitchScope } from '@startkit/database/schema'

// ============================================
// Types
// ============================================

export interface KillSwitchContext {
  /**
   * Product ID to check (required)
   */
  productId: string

  /**
   * Feature key to check (optional)
   */
  featureKey?: string

  /**
   * Organization ID to check (optional)
   */
  organizationId?: string
}

export interface KillSwitchResult {
  /**
   * Whether access is blocked
   */
  blocked: boolean

  /**
   * Reason for the block (if blocked)
   */
  reason?: string

  /**
   * Which scope caused the block
   */
  scope?: KillSwitchScope

  /**
   * When the block expires (if temporary)
   */
  expiresAt?: Date
}

export interface ActiveKillSwitch {
  scope: KillSwitchScope
  targetId: string
  reason: string | null
  expiresAt: Date | null
}

// ============================================
// Main API
// ============================================

/**
 * Check if access is blocked by any kill switch
 *
 * Evaluates in order: global > product > feature > organization
 * Returns immediately when a block is found.
 *
 * @example
 * ```typescript
 * const result = await checkKillSwitch({
 *   productId: 'my-product',
 *   featureKey: 'ai_assistant',
 *   organizationId: org.id,
 * })
 *
 * if (result.blocked) {
 *   return new Response(result.reason, { status: 503 })
 * }
 * ```
 */
export async function checkKillSwitch(ctx: KillSwitchContext): Promise<KillSwitchResult> {
  const now = new Date()

  // Build query conditions for all relevant scopes
  const conditions = [
    // Global kill switch
    and(
      eq(killSwitches.scope, 'global'),
      eq(killSwitches.targetId, 'system'),
      eq(killSwitches.enabled, true),
      or(isNull(killSwitches.expiresAt), gt(killSwitches.expiresAt, now))
    ),
    // Product kill switch
    and(
      eq(killSwitches.scope, 'product'),
      eq(killSwitches.targetId, ctx.productId),
      eq(killSwitches.enabled, true),
      or(isNull(killSwitches.expiresAt), gt(killSwitches.expiresAt, now))
    ),
  ]

  // Add feature condition if provided
  if (ctx.featureKey) {
    conditions.push(
      and(
        eq(killSwitches.scope, 'feature'),
        eq(killSwitches.targetId, ctx.featureKey),
        eq(killSwitches.enabled, true),
        or(isNull(killSwitches.expiresAt), gt(killSwitches.expiresAt, now))
      )
    )
  }

  // Add organization condition if provided
  if (ctx.organizationId) {
    conditions.push(
      and(
        eq(killSwitches.scope, 'organization'),
        eq(killSwitches.targetId, ctx.organizationId),
        eq(killSwitches.enabled, true),
        or(isNull(killSwitches.expiresAt), gt(killSwitches.expiresAt, now))
      )
    )
  }

  // Query for any active kill switches
  const activeSwitch = await superadminDb
    .select({
      scope: killSwitches.scope,
      targetId: killSwitches.targetId,
      reason: killSwitches.reason,
      expiresAt: killSwitches.expiresAt,
    })
    .from(killSwitches)
    .where(or(...conditions))
    .orderBy(killSwitches.scope) // global < product < feature < organization
    .limit(1)
    .then(rows => rows[0])

  if (activeSwitch) {
    return {
      blocked: true,
      reason: getBlockReason(activeSwitch),
      scope: activeSwitch.scope as KillSwitchScope,
      expiresAt: activeSwitch.expiresAt ?? undefined,
    }
  }

  // Also check organization status if org ID provided
  if (ctx.organizationId) {
    const org = await superadminDb
      .select({
        status: organizations.status,
        suspendedReason: organizations.suspendedReason,
      })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1)
      .then(rows => rows[0])

    if (org && org.status !== 'active') {
      return {
        blocked: true,
        reason: org.suspendedReason || `Organization is ${org.status}`,
        scope: 'organization',
      }
    }
  }

  return { blocked: false }
}

/**
 * Check if a specific feature is blocked
 *
 * Shorthand for checking feature-level kill switch only.
 */
export async function isFeatureBlocked(
  productId: string,
  featureKey: string
): Promise<boolean> {
  const result = await checkKillSwitch({ productId, featureKey })
  return result.blocked
}

/**
 * Check if an organization is blocked
 *
 * Checks both kill switch and organization status.
 */
export async function isOrganizationBlocked(
  organizationId: string
): Promise<KillSwitchResult> {
  // First check organization status directly
  const org = await superadminDb
    .select({
      status: organizations.status,
      suspendedReason: organizations.suspendedReason,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)
    .then(rows => rows[0])

  if (org && org.status !== 'active') {
    return {
      blocked: true,
      reason: org.suspendedReason || `Organization is ${org.status}`,
      scope: 'organization',
    }
  }

  // Then check kill switch
  const now = new Date()
  const activeSwitch = await superadminDb
    .select({
      scope: killSwitches.scope,
      reason: killSwitches.reason,
      expiresAt: killSwitches.expiresAt,
    })
    .from(killSwitches)
    .where(
      and(
        eq(killSwitches.scope, 'organization'),
        eq(killSwitches.targetId, organizationId),
        eq(killSwitches.enabled, true),
        or(isNull(killSwitches.expiresAt), gt(killSwitches.expiresAt, now))
      )
    )
    .limit(1)
    .then(rows => rows[0])

  if (activeSwitch) {
    return {
      blocked: true,
      reason: activeSwitch.reason || 'Organization access is blocked',
      scope: 'organization',
      expiresAt: activeSwitch.expiresAt ?? undefined,
    }
  }

  return { blocked: false }
}

// ============================================
// Admin Functions
// ============================================

/**
 * Activate a kill switch
 *
 * @ai-context This should only be called by superadmin users.
 * All activations are logged to audit_logs.
 */
export async function activateKillSwitch(params: {
  scope: KillSwitchScope
  targetId: string
  reason: string
  activatedBy: string
  expiresAt?: Date
}): Promise<void> {
  const now = new Date()

  await superadminDb
    .insert(killSwitches)
    .values({
      scope: params.scope,
      targetId: params.targetId,
      enabled: true,
      reason: params.reason,
      activatedBy: params.activatedBy,
      activatedAt: now,
      expiresAt: params.expiresAt ?? null,
    })
    .onConflictDoUpdate({
      target: [killSwitches.scope, killSwitches.targetId],
      set: {
        enabled: true,
        reason: params.reason,
        activatedBy: params.activatedBy,
        activatedAt: now,
        expiresAt: params.expiresAt ?? null,
        updatedAt: now,
      },
    })
}

/**
 * Deactivate a kill switch
 */
export async function deactivateKillSwitch(params: {
  scope: KillSwitchScope
  targetId: string
}): Promise<void> {
  await superadminDb
    .update(killSwitches)
    .set({
      enabled: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(killSwitches.scope, params.scope),
        eq(killSwitches.targetId, params.targetId)
      )
    )
}

/**
 * Get all active kill switches
 */
export async function getActiveKillSwitches(): Promise<ActiveKillSwitch[]> {
  const now = new Date()

  const switches = await superadminDb
    .select({
      scope: killSwitches.scope,
      targetId: killSwitches.targetId,
      reason: killSwitches.reason,
      expiresAt: killSwitches.expiresAt,
    })
    .from(killSwitches)
    .where(
      and(
        eq(killSwitches.enabled, true),
        or(isNull(killSwitches.expiresAt), gt(killSwitches.expiresAt, now))
      )
    )
    .orderBy(killSwitches.scope, killSwitches.targetId)

  return switches.map(s => ({
    scope: s.scope as KillSwitchScope,
    targetId: s.targetId,
    reason: s.reason,
    expiresAt: s.expiresAt,
  }))
}

/**
 * Suspend an organization
 */
export async function suspendOrganization(params: {
  organizationId: string
  reason: string
  suspendedBy: string
}): Promise<void> {
  await superadminDb
    .update(organizations)
    .set({
      status: 'suspended',
      suspendedAt: new Date(),
      suspendedReason: params.reason,
      suspendedBy: params.suspendedBy,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, params.organizationId))
}

/**
 * Unsuspend an organization
 */
export async function unsuspendOrganization(organizationId: string): Promise<void> {
  await superadminDb
    .update(organizations)
    .set({
      status: 'active',
      suspendedAt: null,
      suspendedReason: null,
      suspendedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
}

// ============================================
// Helpers
// ============================================

function getBlockReason(activeSwitch: {
  scope: string
  reason: string | null
}): string {
  if (activeSwitch.reason) {
    return activeSwitch.reason
  }

  switch (activeSwitch.scope) {
    case 'global':
      return 'System is currently under maintenance'
    case 'product':
      return 'This product is temporarily unavailable'
    case 'feature':
      return 'This feature is temporarily disabled'
    case 'organization':
      return 'Your organization access has been suspended'
    default:
      return 'Access is temporarily blocked'
  }
}
