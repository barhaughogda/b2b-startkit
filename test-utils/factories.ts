/**
 * Test Data Factories
 * 
 * Factories for creating test data objects. Use these instead of manually
 * constructing objects to ensure consistency and make tests more maintainable.
 */

import type {
  User,
  Organization,
  OrganizationMember,
  Subscription,
} from '@startkit/database'
import type { OrganizationSettings } from '@startkit/database'

/**
 * Create a mock user object
 */
export function createMockUser(overrides?: Partial<User>): User {
  const id = overrides?.id || `user_${Math.random().toString(36).substr(2, 9)}`
  return {
    id,
    clerkId: overrides?.clerkId || `clerk_${id}`,
    email: overrides?.email || `user-${id}@example.com`,
    name: overrides?.name || `Test User ${id}`,
    avatarUrl: overrides?.avatarUrl || null,
    isSuperadmin: overrides?.isSuperadmin || false,
    createdAt: overrides?.createdAt || new Date(),
    updatedAt: overrides?.updatedAt || new Date(),
  }
}

/**
 * Create a mock organization object
 */
export function createMockOrganization(overrides?: Partial<Organization>): Organization {
  const id = overrides?.id || `org_${Math.random().toString(36).substr(2, 9)}`
  const slug = overrides?.slug || `test-org-${id}`
  return {
    id,
    clerkOrgId: overrides?.clerkOrgId || `clerk_org_${id}`,
    name: overrides?.name || `Test Organization ${id}`,
    slug,
    settings: overrides?.settings || ({} as OrganizationSettings),
    createdAt: overrides?.createdAt || new Date(),
    updatedAt: overrides?.updatedAt || new Date(),
  }
}

/**
 * Create a mock organization member object
 */
export function createMockOrganizationMember(
  overrides?: Partial<OrganizationMember>
): OrganizationMember {
  const id = overrides?.id || `member_${Math.random().toString(36).substr(2, 9)}`
  return {
    id,
    organizationId: overrides?.organizationId || `org_${id}`,
    userId: overrides?.userId || `user_${id}`,
    role: overrides?.role || 'member',
    customPermissions: overrides?.customPermissions || [],
    joinedAt: overrides?.joinedAt || new Date(),
    updatedAt: overrides?.updatedAt || new Date(),
  }
}

/**
 * Create a mock subscription object
 */
export function createMockSubscription(overrides?: Partial<Subscription>): Subscription {
  const id = overrides?.id || `sub_${Math.random().toString(36).substr(2, 9)}`
  const now = new Date()
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  return {
    id,
    organizationId: overrides?.organizationId || `org_${id}`,
    stripeCustomerId: overrides?.stripeCustomerId || `cus_${id}`,
    stripeSubscriptionId: overrides?.stripeSubscriptionId || `sub_${id}`,
    stripePriceId: overrides?.stripePriceId || `price_${id}`,
    status: overrides?.status || 'active',
    plan: overrides?.plan || 'free',
    currentPeriodStart: overrides?.currentPeriodStart || now,
    currentPeriodEnd: overrides?.currentPeriodEnd || periodEnd,
    cancelAtPeriodEnd: overrides?.cancelAtPeriodEnd || null,
    canceledAt: overrides?.canceledAt || null,
    usageLimits: overrides?.usageLimits || {},
    seatCount: overrides?.seatCount || 1,
    maxSeats: overrides?.maxSeats || null,
    createdAt: overrides?.createdAt || now,
    updatedAt: overrides?.updatedAt || now,
  }
}

/**
 * Create multiple mock users
 */
export function createMockUsers(count: number, overrides?: Partial<User>): User[] {
  return Array.from({ length: count }, () => createMockUser(overrides))
}

/**
 * Create multiple mock organizations
 */
export function createMockOrganizations(
  count: number,
  overrides?: Partial<Organization>
): Organization[] {
  return Array.from({ length: count }, () => createMockOrganization(overrides))
}
