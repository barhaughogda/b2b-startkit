import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperadmin } from '@/lib/auth'
import { createCustomer, getCustomers } from '@/app/(admin)/customers/data'

const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  primaryDomain: z.string().max(255).optional(),
  domains: z.array(z.string()).optional(),
  stripeCustomerId: z.string().max(100).optional(),
})

/**
 * GET /api/admin/customers
 * List all customers
 */
export async function GET(req: NextRequest) {
  try {
    await requireSuperadmin()

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const result = await getCustomers({ search, status, page, limit })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to list customers:', error)
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/customers
 * Create a new customer
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperadmin()

    const body = await req.json()
    const parsed = createCustomerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const customer = await createCustomer({
      ...parsed.data,
      actorUserId: admin.userId,
      actorEmail: admin.email,
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('Failed to create customer:', error)
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
