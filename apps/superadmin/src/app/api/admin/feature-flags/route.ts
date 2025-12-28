import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/auth'
import { superadminDb } from '@startkit/database'
import { organizationFeatureFlags, auditLogs } from '@startkit/database/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Toggle feature flag for an organization
 * POST /api/admin/feature-flags
 *
 * Body: { organizationId: string, flagKey: string, enabled: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperadmin()

    const body = await req.json()
    const { organizationId, flagKey, enabled } = body

    if (!organizationId || !flagKey || typeof enabled !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'organizationId, flagKey, and enabled are required' },
        },
        { status: 400 }
      )
    }

    // Check if flag exists
    const [existing] = await superadminDb
      .select()
      .from(organizationFeatureFlags)
      .where(
        and(
          eq(organizationFeatureFlags.organizationId, organizationId),
          eq(organizationFeatureFlags.flagKey, flagKey)
        )
      )
      .limit(1)

    if (existing) {
      // Update existing flag
      await superadminDb
        .update(organizationFeatureFlags)
        .set({
          enabled,
          setBy: admin.userId,
          updatedAt: new Date(),
        })
        .where(eq(organizationFeatureFlags.id, existing.id))
    } else {
      // Create new flag
      await superadminDb.insert(organizationFeatureFlags).values({
        organizationId,
        flagKey,
        enabled,
        setBy: admin.userId,
      })
    }

    // Log the action
    await superadminDb.insert(auditLogs).values({
      userId: admin.userId,
      userEmail: admin.email,
      organizationId,
      action: enabled ? 'feature_flag.enabled' : 'feature_flag.disabled',
      resourceType: 'feature_flag',
      resourceId: flagKey,
      metadata: {
        flagKey,
        enabled,
        previousState: existing ? existing.enabled : null,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      isSuperadminAction: new Date(),
    })

    return NextResponse.json({
      success: true,
      data: {
        organizationId,
        flagKey,
        enabled,
      },
    })
  } catch (error) {
    console.error('Error toggling feature flag:', error)

    if (error instanceof Error && error.message.includes('Superadmin')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: error.message } },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle feature flag' } },
      { status: 500 }
    )
  }
}
