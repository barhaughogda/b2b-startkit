import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { requireSuperadmin } from '@/lib/auth'
import { superadminDb } from '@startkit/database'
import { users, auditLogs } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Update user (grant/revoke superadmin, deactivate)
 * PATCH /api/admin/users/[id]
 *
 * Body: { action: 'grant_superadmin' | 'revoke_superadmin' | 'deactivate' | 'force_password_reset' }
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireSuperadmin()
    const { id: targetUserId } = await params

    const body = await req.json()
    const { action } = body

    if (!action) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'action is required' } },
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

    // Prevent self-modification for critical actions
    if (targetUser.id === admin.userId && ['revoke_superadmin', 'deactivate'].includes(action)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cannot modify your own account this way' } },
        { status: 403 }
      )
    }

    const clerk = await clerkClient()

    switch (action) {
      case 'grant_superadmin':
        await superadminDb
          .update(users)
          .set({ isSuperadmin: true, updatedAt: new Date() })
          .where(eq(users.id, targetUserId))
        break

      case 'revoke_superadmin':
        await superadminDb
          .update(users)
          .set({ isSuperadmin: false, updatedAt: new Date() })
          .where(eq(users.id, targetUserId))
        break

      case 'deactivate':
        // Ban user in Clerk
        await clerk.users.banUser(targetUser.clerkId)
        break

      case 'force_password_reset':
        // Note: Clerk handles password reset via email
        // We can trigger this through the API
        // For now, just log the action
        break

      default:
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid action' } },
          { status: 400 }
        )
    }

    // Log the action
    await superadminDb.insert(auditLogs).values({
      userId: admin.userId,
      userEmail: admin.email,
      action: `user.${action}`,
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: {
        targetUserId,
        targetEmail: targetUser.email,
        action,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      isSuperadminAction: new Date(),
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

    if (error instanceof Error && error.message.includes('Superadmin')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: error.message } },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update user' } },
      { status: 500 }
    )
  }
}
