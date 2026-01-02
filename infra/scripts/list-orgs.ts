import { getSuperadminDb } from '@startkit/database'
import { organizations } from '@startkit/database/schema'

async function listOrgs() {
  const { drizzle } = getSuperadminDb()
  const list = await drizzle.select().from(organizations)
  console.log('📋 Organizations in DB:', list.length)
  list.forEach(org => {
    console.log(`- ${org.name} (ID: ${org.id}, Slug: ${org.slug}, Clerk ID: ${org.clerkOrgId})`)
  })
}

listOrgs().catch(console.error)
