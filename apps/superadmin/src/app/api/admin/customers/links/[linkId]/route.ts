import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/auth'
import { unlinkProductOrgFromCustomer } from '@/app/(admin)/customers/data'

interface RouteParams {
  params: Promise<{ linkId: string }>
}

/**
 * DELETE /api/admin/customers/links/[linkId]
 * Unlink a product org from a customer
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireSuperadmin()
    const { linkId } = await params

    await unlinkProductOrgFromCustomer(linkId, {
      userId: admin.userId,
      email: admin.email,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to unlink product org:', error)
    if (error instanceof Error) {
      if (error.message.includes('required')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'Link not found') {
        return NextResponse.json({ error: 'Link not found' }, { status: 404 })
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
