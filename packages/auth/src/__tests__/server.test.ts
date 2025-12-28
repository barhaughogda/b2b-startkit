/**
 * Auth Server Utilities Tests
 * 
 * Tests for server-side authentication utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getServerAuth, requireAuth, requireOrganization, requireRole } from '../server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createMockUser, createMockOrganization } from '../../../../test-utils/factories'
import { superadminDb } from '@startkit/database'
import { users, organizations, organizationMembers } from '@startkit/database/schema'
import { eq, and } from 'drizzle-orm'

// Mock Clerk
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}))

// Mock database
vi.mock('@startkit/database', async () => {
  const actual = await vi.importActual('@startkit/database')
  return {
    ...actual,
    superadminDb: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(),
    },
  }
})

describe('Auth Server Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getServerAuth()', () => {
    it('should return null when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
        orgRole: null,
      } as any)

      const result = await getServerAuth()
      expect(result).toBeNull()
    })

    it('should return null when Clerk user is not found', async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: 'clerk_user_123',
        orgId: null,
        orgRole: null,
      } as any)
      vi.mocked(currentUser).mockResolvedValue(null)

      const result = await getServerAuth()
      expect(result).toBeNull()
    })

    it('should return null when user is not in database', async () => {
      const mockUser = createMockUser({ clerkId: 'clerk_user_123' })

      vi.mocked(auth).mockResolvedValue({
        userId: 'clerk_user_123',
        orgId: null,
        orgRole: null,
      } as any)
      vi.mocked(currentUser).mockResolvedValue({
        id: 'clerk_user_123',
        publicMetadata: {},
      } as any)

      // Mock database query returning empty
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })
      vi.mocked(superadminDb.select).mockImplementation(mockSelect as any)

      const result = await getServerAuth()
      expect(result).toBeNull()
    })

    it('should return auth context for authenticated user without org', async () => {
      const mockUser = createMockUser({ clerkId: 'clerk_user_123' })

      vi.mocked(auth).mockResolvedValue({
        userId: 'clerk_user_123',
        orgId: null,
        orgRole: null,
      } as any)
      vi.mocked(currentUser).mockResolvedValue({
        id: 'clerk_user_123',
        publicMetadata: {},
      } as any)

      // Mock database query returning user
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      })
      vi.mocked(superadminDb.select).mockImplementation(mockSelect as any)

      const result = await getServerAuth()
      expect(result).not.toBeNull()
      expect(result?.user.userId).toBe(mockUser.id)
      expect(result?.organization).toBeNull()
    })

    it('should return auth context with organization', async () => {
      const mockUser = createMockUser({ clerkId: 'clerk_user_123' })
      const mockOrg = createMockOrganization({ clerkOrgId: 'clerk_org_123' })

      vi.mocked(auth).mockResolvedValue({
        userId: 'clerk_user_123',
        orgId: 'clerk_org_123',
        orgRole: 'admin',
      } as any)
      vi.mocked(currentUser).mockResolvedValue({
        id: 'clerk_user_123',
        publicMetadata: {},
      } as any)

      // Mock user query
      const mockUserSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      })

      // Mock org query
      const mockOrgSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockOrg]),
          }),
        }),
      })

      // Mock membership query
      const mockMemberSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ role: 'admin' }]),
          }),
        }),
      })

      vi.mocked(superadminDb.select)
        .mockImplementationOnce(mockUserSelect as any) // First call: user
        .mockImplementationOnce(mockOrgSelect as any) // Second call: org
        .mockImplementationOnce(mockMemberSelect as any) // Third call: membership

      const result = await getServerAuth()
      expect(result).not.toBeNull()
      expect(result?.user.userId).toBe(mockUser.id)
      expect(result?.organization).not.toBeNull()
      expect(result?.organization?.organizationId).toBe(mockOrg.id)
      expect(result?.organization?.role).toBe('admin')
    })

    it('should detect superadmin from database', async () => {
      const mockUser = createMockUser({ clerkId: 'clerk_user_123', isSuperadmin: true })

      vi.mocked(auth).mockResolvedValue({
        userId: 'clerk_user_123',
        orgId: null,
        orgRole: null,
      } as any)
      vi.mocked(currentUser).mockResolvedValue({
        id: 'clerk_user_123',
        publicMetadata: {},
      } as any)

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      })
      vi.mocked(superadminDb.select).mockImplementation(mockSelect as any)

      const result = await getServerAuth()
      expect(result).not.toBeNull()
      expect(result?.user.isSuperadmin).toBe(true)
    })

    it('should detect impersonation from Clerk metadata', async () => {
      const mockUser = createMockUser({ clerkId: 'clerk_user_123' })
      const mockImpersonator = createMockUser({ clerkId: 'clerk_impersonator_123' })

      vi.mocked(auth).mockResolvedValue({
        userId: 'clerk_user_123',
        orgId: null,
        orgRole: null,
      } as any)
      vi.mocked(currentUser).mockResolvedValue({
        id: 'clerk_user_123',
        publicMetadata: {
          impersonatedBy: 'clerk_impersonator_123',
        },
      } as any)

      // Mock user query (impersonated user)
      const mockUserSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      })

      // Mock impersonator query
      const mockImpersonatorSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockImpersonator]),
          }),
        }),
      })

      vi.mocked(superadminDb.select)
        .mockImplementationOnce(mockUserSelect as any)
        .mockImplementationOnce(mockImpersonatorSelect as any)

      const result = await getServerAuth()
      expect(result).not.toBeNull()
      expect(result?.user.isImpersonating).toBe(true)
      expect(result?.user.impersonatorId).toBe(mockImpersonator.id)
    })
  })

  describe('requireAuth()', () => {
    it('should throw when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
        orgRole: null,
      } as any)

      await expect(requireAuth()).rejects.toThrow('Authentication required')
    })

    it('should return context when authenticated', async () => {
      const mockUser = createMockUser({ clerkId: 'clerk_user_123' })

      vi.mocked(auth).mockResolvedValue({
        userId: 'clerk_user_123',
        orgId: null,
        orgRole: null,
      } as any)
      vi.mocked(currentUser).mockResolvedValue({
        id: 'clerk_user_123',
        publicMetadata: {},
      } as any)

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      })
      vi.mocked(superadminDb.select).mockImplementation(mockSelect as any)

      const result = await requireAuth()
      expect(result).not.toBeNull()
      expect(result.user.userId).toBe(mockUser.id)
    })
  })

  describe('requireOrganization()', () => {
    it('should throw when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
        orgRole: null,
      } as any)

      await expect(requireOrganization()).rejects.toThrow('Authentication required')
    })

    it('should throw when user is not in organization', async () => {
      const mockUser = createMockUser({ clerkId: 'clerk_user_123' })

      vi.mocked(auth).mockResolvedValue({
        userId: 'clerk_user_123',
        orgId: null,
        orgRole: null,
      } as any)
      vi.mocked(currentUser).mockResolvedValue({
        id: 'clerk_user_123',
        publicMetadata: {},
      } as any)

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      })
      vi.mocked(superadminDb.select).mockImplementation(mockSelect as any)

      await expect(requireOrganization()).rejects.toThrow('Organization context required')
    })

    it('should return context with organization', async () => {
      const mockUser = createMockUser({ clerkId: 'clerk_user_123' })
      const mockOrg = createMockOrganization({ clerkOrgId: 'clerk_org_123' })

      vi.mocked(auth).mockResolvedValue({
        userId: 'clerk_user_123',
        orgId: 'clerk_org_123',
        orgRole: 'admin',
      } as any)
      vi.mocked(currentUser).mockResolvedValue({
        id: 'clerk_user_123',
        publicMetadata: {},
      } as any)

      const mockUserSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      })

      const mockOrgSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockOrg]),
          }),
        }),
      })

      const mockMemberSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ role: 'admin' }]),
          }),
        }),
      })

      vi.mocked(superadminDb.select)
        .mockImplementationOnce(mockUserSelect as any)
        .mockImplementationOnce(mockOrgSelect as any)
        .mockImplementationOnce(mockMemberSelect as any)

      const result = await requireOrganization()
      expect(result.organization).not.toBeNull()
      expect(result.organization.organizationId).toBe(mockOrg.id)
    })
  })

  describe('requireRole()', () => {
    it('should throw when user does not have required role', async () => {
      const mockUser = createMockUser({ clerkId: 'clerk_user_123' })
      const mockOrg = createMockOrganization({ clerkOrgId: 'clerk_org_123' })

      vi.mocked(auth).mockResolvedValue({
        userId: 'clerk_user_123',
        orgId: 'clerk_org_123',
        orgRole: 'member',
      } as any)
      vi.mocked(currentUser).mockResolvedValue({
        id: 'clerk_user_123',
        publicMetadata: {},
      } as any)

      const mockUserSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      })

      const mockOrgSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockOrg]),
          }),
        }),
      })

      const mockMemberSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ role: 'member' }]),
          }),
        }),
      })

      vi.mocked(superadminDb.select)
        .mockImplementationOnce(mockUserSelect as any)
        .mockImplementationOnce(mockOrgSelect as any)
        .mockImplementationOnce(mockMemberSelect as any)

      await expect(requireRole('admin')).rejects.toThrow('Insufficient permissions')
    })

    it('should allow user with higher role', async () => {
      const mockUser = createMockUser({ clerkId: 'clerk_user_123' })
      const mockOrg = createMockOrganization({ clerkOrgId: 'clerk_org_123' })

      vi.mocked(auth).mockResolvedValue({
        userId: 'clerk_user_123',
        orgId: 'clerk_org_123',
        orgRole: 'owner',
      } as any)
      vi.mocked(currentUser).mockResolvedValue({
        id: 'clerk_user_123',
        publicMetadata: {},
      } as any)

      const mockUserSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      })

      const mockOrgSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockOrg]),
          }),
        }),
      })

      const mockMemberSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ role: 'owner' }]),
          }),
        }),
      })

      vi.mocked(superadminDb.select)
        .mockImplementationOnce(mockUserSelect as any)
        .mockImplementationOnce(mockOrgSelect as any)
        .mockImplementationOnce(mockMemberSelect as any)

      const result = await requireRole('admin')
      expect(result.organization.role).toBe('owner')
    })

    it('should allow user with exact required role', async () => {
      const mockUser = createMockUser({ clerkId: 'clerk_user_123' })
      const mockOrg = createMockOrganization({ clerkOrgId: 'clerk_org_123' })

      vi.mocked(auth).mockResolvedValue({
        userId: 'clerk_user_123',
        orgId: 'clerk_org_123',
        orgRole: 'admin',
      } as any)
      vi.mocked(currentUser).mockResolvedValue({
        id: 'clerk_user_123',
        publicMetadata: {},
      } as any)

      const mockUserSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      })

      const mockOrgSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockOrg]),
          }),
        }),
      })

      const mockMemberSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ role: 'admin' }]),
          }),
        }),
      })

      vi.mocked(superadminDb.select)
        .mockImplementationOnce(mockUserSelect as any)
        .mockImplementationOnce(mockOrgSelect as any)
        .mockImplementationOnce(mockMemberSelect as any)

      const result = await requireRole('admin')
      expect(result.organization.role).toBe('admin')
    })
  })
})
