#!/usr/bin/env tsx
/**
 * Setup superadmin .env.local file
 * 
 * This script helps copy environment variables from web-template to superadmin
 * since they share the same Clerk app, database, and Stripe account.
 * 
 * Usage:
 *   pnpm tsx infra/scripts/setup-superadmin-env.ts
 */

import * as fs from 'fs'
import * as path from 'path'

function main() {
  console.log('🔧 Setting up superadmin environment variables...\n')

  const webTemplateEnvPath = path.join(process.cwd(), 'apps/web-template/.env.local')
  const superadminEnvPath = path.join(process.cwd(), 'apps/superadmin/.env.local')

  // Check if web-template .env.local exists
  if (!fs.existsSync(webTemplateEnvPath)) {
    console.error('❌ Error: apps/web-template/.env.local not found')
    console.error('   Please set up web-template first:\n')
    console.error('   cd apps/web-template')
    console.error('   cp env.template .env.local')
    console.error('   # Edit .env.local with your credentials\n')
    process.exit(1)
  }

  // Check if superadmin .env.local already exists
  if (fs.existsSync(superadminEnvPath)) {
    console.log('⚠️  apps/superadmin/.env.local already exists')
    console.log('   Delete it first if you want to recreate it.\n')
    process.exit(0)
  }

  // Read web-template .env.local
  const webTemplateEnv = fs.readFileSync(webTemplateEnvPath, 'utf-8')

  // Parse and modify for superadmin
  const lines = webTemplateEnv.split('\n')
  const modifiedLines = lines.map(line => {
    // Update APP_URL to point to superadmin port
    if (line.startsWith('NEXT_PUBLIC_APP_URL=')) {
      return 'NEXT_PUBLIC_APP_URL=http://localhost:4501'
    }
    return line
  })

  // Write to superadmin .env.local
  fs.writeFileSync(superadminEnvPath, modifiedLines.join('\n'))

  console.log('✅ Created apps/superadmin/.env.local')
  console.log('   Environment variables copied from web-template')
  console.log('   APP_URL updated to http://localhost:4501\n')
  console.log('Next steps:')
  console.log('1. Start the superadmin app: pnpm --filter superadmin dev')
  console.log('2. Sign in at http://localhost:4501/sign-in')
  console.log('3. Grant yourself superadmin access (see grant-superadmin.ts)\n')
}

main()
