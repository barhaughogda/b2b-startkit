/**
 * Apply RLS policies migration script
 *
 * This script applies the RLS policies SQL migration to the database.
 * Run this after schema migrations to enable Row-Level Security.
 *
 * Usage:
 * ```bash
 * pnpm tsx packages/database/src/migrations/apply-rls.ts
 * ```
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { getSuperadminDb } from '../client'

async function applyRLSPolicies() {
  console.log('📋 Applying RLS policies...')

  const sqlPath = join(__dirname, 'sql', '0001_enable_rls.sql')
  const sql = readFileSync(sqlPath, 'utf-8')

  const db = getSuperadminDb()

  try {
    // Split SQL by semicolons and execute each statement
    // Note: This is a simple approach - for production, use a proper SQL parser
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      if (statement.trim()) {
        await db.postgres.unsafe(statement)
      }
    }

    console.log('✅ RLS policies applied successfully')
  } catch (error) {
    console.error('❌ Error applying RLS policies:', error)
    throw error
  } finally {
    await db.postgres.end()
  }
}

// Run if executed directly
if (require.main === module) {
  applyRLSPolicies()
    .then(() => {
      console.log('✨ Migration complete')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error)
      process.exit(1)
    })
}

export { applyRLSPolicies }
