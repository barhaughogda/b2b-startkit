import { NextResponse } from 'next/server'
import { requireRole } from '@startkit/auth/server'
import { clerkClient } from '@clerk/nextjs/server'

/**
 * PATCH /api/company/settings/organization
 * Update the organization's global identity in Clerk.
 * This will trigger a webhook to sync changes back to our database.
 */
export async function PATCH(req: Request) {
  try {
    const { organization } = await requireRole('admin')
    const body = await req.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Update organization in Clerk
    const client = await clerkClient()
    const updatedOrg = await client.organizations.updateOrganization(organization.clerkOrgId, {
      name,
    })

    return NextResponse.json({ 
      success: true, 
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name
      }
    })
  } catch (error: any) {
    console.error('Error updating organization in Clerk:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
