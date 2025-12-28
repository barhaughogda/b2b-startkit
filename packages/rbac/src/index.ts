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
 * - Kill switch evaluation
 *
 * CRITICAL: Always check permissions before mutations.
 * Never bypass permission checks.
 */

// Permission checking
export { can, canAll, canAny, requirePermission, clearPermissionCache, PermissionDeniedError } from './permissions'

// Role definitions
export { ROLES, getRolePermissions, isRoleAtLeast, clearRolePermissionsCache } from './roles'

// Feature flags (client-safe - no database dependencies)
export { hasFeature, getFeatureFlags, evaluateFeatureFlag, getPlanDefaultFlags, planMeetsMinimum } from './flags'

// Server-only exports moved to './server' to prevent client bundling issues
// Import database-related functions from '@startkit/rbac/server' in server code

// Types
export type { PermissionContext, RoleDefinition, FeatureFlagContext } from './types'