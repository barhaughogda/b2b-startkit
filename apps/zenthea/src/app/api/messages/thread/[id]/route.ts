import { NextResponse } from 'next/server'
import { requireOrganization } from '@startkit/auth/server'
import { withTenant } from '@startkit/database/tenant'
import { MessageService } from '@/lib/db/services/message.service'

/**
 * GET /api/messages/thread/[id]
 * Get a message thread by ID
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { organization, user } = await requireOrganization()
    
    return await withTenant(
      { organizationId: organization.organizationId, userId: user.userId },
      async () => {
        const thread = await MessageService.getThread(id, organization.organizationId)
        return NextResponse.json(thread)
      }
    )
  } catch (error: any) {
    console.error('Error fetching thread:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
