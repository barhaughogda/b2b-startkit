import { z } from 'zod'

/**
 * Zenthea-specific environment variable validation
 * 
 * This is separate from @startkit/config's validateEnv() because Zenthea
 * uses AWS Postgres (not Supabase) and doesn't need Supabase env vars.
 * 
 * Zenthea is HIPAA-compliant and runs entirely on AWS infrastructure.
 * 
 * @see docs/migration-plan.md - T01 for context
 */

/**
 * Server-side environment variables schema for Zenthea
 * These are validated at build time and runtime startup
 */
export const zentheaServerEnvSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Clerk (Auth) - Required
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  CLERK_WEBHOOK_SECRET: z.string().min(1, 'CLERK_WEBHOOK_SECRET is required'),

  // AWS Postgres (Database) - Required
  // Format: postgresql://user:password@host:port/database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL'),

  // Stripe (Billing) - Required
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_'),

  // AWS S3 (File Storage) - Required for HIPAA-compliant storage
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().min(1, 'AWS_S3_BUCKET is required'),
  AWS_S3_MEDICAL_BUCKET: z.string().min(1, 'AWS_S3_MEDICAL_BUCKET is required'),
  AWS_ACCESS_KEY_ID: z.string().optional(), // Optional if using IAM roles (ECS/EC2)
  AWS_SECRET_ACCESS_KEY: z.string().optional(), // Optional if using IAM roles (ECS/EC2)

  // Optional services
  SENDGRID_API_KEY: z.string().optional(),
  GOOGLE_CALENDAR_CLIENT_ID: z.string().optional(),
  GOOGLE_CALENDAR_CLIENT_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),

  // Optional observability (must be HIPAA-compliant if handling PHI)
  RESEND_API_KEY: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
})

/**
 * Client-side environment variables schema for Zenthea
 * These are exposed to the browser - NEVER include secrets
 */
export const zentheaClientEnvSchema = z.object({
  // Clerk (Auth) - Required
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_', 'Must start with pk_'),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),

  // Stripe (Billing) - Required
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_', 'Must start with pk_'),

  // App configuration
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // AWS CloudFront (CDN) - Optional, for public assets
  NEXT_PUBLIC_CLOUDFRONT_DOMAIN: z.string().optional(),

  // Optional analytics (must not capture PHI)
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
})

export type ZentheaServerEnv = z.infer<typeof zentheaServerEnvSchema>
export type ZentheaClientEnv = z.infer<typeof zentheaClientEnvSchema>

/**
 * Validates Zenthea environment variables at startup
 * Call this in your app's layout.tsx instead of @startkit/config's validateEnv()
 * 
 * @throws {ZodError} If validation fails with detailed error messages
 * 
 * @example
 * ```ts
 * // In apps/zenthea/src/app/layout.tsx
 * import { validateZentheaEnv } from '@/lib/env'
 * 
 * if (typeof window === 'undefined') {
 *   validateZentheaEnv()
 * }
 * ```
 */
export function validateZentheaEnv(): { server: ZentheaServerEnv; client: ZentheaClientEnv } {
  const server = zentheaServerEnvSchema.safeParse(process.env)
  const client = zentheaClientEnvSchema.safeParse(process.env)

  if (!server.success) {
    console.error('❌ Invalid Zenthea server environment variables:')
    console.error(server.error.flatten().fieldErrors)
    throw new Error('Invalid Zenthea server environment variables')
  }

  if (!client.success) {
    console.error('❌ Invalid Zenthea client environment variables:')
    console.error(client.error.flatten().fieldErrors)
    throw new Error('Invalid Zenthea client environment variables')
  }

  return { server: server.data, client: client.data }
}

/**
 * Type-safe environment access for Zenthea
 * Use this instead of process.env directly
 */
export function getZentheaServerEnv(): ZentheaServerEnv {
  return zentheaServerEnvSchema.parse(process.env)
}

export function getZentheaClientEnv(): ZentheaClientEnv {
  return zentheaClientEnvSchema.parse(process.env)
}

/**
 * Unified environment object that validates on first access
 * This is the primary export - use `import { zentheaEnv } from '@/lib/env'`
 * 
 * Validation happens lazily on first access to fail fast without
 * blocking module loading in test environments.
 */
let validatedZentheaEnv: { server: ZentheaServerEnv; client: ZentheaClientEnv } | null = null

function getValidatedZentheaEnv() {
  if (!validatedZentheaEnv) {
    validatedZentheaEnv = validateZentheaEnv()
  }
  return validatedZentheaEnv
}

/**
 * Type-safe environment access for Zenthea
 * Validates on first access and caches the result
 * 
 * @example
 * ```ts
 * import { zentheaEnv } from '@/lib/env'
 * 
 * // Server-side
 * const secretKey = zentheaEnv.server.CLERK_SECRET_KEY
 * const dbUrl = zentheaEnv.server.DATABASE_URL
 * 
 * // Client-side (in components)
 * const publishableKey = zentheaEnv.client.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
 * ```
 */
export const zentheaEnv = {
  get server(): ZentheaServerEnv {
    return getValidatedZentheaEnv().server
  },
  get client(): ZentheaClientEnv {
    return getValidatedZentheaEnv().client
  },
} as const
