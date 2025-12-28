// Server-only module - async_hooks is a Node.js built-in
// This file should never be imported in client components
import { AsyncLocalStorage } from 'async_hooks'
import type { TenantContext } from '@startkit/config'
import { getPostgresClient } from './client'

/**
 * Async local storage for tenant context
 * Ensures tenant isolation across async boundaries
 *
 * @ai-no-modify Tenant isolation is critical for security
 */
const tenantStorage = new AsyncLocalStorage<TenantContext & { isSuperadmin?: boolean }>()

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
 * Set tenant context in Postgres session for RLS policies
 * This executes SQL to set session variables that RLS policies can read
 *
 * @param organizationId - Organization ID for tenant isolation
 * @param userId - User ID for user-scoped policies
 * @param isSuperadmin - Whether the user is a superadmin (bypasses RLS)
 *
 * @ai-context This sets Postgres session variables that RLS policies use.
 * Must be called before any queries in a tenant context.
 * Uses SET (not SET LOCAL) so variables persist for the connection session.
 * Note: With connection pooling, variables are reset when connection is returned to pool.
 */
export async function setTenantContext(
  organizationId: string,
  userId: string,
  isSuperadmin = false
): Promise<void> {
  const sql = getPostgresClient()

  // Set session variables that RLS policies can access
  // Using SET (not SET LOCAL) so they persist for the connection session
  // Note: These will be reset when the connection is returned to the pool
  await sql`SET app.current_org_id = ${organizationId}`
  await sql`SET app.current_user_id = ${userId}`
  await sql`SET app.is_superadmin = ${isSuperadmin.toString()}`
}

/**
 * Run a function within a tenant context
 * All database queries within this scope will be tenant-isolated
 *
 * This function:
 * 1. Stores context in AsyncLocalStorage (for TypeScript access)
 * 2. Sets Postgres session variables (for RLS policies) in a transaction
 * 3. Executes the function within that transaction
 *
 * @example
 * await withTenant({ organizationId, userId }, async () => {
 *   const projects = await db.query.projects.findMany()
 *   // projects are automatically filtered by organizationId via RLS
 * })
 *
 * @ai-context This is the PRIMARY mechanism for multi-tenancy.
 * Always wrap request handlers with withTenant.
 * 
 * Note: Uses a transaction to ensure session variables are set before queries.
 * This is necessary because connection pooling resets session variables.
 */
export async function withTenant<T>(
  context: TenantContext & { isSuperadmin?: boolean },
  fn: () => Promise<T>
): Promise<T> {
  return tenantStorage.run(context, async () => {
    const sql = getPostgresClient()

    // Execute within a transaction to ensure session variables persist
    return sql.begin(async (tx) => {
      // Set Postgres session variables for RLS within transaction
      await tx`SET LOCAL app.current_org_id = ${context.organizationId}`
      await tx`SET LOCAL app.current_user_id = ${context.userId}`
      await tx`SET LOCAL app.is_superadmin = ${(context.isSuperadmin ?? false).toString()}`

      // Execute the function - all queries will use the session variables
      return fn()
    })
  })
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
