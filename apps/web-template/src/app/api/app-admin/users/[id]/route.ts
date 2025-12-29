import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@startkit/auth/server'
import { superadminDb } from '@startkit/database'
import { users, organizationMembers, auditLogs } from '@startkit/database/schema'
import { eq, and } from 'drizzle-orm'
import { isAppAdmin } from '@startkit/rbac'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Update user (grant/revoke app admin)
 * PATCH /api/app-admin/users/[id]
 *
 * Body: { 
 *   action: 'grant_app_admin' | 'revoke_app_admin',
 *   organizationId: string 
 * }
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { user: currentUser, organization } = await requireAuth()
    const { id: targetUserId } = await params

    // Check if current user is app admin or superadmin
    const ctx = {
      role: 'admin' as const,
      customPermissions: [],
      plan: 'pro' as const,
      isSuperadmin: currentUser.isSuperadmin,
      isAppAdmin: true, // We'll verify this properly below
      featureFlags: new Map(),
    }

    if (!isAppAdmin(ctx)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'App admin access required' } },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { action, organizationId } = body

    if (!action || !organizationId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'action and organizationId are required' } },
        { status: 400 }
      )
    }

    // Fetch target user
    const [targetUser] = await superadminDb
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1)

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    // Fetch membership
    const [membership] = await superadminDb
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, targetUserId),
          eq(organizationMembers.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User is not a member of this organization' } },
        { status: 404 }
      )
    }

    // Perform action
    switch (action) {
      case 'grant_app_admin':
        await superadminDb
          .update(organizationMembers)
          .set({ isAppAdmin: true, updatedAt: new Date() })
          .where(eq(organizationMembers.id, membership.id))
        break

      case 'revoke_app_admin':
        await superadminDb
          .update(organizationMembers)
          .set({ isAppAdmin: false, updatedAt: new Date() })
          .where(eq(organizationMembers.id, membership.id))
        break

      default:
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid action' } },
          { status: 400 }
        )
    }

    // Log the action
    await superadminDb.insert(auditLogs).values({
      userId: currentUser.id,
      userEmail: currentUser.email,
      organizationId,
      action: `user.${action}`,
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: {
        targetUserId,
        targetEmail: targetUser.email,
        action,
        organizationId,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      isSuperadminAction: currentUser.isSuperadmin ? new Date() : null,
    })

    return NextResponse.json({
      success: true,
      data: {
        userId: targetUserId,
        action,
        message: `Action '${action}' completed successfully`,
      },
    })
  } catch (error) {
    console.error('Error updating user:', error)

    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: error.message } },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update user' } },
      { status: 500 }
    )
  }
}
