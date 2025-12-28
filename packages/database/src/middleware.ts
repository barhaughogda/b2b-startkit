import type { NextRequest, NextResponse } from 'next/server'
import type { TenantContext } from '@startkit/config'
import { withTenant } from './tenant'

/**
 * Tenant middleware for Next.js API routes
 * Injects organization context from Clerk and wraps handler with tenant context
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   return withTenantMiddleware(request, async (ctx) => {
 *     // ctx contains organizationId and userId
 *     // All queries are automatically tenant-isolated
 *     const projects = await db.query.projects.findMany()
 *     return Response.json({ projects })
 *   })
 * }
 * ```
 */
export async function withTenantMiddleware<T>(
  request: NextRequest,
  handler: (ctx: TenantContext) => Promise<NextResponse<T>>
): Promise<NextResponse<T>> {
  // Extract tenant context from request headers or Clerk session
  // This should be set by auth middleware before reaching this point
  const organizationId = request.headers.get('x-organization-id')
  const userId = request.headers.get('x-user-id')
  const isSuperadmin = request.headers.get('x-is-superadmin') === 'true'

  if (!organizationId || !userId) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: {
          code: 'TENANT_CONTEXT_REQUIRED',
          message: 'Organization and user context required',
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    ) as NextResponse<T>
  }

  return withTenant(
    {
      organizationId,
      userId,
      isSuperadmin,
    },
    async () => {
      return handler({ organizationId, userId })
    }
  )
}

/**
 * Create a tenant-aware API route handler
 * Wraps a handler function with tenant context injection
 *
 * @example
 * ```ts
 * export const GET = createTenantHandler(async (ctx, request) => {
 *   const projects = await db.query.projects.findMany()
 *   return Response.json({ projects })
 * })
 * ```
 */
export function createTenantHandler<T>(
  handler: (ctx: TenantContext, request: NextRequest) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    return withTenantMiddleware(request, async (ctx) => {
      return handler(ctx, request)
    })
  }
}
