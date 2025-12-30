/**
 * Apply Zenthea-specific RLS policies migration script
 *
 * This script applies the RLS policies SQL migration to the Zenthea tables.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { getSuperadminDb } from '@startkit/database'

async function applyZentheaRLS() {
  console.log('📋 Applying Zenthea RLS policies...')

  const sqlPath = join(process.cwd(), 'src/lib/db/migrations/0001_zenthea_rls.sql')
  const sql = readFileSync(sqlPath, 'utf-8')

  const { postgres } = getSuperadminDb()

  try {
    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      if (statement.trim()) {
        await postgres.unsafe(statement)
      }
    }

    console.log('✅ Zenthea RLS policies applied successfully')
  } catch (error) {
    console.error('❌ Error applying Zenthea RLS policies:', error)
    throw error
  } finally {
    await postgres.end()
  }
}

// Run if executed directly
if (require.main === module) {
  applyZentheaRLS()
    .then(() => {
      console.log('✨ Migration complete')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error)
      process.exit(1)
    })
}

export { applyZentheaRLS }
