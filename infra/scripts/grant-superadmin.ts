#!/usr/bin/env tsx
/**
 * Grant superadmin access to a user
 * 
 * This script sets the is_superadmin flag to true for a user by email.
 * The user must already exist in the database (sign in to any app first).
 * 
 * Usage:
 *   pnpm tsx infra/scripts/grant-superadmin.ts <email>
 *   pnpm tsx infra/scripts/grant-superadmin.ts user@example.com
 * 
 * @ai-no-modify This script grants platform-wide superadmin access
 */

import * as fs from 'fs'
import * as path from 'path'
import { getSuperadminDb } from '../../packages/database/src/client'
import { users } from '../../packages/database/src/schema'
import { eq } from 'drizzle-orm'

// Load environment variables from .env.local files
function loadEnv() {
  // Try to load from web-template first (most likely to exist)
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
      console.log(`📁 Loaded environment from ${envFile}\n`)
      return
    }
  }
  
  console.warn('⚠️  No .env.local file found. Make sure DATABASE_URL is set in your environment.\n')
}

async function grantSuperadmin(email: string) {
  console.log(`🔐 Granting superadmin access to: ${email}\n`)

  const db = getSuperadminDb()

  try {
    // Find user by email
    const [user] = await db.drizzle
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) {
      console.error(`❌ Error: User with email "${email}" not found in database`)
      console.error('\nThe user must sign in to any app first to be created in the database.')
      console.error('Steps:')
      console.error('1. Go to http://localhost:4500 (web-template)')
      console.error('2. Sign in with Clerk')
      console.error('3. Run this script again\n')
      process.exit(1)
    }

    if (user.isSuperadmin) {
      console.log(`✅ User "${email}" is already a superadmin`)
      console.log(`   User ID: ${user.id}`)
      console.log(`   Name: ${user.name || 'N/A'}\n`)
      process.exit(0)
    }

    // Grant superadmin access
    await db.drizzle
      .update(users)
      .set({ 
        isSuperadmin: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))

    console.log('✅ Superadmin access granted successfully!\n')
    console.log('User details:')
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.name || 'N/A'}`)
    console.log(`   User ID: ${user.id}\n`)
    console.log('Next steps:')
    console.log('1. Go to http://localhost:4501/sign-in')
    console.log('2. Sign in with the same account')
    console.log('3. You should now have access to the superadmin dashboard\n')

  } catch (error) {
    console.error('❌ Error granting superadmin access:', error)
    process.exit(1)
  } finally {
    // Close database connection
    await db.postgres.end()
  }
}

function main() {
  // Load environment variables first
  loadEnv()

  const email = process.argv[2]

  if (!email) {
    console.error('❌ Error: Email argument required\n')
    console.error('Usage:')
    console.error('  pnpm tsx infra/scripts/grant-superadmin.ts <email>\n')
    console.error('Example:')
    console.error('  pnpm tsx infra/scripts/grant-superadmin.ts user@example.com\n')
    process.exit(1)
  }

  // Basic email validation
  if (!email.includes('@') || !email.includes('.')) {
    console.error(`❌ Error: "${email}" does not appear to be a valid email address\n`)
    process.exit(1)
  }

  grantSuperadmin(email)
}

main()
