import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { withTenant } from '@startkit/database/tenant'
import { NotificationService } from '@/lib/db/services/notification.service'

/**
 * GET /api/notifications
 * List all notifications for the current user
 */
export async function GET() {
  try {
    const { organization, user } = await requireOrganization()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        const list = await NotificationService.getUserNotifications(user.userId, organization.organizationId)
        return NextResponse.json(list)
      }
    )
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
