import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperadmin } from '@/lib/auth'
import { createProductKey, getProductById } from '@/app/(admin)/products/data'

const createKeySchema = z.object({
  label: z.string().max(100).optional(),
  expiresAt: z.string().datetime().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/products/[id]/keys
 * Create a new signing key for a product
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireSuperadmin()
    const { id: productId } = await params

    // Verify product exists
    const product = await getProductById(productId)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = createKeySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await createProductKey({
      productId,
      label: parsed.data.label,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      actorUserId: admin.userId,
      actorEmail: admin.email,
    })

    // Return both the key metadata and the secret (only shown once)
    return NextResponse.json({
      key: result.key,
      secret: result.secret,
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create product key:', error)
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
