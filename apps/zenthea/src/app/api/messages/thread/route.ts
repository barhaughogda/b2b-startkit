import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { withTenant } from '@startkit/database/tenant'
import { MessageService } from '@/lib/db/services/message.service'

/**
 * GET /api/messages/thread
 * Get full thread for a conversation
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const threadId = searchParams.get('threadId')
    
    if (!threadId) {
      return NextResponse.json({ error: 'threadId is required' }, { status: 400 })
    }

    const { organization, user } = await requireOrganization()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId, isSuperadmin: user.isSuperadmin },
      async () => {
        const thread = await MessageService.getThread(threadId, organization.organizationId)
        return NextResponse.json(thread)
      }
    )
  } catch (error: any) {
    console.error('Error fetching message thread:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
