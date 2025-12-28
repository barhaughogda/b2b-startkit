import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/auth'
import { superadminDb } from '@startkit/database'
import { killSwitches, auditLogs } from '@startkit/database/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Activate or deactivate a kill switch
 * POST /api/admin/kill-switch
 *
 * Body: {
 *   scope: 'global' | 'product' | 'feature' | 'organization',
 *   targetId: string,
 *   enabled: boolean,
 *   reason?: string,
 *   expiresAt?: string (ISO date)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperadmin()

    const body = await req.json()
    const { scope, targetId, enabled, reason, expiresAt } = body

    if (!scope || !targetId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'scope, targetId, and enabled are required' },
        },
        { status: 400 }
      )
    }

    // Validate scope
    const validScopes = ['global', 'product', 'feature', 'organization']
    if (!validScopes.includes(scope)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Invalid scope' },
        },
        { status: 400 }
      )
    }

    // Require reason for activation
    if (enabled && !reason) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Reason is required when activating kill switch' },
        },
        { status: 400 }
      )
    }

    const now = new Date()
    const expiresAtDate = expiresAt ? new Date(expiresAt) : null

    // Check if kill switch exists
    const [existing] = await superadminDb
      .select()
      .from(killSwitches)
      .where(
        and(
          eq(killSwitches.scope, scope),
          eq(killSwitches.targetId, targetId)
        )
      )
      .limit(1)

    if (existing) {
      // Update existing kill switch
      await superadminDb
        .update(killSwitches)
        .set({
          enabled,
          reason: enabled ? reason : existing.reason,
          activatedBy: enabled ? admin.userId : existing.activatedBy,
          activatedAt: enabled ? now : existing.activatedAt,
          expiresAt: enabled ? expiresAtDate : null,
          updatedAt: now,
        })
        .where(eq(killSwitches.id, existing.id))
    } else if (enabled) {
      // Create new kill switch (only if enabling)
      await superadminDb.insert(killSwitches).values({
        scope,
        targetId,
        enabled: true,
        reason,
        activatedBy: admin.userId,
        activatedAt: now,
        expiresAt: expiresAtDate,
      })
    }

    // Log the action
    await superadminDb.insert(auditLogs).values({
      userId: admin.userId,
      userEmail: admin.email,
      organizationId: scope === 'organization' ? targetId : null,
      action: enabled ? 'kill_switch.activated' : 'kill_switch.deactivated',
      resourceType: 'kill_switch',
      resourceId: `${scope}:${targetId}`,
      metadata: {
        scope,
        targetId,
        enabled,
        reason,
        expiresAt: expiresAtDate?.toISOString() || null,
        previousState: existing ? existing.enabled : null,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      isSuperadminAction: now,
    })

    return NextResponse.json({
      success: true,
      data: {
        scope,
        targetId,
        enabled,
        reason,
      },
    })
  } catch (error) {
    console.error('Error toggling kill switch:', error)

    if (error instanceof Error && error.message.includes('Superadmin')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: error.message } },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle kill switch' } },
      { status: 500 }
    )
  }
}
