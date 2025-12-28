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
export { can, canAll, canAny, requirePermission } from './permissions'

// Role definitions
export { ROLES, getRolePermissions, isRoleAtLeast } from './roles'

// Feature flags
export { hasFeature, getFeatureFlags, evaluateFeatureFlag } from './flags'

// Types
export type { PermissionContext, RoleDefinition, FeatureFlagContext } from './types'
