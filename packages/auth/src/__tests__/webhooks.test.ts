/**
 * Clerk Webhook Handlers Integration Tests
 * 
 * Tests for webhook event handlers that sync Clerk data to database
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  handleUserCreated,
  handleUserUpdated,
  handleUserDeleted,
  handleOrgCreated,
  handleOrgUpdated,
  handleOrgDeleted,
  handleMembershipCreated,
  handleMembershipUpdated,
  handleMembershipDeleted,
} from '../webhooks'
import { superadminDb } from '@startkit/database'
import { users, organizations, organizationMembers, auditLogs } from '@startkit/database/schema'
import { eq, and } from 'drizzle-orm'
import { createMockUser, createMockOrganization } from '../../../../test-utils/factories'

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
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      values: vi.fn(),
    },
  }
})

describe('Clerk Webhook Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleUserCreated', () => {
    it('should create user in database', async () => {
      const svixId = 'svix_test_123'
      const userData = {
        id: 'clerk_user_123',
        email_addresses: [{ email_address: 'test@example.com' }],
        first_name: 'Test',
        last_name: 'User',
        image_url: 'https://example.com/avatar.jpg',
        public_metadata: {},
      }

      // Mock idempotency check (not processed)
      const mockIdempotencySelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      // Mock user existence check (doesn't exist)
      const mockUserSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      vi.mocked(superadminDb.select)
        .mockImplementationOnce(mockIdempotencySelect as any)
        .mockImplementationOnce(mockUserSelect as any)
      vi.mocked(superadminDb.insert).mockImplementation(mockInsert as any)

      await handleUserCreated(userData, svixId)

      expect(superadminDb.insert).toHaveBeenCalled()
      expect(mockInsert().values).toHaveBeenCalledWith(
        expect.objectContaining({
          clerkId: 'clerk_user_123',
          email: 'test@example.com',
          name: 'Test User',
        })
      )
    })

    it('should be idempotent - skip if already processed', async () => {
      const svixId = 'svix_test_123'
      const userData = {
        id: 'clerk_user_123',
        email_addresses: [{ email_address: 'test@example.com' }],
        first_name: 'Test',
        last_name: 'User',
        image_url: null,
        public_metadata: {},
      }

      // Mock idempotency check (already processed)
      const mockIdempotencySelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'log_123' }]),
          }),
        }),
      })

      vi.mocked(superadminDb.select).mockImplementation(mockIdempotencySelect as any)

      await handleUserCreated(userData, svixId)

      // Should not insert user
      expect(superadminDb.insert).not.toHaveBeenCalled()
    })

    it('should update existing user if webhook not logged', async () => {
      const svixId = 'svix_test_123'
      const existingUser = createMockUser({ clerkId: 'clerk_user_123' })
      const userData = {
        id: 'clerk_user_123',
        email_addresses: [{ email_address: 'updated@example.com' }],
        first_name: 'Updated',
        last_name: 'Name',
        image_url: null,
        public_metadata: {},
      }

      const mockIdempotencySelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const mockUserSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingUser]),
          }),
        }),
      })

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      vi.mocked(superadminDb.select)
        .mockImplementationOnce(mockIdempotencySelect as any)
        .mockImplementationOnce(mockUserSelect as any)
      vi.mocked(superadminDb.update).mockImplementation(mockUpdate as any)
      vi.mocked(superadminDb.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any)

      await handleUserCreated(userData, svixId)

      expect(superadminDb.update).toHaveBeenCalled()
    })

    it('should set superadmin flag from metadata', async () => {
      const svixId = 'svix_test_123'
      const userData = {
        id: 'clerk_user_123',
        email_addresses: [{ email_address: 'admin@example.com' }],
        first_name: 'Admin',
        last_name: 'User',
        image_url: null,
        public_metadata: { role: 'superadmin' },
      }

      const mockIdempotencySelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const mockUserSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      vi.mocked(superadminDb.select)
        .mockImplementationOnce(mockIdempotencySelect as any)
        .mockImplementationOnce(mockUserSelect as any)
      vi.mocked(superadminDb.insert).mockImplementation(mockInsert as any)

      await handleUserCreated(userData, svixId)

      expect(mockInsert().values).toHaveBeenCalledWith(
        expect.objectContaining({
          isSuperadmin: true,
        })
      )
    })
  })

  describe('handleOrgCreated', () => {
    it('should create organization in database', async () => {
      const svixId = 'svix_test_123'
      const orgData = {
        id: 'clerk_org_123',
        name: 'Test Organization',
        slug: 'test-org',
      }

      const mockIdempotencySelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const mockOrgSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      vi.mocked(superadminDb.select)
        .mockImplementationOnce(mockIdempotencySelect as any)
        .mockImplementationOnce(mockOrgSelect as any)
      vi.mocked(superadminDb.insert).mockImplementation(mockInsert as any)

      await handleOrgCreated(orgData, svixId)

      expect(mockInsert().values).toHaveBeenCalledWith(
        expect.objectContaining({
          clerkOrgId: 'clerk_org_123',
          name: 'Test Organization',
          slug: 'test-org',
        })
      )
    })

    it('should use org ID as slug if slug not provided', async () => {
      const svixId = 'svix_test_123'
      const orgData = {
        id: 'clerk_org_123',
        name: 'Test Organization',
        slug: null,
      }

      const mockIdempotencySelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const mockOrgSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      vi.mocked(superadminDb.select)
        .mockImplementationOnce(mockIdempotencySelect as any)
        .mockImplementationOnce(mockOrgSelect as any)
      vi.mocked(superadminDb.insert).mockImplementation(mockInsert as any)

      await handleOrgCreated(orgData, svixId)

      expect(mockInsert().values).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'clerk_org_123',
        })
      )
    })
  })

  describe('handleMembershipCreated', () => {
    it('should create organization membership', async () => {
      const svixId = 'svix_test_123'
      const mockUser = createMockUser({ clerkId: 'clerk_user_123' })
      const mockOrg = createMockOrganization({ clerkOrgId: 'clerk_org_123' })

      const membershipData = {
        id: 'membership_123',
        organization: { id: 'clerk_org_123' },
        public_user_data: { user_id: 'clerk_user_123' },
        role: 'admin',
      }

      const mockIdempotencySelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

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
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      vi.mocked(superadminDb.select)
        .mockImplementationOnce(mockIdempotencySelect as any)
        .mockImplementationOnce(mockUserSelect as any)
        .mockImplementationOnce(mockOrgSelect as any)
        .mockImplementationOnce(mockMemberSelect as any)
      vi.mocked(superadminDb.insert).mockImplementation(mockInsert as any)

      await handleMembershipCreated(membershipData, svixId)

      expect(mockInsert().values).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: mockOrg.id,
          userId: mockUser.id,
          role: 'admin',
        })
      )
    })

    it('should update role if membership already exists', async () => {
      const svixId = 'svix_test_123'
      const mockUser = createMockUser({ clerkId: 'clerk_user_123' })
      const mockOrg = createMockOrganization({ clerkOrgId: 'clerk_org_123' })
      const existingMember = createMockOrganizationMember({
        organizationId: mockOrg.id,
        userId: mockUser.id,
        role: 'member',
      })

      const membershipData = {
        id: 'membership_123',
        organization: { id: 'clerk_org_123' },
        public_user_data: { user_id: 'clerk_user_123' },
        role: 'admin',
      }

      const mockIdempotencySelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

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
            limit: vi.fn().mockResolvedValue([existingMember]),
          }),
        }),
      })

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      vi.mocked(superadminDb.select)
        .mockImplementationOnce(mockIdempotencySelect as any)
        .mockImplementationOnce(mockUserSelect as any)
        .mockImplementationOnce(mockOrgSelect as any)
        .mockImplementationOnce(mockMemberSelect as any)
      vi.mocked(superadminDb.update).mockImplementation(mockUpdate as any)
      vi.mocked(superadminDb.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any)

      await handleMembershipCreated(membershipData, svixId)

      expect(superadminDb.update).toHaveBeenCalled()
    })
  })

  describe('handleUserDeleted', () => {
    it('should anonymize user data on deletion', async () => {
      const svixId = 'svix_test_123'
      const existingUser = createMockUser({ clerkId: 'clerk_user_123' })
      const userData = { id: 'clerk_user_123' }

      const mockIdempotencySelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const mockUserSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingUser]),
          }),
        }),
      })

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      vi.mocked(superadminDb.select)
        .mockImplementationOnce(mockIdempotencySelect as any)
        .mockImplementationOnce(mockUserSelect as any)
      vi.mocked(superadminDb.update).mockImplementation(mockUpdate as any)
      vi.mocked(superadminDb.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any)

      await handleUserDeleted(userData, svixId)

      expect(mockUpdate().set).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.stringContaining('deleted_'),
          name: 'Deleted User',
          avatarUrl: null,
        })
      )
    })
  })
})
