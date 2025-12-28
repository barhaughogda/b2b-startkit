import { AsyncLocalStorage } from 'async_hooks'
import type { TenantContext } from '@startkit/config'

/**
 * Async local storage for tenant context
 * Ensures tenant isolation across async boundaries
 *
 * @ai-no-modify Tenant isolation is critical for security
 */
const tenantStorage = new AsyncLocalStorage<TenantContext>()

/**
 * Get the current tenant context
 * Returns null if not in a tenant context
 */
export function getTenantContext(): TenantContext | null {
  return tenantStorage.getStore() ?? null
}

/**
 * Get the current tenant context or throw
 * Use this when tenant context is required
 */
export function requireTenantContext(): TenantContext {
  const ctx = getTenantContext()
  if (!ctx) {
    throw new Error('Tenant context is required but not available')
  }
  return ctx
}

/**
 * Run a function within a tenant context
 * All database queries within this scope will be tenant-isolated
 *
 * @example
 * await withTenant({ organizationId, userId }, async () => {
 *   const projects = await db.query.projects.findMany()
 *   // projects are automatically filtered by organizationId
 * })
 *
 * @ai-context This is the PRIMARY mechanism for multi-tenancy.
 * Always wrap request handlers with withTenant.
 */
export async function withTenant<T>(
  context: TenantContext,
  fn: () => Promise<T>
): Promise<T> {
  return tenantStorage.run(context, fn)
}

/**
 * Higher-order function to wrap an async handler with tenant context
 *
 * @example
 * const handler = withTenantContext(async (ctx) => {
 *   // ctx contains organizationId and userId
 *   const projects = await db.query.projects.findMany()
 * })
 */
export function withTenantContext<T extends unknown[], R>(
  fn: (ctx: TenantContext, ...args: T) => Promise<R>
) {
  return async (context: TenantContext, ...args: T): Promise<R> => {
    return withTenant(context, () => fn(context, ...args))
  }
}
