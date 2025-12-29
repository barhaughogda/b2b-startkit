#!/usr/bin/env tsx
import * as fs from 'fs'
import * as path from 'path'
import { getSuperadminDb } from '../../packages/database/src/client'
import { users } from '../../packages/database/src/schema'
import { eq } from 'drizzle-orm'

// Load environment variables
function loadEnv() {
  const envFiles = [
    path.join(process.cwd(), 'apps/web-template/.env.local'),
    path.join(process.cwd(), 'apps/superadmin/.env.local'),
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
      return
    }
  }
}

async function updateEmail(oldEmail: string, newEmail: string) {
  loadEnv()
  const db = getSuperadminDb()

  try {
    const [user] = await db.drizzle
      .select()
      .from(users)
      .where(eq(users.email, oldEmail))
      .limit(1)

    if (!user) {
      console.error(`❌ User with email "${oldEmail}" not found`)
      process.exit(1)
    }

    await db.drizzle
      .update(users)
      .set({ 
        email: newEmail,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))

    console.log(`✅ Updated email from "${oldEmail}" to "${newEmail}"`)
    console.log(`   User ID: ${user.id}`)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await db.postgres.end()
  }
}

const oldEmail = process.argv[2]
const newEmail = process.argv[3]

if (!oldEmail || !newEmail) {
  console.error('Usage: pnpm tsx infra/scripts/update-user-email.ts <old-email> <new-email>')
  process.exit(1)
}

updateEmail(oldEmail, newEmail)
