import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * Create a database client with the given connection string
 *
 * @ai-no-modify Database connection is critical infrastructure
 */
export function createDbClient(connectionString: string) {
  const client = postgres(connectionString, {
    max: 10, // Connection pool size
    idle_timeout: 20,
    connect_timeout: 10,
  })

  return drizzle(client, { schema })
}

/**
 * Default database client
 * Uses DATABASE_URL environment variable
 *
 * Initialize in your app's instrumentation.ts or use createDbClient for custom config
 */
let dbInstance: ReturnType<typeof createDbClient> | null = null

export function getDb() {
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    dbInstance = createDbClient(connectionString)
  }
  return dbInstance
}

// Export a lazy getter for convenience
export const db = new Proxy({} as ReturnType<typeof createDbClient>, {
  get(_, prop) {
    return getDb()[prop as keyof ReturnType<typeof createDbClient>]
  },
})
