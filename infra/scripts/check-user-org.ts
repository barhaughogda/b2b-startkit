import { getSuperadminDb } from '@startkit/database'
import { organizationMembers, organizations } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'

async function findUserOrg() {
  const userId = 'e610b6b8-c74d-4962-8c23-ae344dafb3ba'
  const { drizzle } = getSuperadminDb()
  
  const members = await drizzle.select().from(organizationMembers).where(eq(organizationMembers.userId, userId))
  
  if (members.length === 0) {
    console.log('❌ User is not a member of any organization.')
    
    // Find first org if any
    const [firstOrg] = await drizzle.select().from(organizations).limit(1)
    if (firstOrg) {
      console.log(`💡 Found an organization in DB: ${firstOrg.id} (${firstOrg.name})`)
      console.log('Suggest adding user to this org.')
    }
    return
  }
  
  for (const member of members) {
    const [org] = await drizzle.select().from(organizations).where(eq(organizations.id, member.organizationId))
    console.log(`✅ Member of: ${org.name} (ID: ${org.id}), Role: ${member.role}, App Admin: ${member.isAppAdmin}`)
  }
}

findUserOrg().catch(console.error)
