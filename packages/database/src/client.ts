import { drizzle } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import * as schema from './schema'

/**
 * Database client wrapper that includes both Drizzle ORM and raw postgres client
 */
export interface DbClient {
  drizzle: ReturnType<typeof drizzle>
  postgres: Sql
}

/**
 * Create a database client with the given connection string
 *
 * @ai-no-modify Database connection is critical infrastructure
 */
export function createDbClient(connectionString: string): DbClient {
  const pgClient = postgres(connectionString, {
    max: 10, // Connection pool size
    idle_timeout: 20,
    connect_timeout: 10,
  })

  const drizzleClient = drizzle(pgClient, { schema })

  return {
    drizzle: drizzleClient,
    postgres: pgClient,
  }
}

/**
 * Create a superadmin database client
 * This should ONLY be used for:
 * - Webhook handlers (Clerk, Stripe)
 * - Superadmin operations
 * - System migrations
 *
 * @ai-context Use with caution - this has full database access.
 * Never use this for regular user requests.
 *
 * Note: For Supabase connection poolers, we use the regular DATABASE_URL.
 * The service role key is for the Supabase REST API, not postgres connections.
 * RLS bypass on pooled connections requires setting role via SQL, not connection string.
 */
export function createSuperadminClient(): DbClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for superadmin client')
  }

  const pgClient = postgres(connectionString, {
    max: 5, // Smaller pool for admin operations
    idle_timeout: 20,
    connect_timeout: 10,
  })

  const drizzleClient = drizzle(pgClient, { schema })

  return {
    drizzle: drizzleClient,
    postgres: pgClient,
  }
}

/**
 * Default database client
 * Uses DATABASE_URL environment variable
 *
 * Initialize in your app's instrumentation.ts or use createDbClient for custom config
 */
let dbInstance: DbClient | null = null

export function getDb(): DbClient {
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    dbInstance = createDbClient(connectionString)
  }
  return dbInstance
}

/**
 * Superadmin database client (bypasses RLS)
 * Use ONLY for webhooks, migrations, and superadmin operations
 *
 * @ai-context This bypasses RLS - use with extreme caution.
 */
let superadminDbInstance: DbClient | null = null

export function getSuperadminDb(): DbClient {
  if (!superadminDbInstance) {
    superadminDbInstance = createSuperadminClient()
  }
  return superadminDbInstance
}

/**
 * Get the raw postgres client for executing raw SQL
 * Use this for setting session variables, migrations, etc.
 */
export function getPostgresClient(): Sql {
  return getDb().postgres
}

// Export a lazy getter for convenience (returns Drizzle ORM client)
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return getDb().drizzle[prop as keyof ReturnType<typeof drizzle>]
  },
})

/**
 * Superadmin database client (bypasses RLS)
 * Use ONLY for webhooks, migrations, and superadmin operations
 */
export const superadminDb = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return getSuperadminDb().drizzle[prop as keyof ReturnType<typeof drizzle>]
  },
})
