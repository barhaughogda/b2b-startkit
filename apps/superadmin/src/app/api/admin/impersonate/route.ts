import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { requireSuperadmin } from '@/lib/auth'
import { superadminDb } from '@startkit/database'
import { users, auditLogs } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'

/**
 * Start impersonation session
 * POST /api/admin/impersonate
 *
 * Body: { userId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperadmin()

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
        impersonatedBy: admin.clerkUserId,
        impersonatedAt: new Date().toISOString(),
      },
    })

    // Log impersonation start
    await superadminDb.insert(auditLogs).values({
      userId: admin.userId,
      userEmail: admin.email,
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
    
    if (error instanceof Error && error.message.includes('Superadmin')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: error.message } },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to start impersonation' } },
      { status: 500 }
    )
  }
}

/**
 * End impersonation session
 * DELETE /api/admin/impersonate
 *
 * Body: { userId: string } - the user being impersonated
 */
export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireSuperadmin()

    const body = await req.json()
    const { userId: targetUserId } = body

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'userId is required' } },
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

    // Clear impersonation metadata from Clerk
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(targetUser.clerkId, {
      publicMetadata: {
        impersonatedBy: null,
        impersonatedAt: null,
      },
    })

    // Log impersonation end
    await superadminDb.insert(auditLogs).values({
      userId: admin.userId,
      userEmail: admin.email,
      action: 'impersonation.ended',
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: {
        targetUserId,
        targetEmail: targetUser.email,
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
