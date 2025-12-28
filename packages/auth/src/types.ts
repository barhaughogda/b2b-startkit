import type { OrganizationRole, UserId, OrganizationId, ClerkUserId, ClerkOrgId } from '@startkit/config'

/**
 * Authentication context available after user signs in
 */
export interface AuthContext {
  /** Internal user ID (from our database) */
  userId: UserId
  /** Clerk user ID */
  clerkUserId: ClerkUserId
  /** User's email address */
  email: string
  /** User's display name */
  name: string | null
  /** User's avatar URL */
  avatarUrl: string | null
  /** Whether user is a global superadmin */
  isSuperadmin: boolean
  /** Whether this session is an impersonation */
  isImpersonating: boolean
  /** Original admin user ID if impersonating */
  impersonatorId: UserId | null
}

/**
 * Organization context when user is in an organization
 */
export interface OrganizationContext {
  /** Internal organization ID (from our database) */
  organizationId: OrganizationId
  /** Clerk organization ID */
  clerkOrgId: ClerkOrgId
  /** Organization name */
  name: string
  /** Organization slug (URL-safe identifier) */
  slug: string
  /** User's role in this organization */
  role: OrganizationRole
  /** Organization's subscription plan */
  plan: string
}

/**
 * Combined context for authenticated requests
 */
export interface RequestAuthContext {
  user: AuthContext
  organization: OrganizationContext | null
}

/**
 * Clerk webhook event types we handle
 */
export type ClerkWebhookEvent =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'organization.created'
  | 'organization.updated'
  | 'organization.deleted'
  | 'organizationMembership.created'
  | 'organizationMembership.updated'
  | 'organizationMembership.deleted'
