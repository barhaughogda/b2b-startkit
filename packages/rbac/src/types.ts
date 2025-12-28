import type { Permission, OrganizationRole, PlanTier, FeatureFlagKey } from '@startkit/config'

/**
 * Context required for permission checks
 */
export interface PermissionContext {
  /** User's role in the organization */
  role: OrganizationRole
  /** Custom permissions granted to this user */
  customPermissions: Permission[]
  /** Organization's subscription plan */
  plan: PlanTier
  /** Whether user is a global superadmin */
  isSuperadmin: boolean
  /** Active feature flags for this org */
  featureFlags: Map<FeatureFlagKey, boolean>
}

/**
 * Role definition with bundled permissions
 */
export interface RoleDefinition {
  name: OrganizationRole
  displayName: string
  description: string
  /** Permissions included in this role */
  permissions: Permission[]
  /** Higher = more permissions (owner > admin > member) */
  level: number
}

/**
 * Feature flag evaluation context
 */
export interface FeatureFlagContext {
  organizationId: string
  userId: string
  plan: PlanTier
  role: OrganizationRole
}

/**
 * Permission definition for documentation
 */
export interface PermissionDefinition {
  key: Permission
  name: string
  description: string
  /** Minimum role required by default */
  minimumRole: OrganizationRole
  /** Minimum plan required */
  minimumPlan?: PlanTier
}
