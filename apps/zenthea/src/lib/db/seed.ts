import { faker } from '@faker-js/faker'
import { PatientService } from './services/patient.service'
import { MessageService } from './services/message.service'
import { getSuperadminDb } from '@startkit/database'
import { organizations, users, organizationMembers } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'

/**
 * Zenthea Database Seeder
 * 
 * Usage: 
 *   DATABASE_URL=... pnpm tsx src/lib/db/seed.ts [organization_id]
 */

async function seed() {
  const orgId = process.argv[2]
  const { drizzle } = getSuperadminDb()
  
  if (!orgId) {
    console.log('❌ Error: Please provide an organization_id as an argument.')
    console.log('Example: pnpm db:seed <org-uuid>')
    
    // Attempt to find the first organization as a fallback
    console.log('🔍 Looking for an available organization in the database...')
    try {
      const [firstOrg] = await drizzle.select().from(organizations).limit(1)
      
      if (firstOrg) {
        console.log(`💡 Found an organization: ${firstOrg.id} (${firstOrg.name})`)
        console.log('You can run: pnpm db:seed ' + firstOrg.id)
      } else {
        console.log('⚠️ No organizations found in the database. Please create one via the Clerk webhook or manual insert first.')
      }
    } catch (e: any) {
      console.error('❌ Failed to fetch organizations:', e.message)
    }
    
    process.exit(1)
  }

  // Get a provider (organization member) to send/receive messages
  console.log(`🔍 Finding a provider for organization: ${orgId}...`)
  const [member] = await drizzle
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, orgId))
    .limit(1)

  if (!member) {
    console.error(`❌ Error: No members found for organization ${orgId}. Please add a user to this organization first.`)
    process.exit(1)
  }

  const providerId = member.userId
  console.log(`👤 Using provider ID: ${providerId}`)

  console.log(`🌱 Seeding demo patients and messages for organization: ${orgId}...`)

  const patientsToCreate = 5

  for (let i = 0; i < patientsToCreate; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    
    const patientData = {
      firstName,
      lastName,
      dateOfBirth: faker.date.birthdate({ min: 18, max: 90, mode: 'age' }),
      email: faker.internet.email({ firstName, lastName }),
      phone: faker.phone.number(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        zipCode: faker.location.zipCode(),
        country: 'USA'
      },
      status: 'active' as const,
      gender: faker.person.sex(),
      medicalHistory: {
        chronicConditions: [
          {
            condition: faker.helpers.arrayElement(['Hypertension', 'Type 2 Diabetes', 'Asthma', 'Arthritis']),
            diagnosisDate: faker.date.past({ years: 5 }).toISOString().split('T')[0],
            status: 'active'
          }
        ]
      },
      allergies: {
        medications: [
          {
            substance: faker.helpers.arrayElement(['Penicillin', 'Sulfa', 'Aspirin']),
            reactionType: 'Rash',
            severity: 'moderate',
            symptoms: 'Itching'
          }
        ]
      },
      insurance: {
        primary: {
          provider: faker.helpers.arrayElement(['Blue Cross Blue Shield', 'Aetna', 'UnitedHealthcare', 'Cigna']),
          policyNumber: faker.string.alphanumeric(10).toUpperCase(),
          subscriberName: `${firstName} ${lastName}`,
          effectiveDate: faker.date.past({ years: 2 }).toISOString().split('T')[0]
        }
      }
    }

    try {
      const patient = await PatientService.createPatient(patientData, orgId)
      console.log(`✅ Created patient: ${firstName} ${lastName} (${patient.id})`)

      // Seed some messages for this patient
      console.log(`   ✉️ Seeding messages for ${firstName}...`)
      
      // Create a thread
      const threadId = crypto.randomUUID()
      
      // Initial message from patient
      await MessageService.sendMessage({
        threadId,
        fromUserId: patient.id,
        toUserId: providerId,
        subject: `Question regarding my ${faker.helpers.arrayElement(['medication', 'appointment', 'results', 'symptoms'])}`,
        content: faker.lorem.paragraph(),
        messageType: 'general',
        priority: faker.helpers.arrayElement(['low', 'normal', 'high']),
        status: 'sent',
        isRead: false
      }, orgId, patient.id)

      // Response from provider
      if (faker.datatype.boolean(0.7)) {
        await MessageService.sendMessage({
          threadId,
          fromUserId: providerId,
          toUserId: patient.id,
          content: faker.lorem.paragraph(),
          messageType: 'general',
          priority: 'normal',
          status: 'sent',
          isRead: true
        }, orgId, providerId)
      }

    } catch (error) {
      console.error(`❌ Failed to seed data for patient ${i + 1}:`, error)
    }
  }

  console.log(`✨ Seeding complete! Created ${patientsToCreate} patients with initial conversations.`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('💥 Seeding failed:', err)
  process.exit(1)
})
