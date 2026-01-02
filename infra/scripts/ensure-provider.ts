#!/usr/bin/env tsx
import * as fs from 'fs'
import * as path from 'path'
import { getSuperadminDb } from '../../packages/database/src/client'
import { users, organizations } from '../../packages/database/src/schema'
import { providers } from '../../apps/zenthea/src/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// Load environment variables from .env.local files
function loadEnv() {
  const envFiles = [
    path.join(process.cwd(), 'apps/zenthea/.env.local'),
    path.join(process.cwd(), 'apps/web-template/.env.local'),
    path.join(process.cwd(), '.env.local'),
  ]

  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf-8')
      const lines = content.split('\n')
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=')
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
            if (!process.env[key]) {
              process.env[key] = value
            }
          }
        }
      }
      console.log(`📁 Loaded environment from ${envFile}\n`)
      return
    }
  }
}

async function ensureProvider(clerkUserId: string, clerkOrgId: string) {
  console.log(`🛡️ Ensuring user ${clerkUserId} is a provider in Zenthea for org ${clerkOrgId}\n`)

  const db = getSuperadminDb()

  try {
    const [user] = await db.drizzle
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1)
    
    const [org] = await db.drizzle
      .select()
      .from(organizations)
      .where(eq(organizations.clerkOrgId, clerkOrgId))
      .limit(1)

    if (!user || !org) {
      console.error('❌ User or Org not found in DB')
      return
    }

    const [existingProvider] = await db.drizzle
      .select()
      .from(providers)
      .where(and(
        eq(providers.userId, user.id),
        eq(providers.organizationId, org.id)
      ))
      .limit(1)
    
    if (!existingProvider) {
      console.log(`🏗️ Provider record not found. Creating...`)
      await db.drizzle.insert(providers).values({
        userId: user.id,
        organizationId: org.id,
        specialty: 'Medical Director',
        licenseNumber: 'LEGACY-ADMIN',
        npi: '0000000000',
      })
      console.log(`✅ Created provider record for ${user.email}`)
    } else {
      console.log(`✅ Provider record already exists for ${user.email}`)
    }

  } catch (error) {
    console.error('❌ Error ensuring provider:', error)
    process.exit(1)
  } finally {
    await db.postgres.end()
  }
}

const clerkUserId = 'user_37ZBWOJIWl2wpYchStNQBQvQPGJ'
const clerkOrgId = 'org_37ZBb8euJaynNyLwq67WsV6WAkS'

loadEnv()
ensureProvider(clerkUserId, clerkOrgId)
