import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperadmin } from '@/lib/auth'
import { linkProductOrgToCustomer, getCustomerById } from '@/app/(admin)/customers/data'

const linkOrgSchema = z.object({
  productOrgId: z.string().uuid(),
  linkMethod: z.enum(['manual', 'domain_verified', 'sso', 'invited']),
  notes: z.string().max(500).optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/customers/[id]/links
 * Link a product org to a customer
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireSuperadmin()
    const { id: customerId } = await params

    // Verify customer exists
    const customer = await getCustomerById(customerId)
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = linkOrgSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const link = await linkProductOrgToCustomer({
      customerId,
      productOrgId: parsed.data.productOrgId,
      linkMethod: parsed.data.linkMethod,
      notes: parsed.data.notes,
      actorUserId: admin.userId,
      actorEmail: admin.email,
    })

    return NextResponse.json(link, { status: 201 })
  } catch (error) {
    console.error('Failed to link product org:', error)
    if (error instanceof Error) {
      if (error.message.includes('required')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message.includes('already linked')) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
