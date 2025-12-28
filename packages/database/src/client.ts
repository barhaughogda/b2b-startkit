import { drizzle } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import * as schema from './schema'
import { env } from '@startkit/config'

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
 * Create a Supabase service role client that bypasses RLS
 * This should ONLY be used for:
 * - Webhook handlers (Clerk, Stripe)
 * - Superadmin operations
 * - System migrations
 *
 * @ai-context This bypasses RLS - use with extreme caution.
 * Never use this for regular user requests.
 *
 * For Supabase, the service role key is used as the password when connecting.
 * The connection string should be in format:
 * postgresql://postgres.[project-ref]:[service-role-key]@[host]:[port]/postgres
 */
export function createSuperadminClient(): DbClient {
  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) {
    throw new Error('DATABASE_URL is required for superadmin client')
  }

  const serviceRoleKey = env.server.SUPABASE_SERVICE_ROLE_KEY

  // Parse the base connection string and replace password with service role key
  // This works for both direct connections and connection poolers
  const urlObj = new URL(baseUrl)

  // Extract project ref from URL if it's a Supabase URL
  // Format: postgresql://postgres.[ref]:[password]@[host]:[port]/postgres
  const username = urlObj.username || 'postgres'
  const projectRef = username.includes('.') ? username.split('.')[1] : username

  // Construct service role connection string
  // Use service role key as password to bypass RLS
  urlObj.username = `postgres.${projectRef}`
  urlObj.password = serviceRoleKey

  const pgClient = postgres(urlObj.toString(), {
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
