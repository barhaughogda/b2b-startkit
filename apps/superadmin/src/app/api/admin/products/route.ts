import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperadmin } from '@/lib/auth'
import { createProduct, getProducts } from '@/app/(admin)/products/data'

const createProductSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Must be lowercase letters, numbers, and hyphens only'),
  displayName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  baseUrl: z.string().url(),
  env: z.enum(['development', 'staging', 'production']),
})

/**
 * GET /api/admin/products
 * List all products
 */
export async function GET(req: NextRequest) {
  try {
    await requireSuperadmin()

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || undefined
    const env = searchParams.get('env') || undefined
    const status = searchParams.get('status') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const result = await getProducts({ search, env, status, page, limit })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to list products:', error)
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/products
 * Create a new product
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperadmin()

    const body = await req.json()
    const parsed = createProductSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const product = await createProduct({
      ...parsed.data,
      actorUserId: admin.userId,
      actorEmail: admin.email,
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Failed to create product:', error)
    if (error instanceof Error) {
      if (error.message.includes('required')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        return NextResponse.json({ error: 'Product name already exists' }, { status: 409 })
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
