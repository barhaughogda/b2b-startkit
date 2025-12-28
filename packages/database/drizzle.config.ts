import { defineConfig } from 'drizzle-kit'

/**
 * Drizzle Kit configuration
 *
 * Run with:
 * - pnpm db:generate - Generate migrations
 * - pnpm db:migrate - Apply migrations
 * - pnpm db:push - Push schema directly (dev only)
 * - pnpm db:studio - Open Drizzle Studio
 */
export default defineConfig({
  schema: './src/schema/index.ts',
  out: './src/migrations/sql',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
