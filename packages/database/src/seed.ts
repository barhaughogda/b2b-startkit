/**
 * Database seed script for development
 *
 * Creates realistic test data for development and testing.
 * Includes:
 * - Test users
 * - Test organizations
 * - Organization memberships
 * - Sample subscriptions
 *
 * Usage:
 * ```bash
 * pnpm tsx packages/database/src/seed.ts
 * ```
 */

import { getSuperadminDb } from './client'
import { users, organizations, organizationMembers, subscriptions } from './schema'
import { eq } from 'drizzle-orm'

async function seed() {
  console.log('🌱 Seeding database...')

  const db = getSuperadminDb()

  try {
    // Create test users
    console.log('Creating test users...')
    const [user1, user2, user3] = await Promise.all([
      db.drizzle.insert(users).values({
        clerkId: 'user_test_1',
        email: 'alice@example.com',
        name: 'Alice Johnson',
        isSuperadmin: false,
      }).returning(),
      db.drizzle.insert(users).values({
        clerkId: 'user_test_2',
        email: 'bob@example.com',
        name: 'Bob Smith',
        isSuperadmin: false,
      }).returning(),
      db.drizzle.insert(users).values({
        clerkId: 'user_superadmin',
        email: 'admin@example.com',
        name: 'Super Admin',
        isSuperadmin: true,
      }).returning(),
    ])

    console.log(`✅ Created ${user1.length + user2.length + user3.length} users`)

    // Create test organizations
    console.log('Creating test organizations...')
    const [org1, org2] = await Promise.all([
      db.drizzle.insert(organizations).values({
        clerkOrgId: 'org_test_1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        settings: { timezone: 'America/New_York', locale: 'en-US' },
      }).returning(),
      db.drizzle.insert(organizations).values({
        clerkOrgId: 'org_test_2',
        name: 'Tech Startup Inc',
        slug: 'tech-startup',
        settings: { timezone: 'America/Los_Angeles', locale: 'en-US' },
      }).returning(),
    ])

    console.log(`✅ Created ${org1.length + org2.length} organizations`)

    // Create organization memberships
    console.log('Creating organization memberships...')
    await Promise.all([
      // Alice is owner of Acme Corp
      db.drizzle.insert(organizationMembers).values({
        organizationId: org1[0].id,
        userId: user1[0].id,
        role: 'owner',
      }),
      // Bob is admin of Acme Corp
      db.drizzle.insert(organizationMembers).values({
        organizationId: org1[0].id,
        userId: user2[0].id,
        role: 'admin',
      }),
      // Bob is owner of Tech Startup
      db.drizzle.insert(organizationMembers).values({
        organizationId: org2[0].id,
        userId: user2[0].id,
        role: 'owner',
      }),
    ])

    console.log('✅ Created organization memberships')

    // Create test subscriptions
    console.log('Creating test subscriptions...')
    await Promise.all([
      db.drizzle.insert(subscriptions).values({
        organizationId: org1[0].id,
        stripeCustomerId: 'cus_test_acme',
        stripeSubscriptionId: 'sub_test_acme',
        stripePriceId: 'price_test_pro',
        status: 'active',
        plan: 'pro',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        seatCount: 5,
        maxSeats: 10,
        usageLimits: {
          apiCallsPerMonth: 100000,
          storageGb: 100,
        },
      }),
      db.drizzle.insert(subscriptions).values({
        organizationId: org2[0].id,
        stripeCustomerId: 'cus_test_tech',
        stripeSubscriptionId: 'sub_test_tech',
        stripePriceId: 'price_test_starter',
        status: 'active',
        plan: 'starter',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        seatCount: 2,
        maxSeats: 5,
        usageLimits: {
          apiCallsPerMonth: 10000,
          storageGb: 10,
        },
      }),
    ])

    console.log('✅ Created test subscriptions')

    console.log('\n✨ Seed complete!')
    console.log('\nTest users:')
    console.log('  - alice@example.com (owner of Acme Corp)')
    console.log('  - bob@example.com (admin of Acme Corp, owner of Tech Startup)')
    console.log('  - admin@example.com (superadmin)')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await db.postgres.end()
  }
}

// Run if executed directly
if (require.main === module) {
  seed()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Seed failed:', error)
      process.exit(1)
    })
}

export { seed }
