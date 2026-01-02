import { getSuperadminDb } from '../../packages/database/src/client'
import { organizationMembers, organizations, users } from '../../packages/database/src/schema'
import { eq, and } from 'drizzle-orm'
import { PatientService } from '../../apps/zenthea/src/lib/db/services/patient.service'
import { faker } from '@faker-js/faker'

/**
 * Zenthea Account Setup Script (admin@zenthea.ai)
 * Fixed with direct relative paths for infra execution.
 */
async function setupAccount() {
  const userEmail = 'admin@zenthea.ai'
  const { drizzle } = getSuperadminDb()
  
  console.log(`🔍 Looking for user: ${userEmail}...`)
  let [user] = await drizzle.select().from(users).where(eq(users.email, userEmail)).limit(1)
  
  if (!user) {
    console.log('⚠️ User not found in Postgres. Manually syncing from session data...')
    const [newUser] = await drizzle.insert(users).values({
      email: userEmail,
      name: 'Zenthea Admin',
      clerkId: 'user_sync_' + Date.now(),
      isSuperadmin: true,
    }).returning()
    user = newUser
    console.log(`✅ Created user record: ${user.id}`)
  } else {
    console.log(`✅ Found user: ${user.name} (ID: ${user.id})`)
    await drizzle.update(users).set({ isSuperadmin: true }).where(eq(users.id, user.id))
  }

  // Ensure an organization exists
  let orgId: string;
  const [existingOrg] = await drizzle.select().from(organizations).limit(1)
  
  if (!existingOrg) {
    console.log('🏗️ No organization found. Creating a default "Zenthea HQ" organization...')
    const [newOrg] = await drizzle.insert(organizations).values({
      name: 'Zenthea HQ',
      slug: 'zenthea-hq',
      clerkOrgId: 'org_hq_' + Date.now(),
      status: 'active'
    }).returning()
    orgId = newOrg.id
  } else {
    orgId = existingOrg.id
  }
  console.log(`✅ Using organization: (ID: ${orgId})`)

  // Ensure user is an App Admin in the organization
  const [membership] = await drizzle.select()
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.userId, user.id),
      eq(organizationMembers.organizationId, orgId)
    ))
    .limit(1)
  
  if (!membership) {
    console.log(`🔗 Linking user to organization as App Admin...`)
    await drizzle.insert(organizationMembers).values({
      userId: user.id,
      organizationId: orgId,
      role: 'admin',
      isAppAdmin: true
    })
  } else {
    console.log(`🚀 Elevating user to App Admin...`)
    await drizzle.update(organizationMembers)
      .set({ isAppAdmin: true, role: 'admin' })
      .where(and(
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.organizationId, orgId)
      ))
  }

  console.log(`🌱 Seeding 5 demo patients for organization: ${orgId}...`)
  for (let i = 0; i < 5; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    await PatientService.createPatient({
      firstName,
      lastName,
      dateOfBirth: faker.date.birthdate({ min: 18, max: 90, mode: 'age' }),
      email: faker.internet.email({ firstName, lastName }),
      phone: faker.phone.number(),
      status: 'active',
      gender: faker.person.sex(),
    }, orgId, user.id)
    console.log(`✅ Created patient: ${firstName} ${lastName}`)
  }

  console.log('\n✨ Setup complete! admin@zenthea.ai is now a Superadmin/App Admin and has demo data.')
  console.log('Please restart your dev server and refresh the page.')
}

setupAccount().catch(console.error)
