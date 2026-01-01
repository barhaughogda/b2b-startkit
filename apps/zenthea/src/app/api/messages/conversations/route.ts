import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { withTenant } from '@startkit/database/tenant'
import { MessageService } from '@/lib/db/services/message.service'

/**
 * GET /api/messages/conversations
 * List all conversations for the current user
 */
export async function GET() {
  try {
    const { organization, user } = await requireOrganization()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId, isSuperadmin: user.isSuperadmin },
      async () => {
        const conversations = await MessageService.getConversations(user.userId, organization.organizationId)
        return NextResponse.json(conversations)
      }
    )
  } catch (error: any) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
