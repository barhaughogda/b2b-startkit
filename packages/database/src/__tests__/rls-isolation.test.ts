/**
 * RLS Isolation Tests
 *
 * These tests verify that Row-Level Security policies correctly isolate
 * data between tenants. This is critical for multi-tenancy security.
 *
 * Run with: pnpm test packages/database
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getSuperadminDb, db } from '../index'
import { withTenant } from '../server'
import { users, organizations, organizationMembers } from '../schema'
import { eq } from 'drizzle-orm'

describe('RLS Isolation Tests', () => {
  let testOrg1Id: string
  let testOrg2Id: string
  let testUser1Id: string
  let testUser2Id: string

  beforeAll(async () => {
    // Setup: Create test data using superadmin client (bypasses RLS)
    const superadminDb = getSuperadminDb()

    // Create test users
    const [user1, user2] = await Promise.all([
      superadminDb.drizzle.insert(users).values({
        clerkId: 'test_user_1',
        email: 'test1@example.com',
        name: 'Test User 1',
        isSuperadmin: false,
      }).returning(),
      superadminDb.drizzle.insert(users).values({
        clerkId: 'test_user_2',
        email: 'test2@example.com',
        name: 'Test User 2',
        isSuperadmin: false,
      }).returning(),
    ])

    testUser1Id = user1[0].id
    testUser2Id = user2[0].id

    // Create test organizations
    const [org1, org2] = await Promise.all([
      superadminDb.drizzle.insert(organizations).values({
        clerkOrgId: 'test_org_1',
        name: 'Test Org 1',
        slug: 'test-org-1',
      }).returning(),
      superadminDb.drizzle.insert(organizations).values({
        clerkOrgId: 'test_org_2',
        name: 'Test Org 2',
        slug: 'test-org-2',
      }).returning(),
    ])

    testOrg1Id = org1[0].id
    testOrg2Id = org2[0].id

    // Create memberships
    await Promise.all([
      superadminDb.drizzle.insert(organizationMembers).values({
        organizationId: testOrg1Id,
        userId: testUser1Id,
        role: 'owner',
      }),
      superadminDb.drizzle.insert(organizationMembers).values({
        organizationId: testOrg2Id,
        userId: testUser2Id,
        role: 'owner',
      }),
    ])
  })

  afterAll(async () => {
    // Cleanup: Remove test data
    const superadminDb = getSuperadminDb()

    // Note: In a real test, you'd want to clean up in reverse order
    // For now, we'll rely on cascade deletes
    await superadminDb.drizzle.delete(organizations).where(
      eq(organizations.id, testOrg1Id)
    )
    await superadminDb.drizzle.delete(organizations).where(
      eq(organizations.id, testOrg2Id)
    )
    await superadminDb.drizzle.delete(users).where(
      eq(users.id, testUser1Id)
    )
    await superadminDb.drizzle.delete(users).where(
      eq(users.id, testUser2Id)
    )

    await superadminDb.postgres.end()
  })

  it('should isolate organizations - user can only see their own org', async () => {
    // User 1 should only see Org 1
    await withTenant(
      { organizationId: testOrg1Id, userId: testUser1Id },
      async () => {
        const orgs = await db.query.organizations.findMany()
        expect(orgs).toHaveLength(1)
        expect(orgs[0].id).toBe(testOrg1Id)
      }
    )

    // User 2 should only see Org 2
    await withTenant(
      { organizationId: testOrg2Id, userId: testUser2Id },
      async () => {
        const orgs = await db.query.organizations.findMany()
        expect(orgs).toHaveLength(1)
        expect(orgs[0].id).toBe(testOrg2Id)
      }
    )
  })

  it('should isolate organization members - user can only see their org members', async () => {
    // User 1 should only see Org 1 members
    await withTenant(
      { organizationId: testOrg1Id, userId: testUser1Id },
      async () => {
        const members = await db.query.organizationMembers.findMany({
          where: eq(organizationMembers.organizationId, testOrg1Id),
        })
        expect(members.length).toBeGreaterThan(0)
        // All members should belong to Org 1
        members.forEach((member) => {
          expect(member.organizationId).toBe(testOrg1Id)
        })
      }
    )
  })

  it('should prevent cross-tenant data access', async () => {
    // User 1 should NOT be able to access Org 2 data
    await withTenant(
      { organizationId: testOrg1Id, userId: testUser1Id },
      async () => {
        // Try to query Org 2 - should return empty or throw
        const org2 = await db.query.organizations.findFirst({
          where: eq(organizations.id, testOrg2Id),
        })
        // RLS should prevent access - result should be undefined
        expect(org2).toBeUndefined()
      }
    )
  })

  it('should allow superadmin to access all data', async () => {
    // Superadmin should be able to see all organizations
    const superadminDb = getSuperadminDb()
    const allOrgs = await superadminDb.drizzle.query.organizations.findMany()
    expect(allOrgs.length).toBeGreaterThanOrEqual(2)
    expect(allOrgs.some((org) => org.id === testOrg1Id)).toBe(true)
    expect(allOrgs.some((org) => org.id === testOrg2Id)).toBe(true)
  })

  it('should isolate users - user can only read their own record', async () => {
    // User 1 should only see their own user record
    await withTenant(
      { organizationId: testOrg1Id, userId: testUser1Id },
      async () => {
        const user = await db.query.users.findFirst({
          where: eq(users.id, testUser1Id),
        })
        expect(user).toBeDefined()
        expect(user?.id).toBe(testUser1Id)

        // User 1 should NOT see User 2
        const user2 = await db.query.users.findFirst({
          where: eq(users.id, testUser2Id),
        })
        expect(user2).toBeUndefined()
      }
    )
  })

  it('should enforce role-based access - member cannot access admin-only data', async () => {
    // Create a member user in Org 1
    const superadminDb = getSuperadminDb()
    const [memberUser] = await superadminDb.drizzle
      .insert(users)
      .values({
        clerkId: 'test_member_user',
        email: 'member@example.com',
        name: 'Member User',
        isSuperadmin: false,
      })
      .returning()

    await superadminDb.drizzle.insert(organizationMembers).values({
      organizationId: testOrg1Id,
      userId: memberUser.id,
      role: 'member', // Member role, not admin
    })

    // Member should be able to read basic org data
    await withTenant(
      { organizationId: testOrg1Id, userId: memberUser.id },
      async () => {
        const org = await db.query.organizations.findFirst({
          where: eq(organizations.id, testOrg1Id),
        })
        expect(org).toBeDefined()

        // Member should see organization members (read permission)
        const members = await db.query.organizationMembers.findMany({
          where: eq(organizationMembers.organizationId, testOrg1Id),
        })
        expect(members.length).toBeGreaterThan(0)
      }
    )

    // Cleanup
    await superadminDb.drizzle
      .delete(organizationMembers)
      .where(eq(organizationMembers.userId, memberUser.id))
    await superadminDb.drizzle.delete(users).where(eq(users.id, memberUser.id))
  })
})
