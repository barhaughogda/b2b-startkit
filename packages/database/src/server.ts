/**
 * @startkit/database/server
 *
 * Server-only exports from @startkit/database
 * These exports use Node.js built-ins like async_hooks and should
 * never be imported in client components.
 *
 * @ai-context Use this export path for server-side code only.
 * Client code should import from '@startkit/database' directly.
 */

export {
  withTenant,
  getTenantContext,
  setTenantContext,
  requireTenantContext,
} from './tenant'
export { withTenantMiddleware, createTenantHandler } from './middleware'
