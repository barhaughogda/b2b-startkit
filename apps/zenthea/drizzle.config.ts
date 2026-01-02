import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: ['./src/lib/db/schema.ts', '../../packages/database/src/schema/index.ts'],
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
