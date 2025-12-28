import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/auth'
import { superadminDb } from '@startkit/database'
import { organizations, auditLogs } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'

/**
 * Unsuspend an organization
 * POST /api/admin/organization/unsuspend
 *
 * Body: { organizationId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperadmin()

    const body = await req.json()
    const { organizationId } = body

    if (!organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'organizationId is required' },
        },
        { status: 400 }
      )
    }

    // Get current org state for audit log
    const [org] = await superadminDb
      .select({
        id: organizations.id,
        name: organizations.name,
        status: organizations.status,
        suspendedReason: organizations.suspendedReason,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!org) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        },
        { status: 404 }
      )
    }

    const now = new Date()

    // Update organization status
    await superadminDb
      .update(organizations)
      .set({
        status: 'active',
        suspendedAt: null,
        suspendedReason: null,
        suspendedBy: null,
        updatedAt: now,
      })
      .where(eq(organizations.id, organizationId))

    // Log the action
    await superadminDb.insert(auditLogs).values({
      userId: admin.userId,
      userEmail: admin.email,
      organizationId,
      action: 'organization.unsuspended',
      resourceType: 'organization',
      resourceId: organizationId,
      metadata: {
        organizationName: org.name,
        previousStatus: org.status,
        previousReason: org.suspendedReason,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      isSuperadminAction: now,
    })

    return NextResponse.json({
      success: true,
      data: {
        organizationId,
        status: 'active',
      },
    })
  } catch (error) {
    console.error('Error unsuspending organization:', error)

    if (error instanceof Error && error.message.includes('Superadmin')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: error.message } },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to unsuspend organization' } },
      { status: 500 }
    )
  }
}
