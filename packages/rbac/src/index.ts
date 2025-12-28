/**
 * @startkit/rbac
 *
 * Role-based access control (RBAC) and feature flag system.
 *
 * @ai-context This package provides:
 * - Permission checking (can user do X?)
 * - Role definitions with bundled permissions
 * - Feature flag evaluation
 * - Plan-based access control
 *
 * CRITICAL: Always check permissions before mutations.
 * Never bypass permission checks.
 */

// Permission checking
export { can, canAll, canAny, requirePermission, clearPermissionCache, PermissionDeniedError } from './permissions'

// Role definitions
export { ROLES, getRolePermissions, isRoleAtLeast, clearRolePermissionsCache } from './roles'

// Feature flags
export { hasFeature, getFeatureFlags, evaluateFeatureFlag, getPlanDefaultFlags, planMeetsMinimum } from './flags'

// Feature flags database helpers
export {
  loadOrganizationFeatureFlags,
  getAllFeatureFlagDefinitions,
  getFeatureFlagDefinition,
  setOrganizationFeatureFlag,
  removeOrganizationFeatureFlag,
} from './feature-flags-db'

// Types
export type { PermissionContext, RoleDefinition, FeatureFlagContext } from './types'
