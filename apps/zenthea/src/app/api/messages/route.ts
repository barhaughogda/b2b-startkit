import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { withTenant } from '@startkit/database/tenant'
import { MessageService } from '@/lib/db/services/message.service'

/**
 * GET /api/messages
 * List all messages for the current user
 */
export async function GET() {
  try {
    const { organization, user } = await requireOrganization()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        const list = await MessageService.getUserMessages(user.userId, organization.organizationId)
        return NextResponse.json(list)
      }
    )
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/messages
 * Send a new message
 */
export async function POST(req: Request) {
  try {
    const { organization, user } = await requireOrganization()
    const body = await req.json()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        const message = await MessageService.sendMessage(
          body, 
          organization.organizationId, 
          user.userId
        )
        return NextResponse.json(message, { status: 201 })
      }
    )
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
