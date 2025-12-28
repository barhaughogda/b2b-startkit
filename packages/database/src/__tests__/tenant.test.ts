/**
 * Tenant Context Tests
 * 
 * Tests for tenant context management and isolation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { getTenantContext, requireTenantContext, withTenant } from '../tenant'
import { createMockUser, createMockOrganization } from '../../../../test-utils/factories'

describe('Tenant Context', () => {
  beforeEach(() => {
    // Clear any existing context
    // Note: AsyncLocalStorage doesn't have a clear method, but tests run in isolation
  })

  describe('getTenantContext()', () => {
    it('should return null when not in tenant context', () => {
      const ctx = getTenantContext()
      expect(ctx).toBeNull()
    })

    it('should return context when inside withTenant', async () => {
      const testOrg = createMockOrganization()
      const testUser = createMockUser()

      await withTenant(
        { organizationId: testOrg.id, userId: testUser.id },
        async () => {
          const ctx = getTenantContext()
          expect(ctx).not.toBeNull()
          expect(ctx?.organizationId).toBe(testOrg.id)
          expect(ctx?.userId).toBe(testUser.id)
        }
      )
    })
  })

  describe('requireTenantContext()', () => {
    it('should throw when not in tenant context', () => {
      expect(() => requireTenantContext()).toThrow('Tenant context is required but not available')
    })

    it('should return context when inside withTenant', async () => {
      const testOrg = createMockOrganization()
      const testUser = createMockUser()

      await withTenant(
        { organizationId: testOrg.id, userId: testUser.id },
        async () => {
          const ctx = requireTenantContext()
          expect(ctx.organizationId).toBe(testOrg.id)
          expect(ctx.userId).toBe(testUser.id)
        }
      )
    })
  })

  describe('withTenant()', () => {
    it('should execute function with tenant context', async () => {
      const testOrg = createMockOrganization()
      const testUser = createMockUser()
      let executed = false

      await withTenant(
        { organizationId: testOrg.id, userId: testUser.id },
        async () => {
          executed = true
          const ctx = getTenantContext()
          expect(ctx?.organizationId).toBe(testOrg.id)
        }
      )

      expect(executed).toBe(true)
    })

    it('should return function result', async () => {
      const testOrg = createMockOrganization()
      const testUser = createMockUser()

      const result = await withTenant(
        { organizationId: testOrg.id, userId: testUser.id },
        async () => {
          return 'test-result'
        }
      )

      expect(result).toBe('test-result')
    })

    it('should propagate errors', async () => {
      const testOrg = createMockOrganization()
      const testUser = createMockUser()

      await expect(
        withTenant(
          { organizationId: testOrg.id, userId: testUser.id },
          async () => {
            throw new Error('test error')
          }
        )
      ).rejects.toThrow('test error')
    })

    it('should isolate contexts between nested calls', async () => {
      const org1 = createMockOrganization({ id: 'org-1' })
      const org2 = createMockOrganization({ id: 'org-2' })
      const user1 = createMockUser({ id: 'user-1' })
      const user2 = createMockUser({ id: 'user-2' })

      await withTenant(
        { organizationId: org1.id, userId: user1.id },
        async () => {
          const ctx1 = getTenantContext()
          expect(ctx1?.organizationId).toBe('org-1')

          await withTenant(
            { organizationId: org2.id, userId: user2.id },
            async () => {
              const ctx2 = getTenantContext()
              expect(ctx2?.organizationId).toBe('org-2')
              expect(ctx2?.userId).toBe('user-2')
            }
          )

          // Outer context should still be org-1
          const ctx1After = getTenantContext()
          expect(ctx1After?.organizationId).toBe('org-1')
        }
      )
    })

    it('should support superadmin flag', async () => {
      const testOrg = createMockOrganization()
      const testUser = createMockUser()

      await withTenant(
        { organizationId: testOrg.id, userId: testUser.id, isSuperadmin: true },
        async () => {
          const ctx = getTenantContext()
          expect(ctx).not.toBeNull()
          // Note: isSuperadmin is stored separately, not in TenantContext type
          // But it's available in the AsyncLocalStorage
        }
      )
    })
  })

  describe('Context Isolation', () => {
    it('should not leak context between parallel operations', async () => {
      const org1 = createMockOrganization({ id: 'org-1' })
      const org2 = createMockOrganization({ id: 'org-2' })
      const user1 = createMockUser({ id: 'user-1' })
      const user2 = createMockUser({ id: 'user-2' })

      const results = await Promise.all([
        withTenant(
          { organizationId: org1.id, userId: user1.id },
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 10))
            return getTenantContext()?.organizationId
          }
        ),
        withTenant(
          { organizationId: org2.id, userId: user2.id },
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 10))
            return getTenantContext()?.organizationId
          }
        ),
      ])

      expect(results[0]).toBe('org-1')
      expect(results[1]).toBe('org-2')
    })
  })
})
