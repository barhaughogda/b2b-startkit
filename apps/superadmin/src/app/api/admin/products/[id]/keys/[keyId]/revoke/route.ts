import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/auth'
import { revokeProductKey } from '@/app/(admin)/products/data'

interface RouteParams {
  params: Promise<{ id: string; keyId: string }>
}

/**
 * POST /api/admin/products/[id]/keys/[keyId]/revoke
 * Revoke a signing key
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireSuperadmin()
    const { keyId } = await params

    await revokeProductKey(keyId, {
      userId: admin.userId,
      email: admin.email,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to revoke key:', error)
    if (error instanceof Error) {
      if (error.message.includes('required')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'Key not found') {
        return NextResponse.json({ error: 'Key not found' }, { status: 404 })
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
