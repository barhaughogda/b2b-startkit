import { z } from 'zod'

/**
 * Server-side environment variables schema
 * These are validated at build time and runtime startup
 *
 * @ai-no-modify - Critical security configuration
 */
export const serverEnvSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Clerk (Auth)
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  CLERK_WEBHOOK_SECRET: z.string().min(1, 'CLERK_WEBHOOK_SECRET is required'),

  // Supabase (Database)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL').optional(),

  // Stripe (Billing)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_'),

  // Optional services
  RESEND_API_KEY: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
})

/**
 * Client-side environment variables schema
 * These are exposed to the browser - NEVER include secrets
 */
export const clientEnvSchema = z.object({
  // Clerk (Auth)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_', 'Must start with pk_'),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/dashboard'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/dashboard'),

  // Supabase (Database)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Anon key is required'),

  // Stripe (Billing)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_', 'Must start with pk_'),

  // Analytics
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>

/**
 * Validates environment variables at startup
 * Call this in your app's instrumentation.ts or layout.tsx
 *
 * @throws {ZodError} If validation fails with detailed error messages
 */
export function validateEnv(): { server: ServerEnv; client: ClientEnv } {
  const server = serverEnvSchema.safeParse(process.env)
  const client = clientEnvSchema.safeParse(process.env)

  if (!server.success) {
    console.error('❌ Invalid server environment variables:')
    console.error(server.error.flatten().fieldErrors)
    throw new Error('Invalid server environment variables')
  }

  if (!client.success) {
    console.error('❌ Invalid client environment variables:')
    console.error(client.error.flatten().fieldErrors)
    throw new Error('Invalid client environment variables')
  }

  return { server: server.data, client: client.data }
}

/**
 * Type-safe environment access
 * Use this instead of process.env directly
 */
export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse(process.env)
}

export function getClientEnv(): ClientEnv {
  return clientEnvSchema.parse(process.env)
}

/**
 * Unified environment object that validates on first access
 * This is the primary export - use `import { env } from '@startkit/config'`
 *
 * Validation happens lazily on first access to fail fast without
 * blocking module loading in test environments.
 */
let validatedEnv: { server: ServerEnv; client: ClientEnv } | null = null

function getValidatedEnv() {
  if (!validatedEnv) {
    validatedEnv = validateEnv()
  }
  return validatedEnv
}

/**
 * Type-safe environment access
 * Validates on first access and caches the result
 *
 * @example
 * ```ts
 * import { env } from '@startkit/config'
 *
 * // Server-side
 * const secretKey = env.server.CLERK_SECRET_KEY
 *
 * // Client-side (in components)
 * const publishableKey = env.client.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
 * ```
 */
export const env = {
  get server(): ServerEnv {
    return getValidatedEnv().server
  },
  get client(): ClientEnv {
    return getValidatedEnv().client
  },
} as const
