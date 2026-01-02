#!/usr/bin/env tsx
import * as fs from 'fs'
import * as path from 'path'
import { getSuperadminDb } from '../../packages/database/src/client'
import { users } from '../../packages/database/src/schema'

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

async function listUsers() {
  loadEnv()
  const db = getSuperadminDb()

  try {
    const allUsers = await db.drizzle.select().from(users)
    
    console.log(`\n📋 Users in database (${allUsers.length}):\n`)
    if (allUsers.length === 0) {
      console.log('  No users found.')
    } else {
      allUsers.forEach(u => {
        console.log(`  - ${u.email}`)
        console.log(`    ID: ${u.id}`)
        console.log(`    Clerk ID: ${u.clerkId || 'N/A'}`)
        console.log(`    Name: ${u.name || 'N/A'}`)
        console.log(`    Superadmin: ${u.isSuperadmin ? '✅ Yes' : '❌ No'}`)
        console.log('')
      })
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await db.postgres.end()
  }
}

listUsers()
