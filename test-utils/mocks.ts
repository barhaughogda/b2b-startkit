/**
 * Mock Implementations
 * 
 * Reusable mocks for external services and dependencies.
 * Use these to avoid hitting real APIs during tests.
 */

import { vi } from 'vitest'

/**
 * Mock Clerk authentication
 */
export function createMockClerkAuth() {
  return {
    userId: 'user_test123',
    sessionId: 'sess_test123',
    orgId: 'org_test123',
    orgRole: 'admin' as const,
    orgSlug: 'test-org',
    isSignedIn: true,
  }
}

/**
 * Mock Clerk client
 */
export function createMockClerkClient() {
  return {
    users: {
      getUser: vi.fn(),
      getUserList: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
    },
    organizations: {
      getOrganization: vi.fn(),
      getOrganizationList: vi.fn(),
      createOrganization: vi.fn(),
      updateOrganization: vi.fn(),
      deleteOrganization: vi.fn(),
    },
    organizationMemberships: {
      getMembershipList: vi.fn(),
      createMembership: vi.fn(),
      updateMembership: vi.fn(),
      deleteMembership: vi.fn(),
    },
  }
}

/**
 * Mock Stripe client
 */
export function createMockStripeClient() {
  return {
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
    },
    subscriptions: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
      list: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  }
}

/**
 * Mock database client
 */
export function createMockDatabaseClient() {
  return {
    query: {
      users: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      organizations: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      subscriptions: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
    transaction: vi.fn(),
  }
}

/**
 * Mock Next.js request/response
 */
export function createMockNextRequest() {
  return {
    headers: new Headers(),
    method: 'GET',
    url: 'http://localhost:3000/api/test',
    json: vi.fn(),
    text: vi.fn(),
    formData: vi.fn(),
  }
}

export function createMockNextResponse() {
  return {
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: vi.fn(),
    text: vi.fn(),
    redirect: vi.fn(),
  }
}

/**
 * Mock PostHog analytics client
 */
export function createMockPostHogClient() {
  return {
    capture: vi.fn(),
    identify: vi.fn(),
    groupIdentify: vi.fn(),
    reset: vi.fn(),
    shutdown: vi.fn(),
  }
}

/**
 * Reset all mocks
 */
export function resetAllMocks() {
  vi.clearAllMocks()
}
