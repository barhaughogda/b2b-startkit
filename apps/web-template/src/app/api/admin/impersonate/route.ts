import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { getServerAuth, requireAuth } from '@startkit/auth/server'
import { superadminDb } from '@startkit/database'
import { users, auditLogs } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'
import { env } from '@startkit/config'

/**
 * Start impersonation session
 * POST /api/admin/impersonate
 *
 * Body: { userId: string }
 *
 * Only superadmins can impersonate users.
 * Impersonation sessions expire after 1 hour.
 */
export async function POST(req: NextRequest) {
  try {
    const authContext = await requireAuth()

    // Check if user is superadmin
    if (!authContext.user.isSuperadmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Superadmin access required' } },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { userId: targetUserId } = body

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'userId is required' } },
        { status: 400 }
      )
    }

    // Fetch target user from database
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

    // Prevent superadmin-to-superadmin impersonation
    if (targetUser.isSuperadmin) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot impersonate another superadmin' },
        },
        { status: 403 }
      )
    }

    // Update Clerk user metadata to start impersonation
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(targetUser.clerkId, {
      publicMetadata: {
        impersonatedBy: authContext.user.clerkUserId,
        impersonatedAt: new Date().toISOString(),
      },
    })

    // Log impersonation start
    await superadminDb.insert(auditLogs).values({
      userId: authContext.user.userId,
      userEmail: authContext.user.email,
      action: 'impersonation.started',
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: {
        targetUserId,
        targetEmail: targetUser.email,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      isSuperadminAction: new Date(),
    })

    return NextResponse.json({
      success: true,
      data: {
        targetUserId,
        targetEmail: targetUser.email,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    })
  } catch (error) {
    console.error('Error starting impersonation:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to start impersonation' } },
      { status: 500 }
    )
  }
}

/**
 * End impersonation session
 * DELETE /api/admin/impersonate
 */
export async function DELETE(req: NextRequest) {
  try {
    const authContext = await getServerAuth()

    if (!authContext) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Check if currently impersonating
    if (!authContext.user.isImpersonating) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Not currently impersonating' } },
        { status: 400 }
      )
    }

    // Get impersonator (must be superadmin)
    if (!authContext.user.impersonatorId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid impersonation session' } },
        { status: 400 }
      )
    }

    const [impersonator] = await superadminDb
      .select()
      .from(users)
      .where(eq(users.id, authContext.user.impersonatorId))
      .limit(1)

    if (!impersonator || !impersonator.isSuperadmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Invalid impersonation session' } },
        { status: 403 }
      )
    }

    // Clear impersonation metadata from Clerk
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(authContext.user.clerkUserId, {
      publicMetadata: {
        impersonatedBy: null,
        impersonatedAt: null,
      },
    })

    // Log impersonation end
    await superadminDb.insert(auditLogs).values({
      userId: impersonator.id,
      userEmail: impersonator.email,
      action: 'impersonation.ended',
      resourceType: 'user',
      resourceId: authContext.user.userId,
      metadata: {
        targetUserId: authContext.user.userId,
        targetEmail: authContext.user.email,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      isSuperadminAction: new Date(),
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Impersonation ended' },
    })
  } catch (error) {
    console.error('Error ending impersonation:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to end impersonation' } },
      { status: 500 }
    )
  }
}
