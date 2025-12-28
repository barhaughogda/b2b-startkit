/**
 * @startkit/rbac/server
 *
 * Server-only exports from @startkit/rbac
 * These exports use database connections and should
 * never be imported in client components.
 *
 * @ai-context Use this export path for server-side code only.
 * Client code should import from '@startkit/rbac' directly.
 */

// Feature flags database helpers (server-only - uses database)
export {
  loadOrganizationFeatureFlags,
  getAllFeatureFlagDefinitions,
  getFeatureFlagDefinition,
  setOrganizationFeatureFlag,
  removeOrganizationFeatureFlag,
} from './feature-flags-db'

// Kill switches (server-only - uses database)
export {
  checkKillSwitch,
  isFeatureBlocked,
  isOrganizationBlocked,
  activateKillSwitch,
  deactivateKillSwitch,
  getActiveKillSwitches,
  suspendOrganization,
  unsuspendOrganization,
} from './kill-switch'

// Re-export types
export type { KillSwitchContext, KillSwitchResult, ActiveKillSwitch } from './kill-switch'
