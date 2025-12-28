/**
 * Environment Validation Tests
 * 
 * Tests for @startkit/config environment variable validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { validateEnv, getServerEnv, getClientEnv, serverEnvSchema, clientEnvSchema } from './env'

describe('Environment Validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset process.env
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    // Restore original env
    process.env = originalEnv
  })

  describe('serverEnvSchema', () => {
    it('should validate required server environment variables', () => {
      const validEnv = {
        NODE_ENV: 'production',
        CLERK_SECRET_KEY: 'sk_test_123',
        CLERK_WEBHOOK_SECRET: 'whsec_test_123',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
      }

      const result = serverEnvSchema.safeParse(validEnv)
      expect(result.success).toBe(true)
    })

    it('should reject missing CLERK_SECRET_KEY', () => {
      const invalidEnv = {
        CLERK_WEBHOOK_SECRET: 'whsec_test_123',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
      }

      const result = serverEnvSchema.safeParse(invalidEnv)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors).toHaveProperty('CLERK_SECRET_KEY')
      }
    })

    it('should validate STRIPE_SECRET_KEY format', () => {
      const invalidEnv = {
        CLERK_SECRET_KEY: 'sk_test_123',
        CLERK_WEBHOOK_SECRET: 'whsec_test_123',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        STRIPE_SECRET_KEY: 'invalid_key', // Should start with sk_
        STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
      }

      const result = serverEnvSchema.safeParse(invalidEnv)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors).toHaveProperty('STRIPE_SECRET_KEY')
      }
    })

    it('should validate STRIPE_WEBHOOK_SECRET format', () => {
      const invalidEnv = {
        CLERK_SECRET_KEY: 'sk_test_123',
        CLERK_WEBHOOK_SECRET: 'whsec_test_123',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'invalid_secret', // Should start with whsec_
      }

      const result = serverEnvSchema.safeParse(invalidEnv)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors).toHaveProperty('STRIPE_WEBHOOK_SECRET')
      }
    })

    it('should accept optional environment variables', () => {
      const envWithOptionals = {
        NODE_ENV: 'production',
        CLERK_SECRET_KEY: 'sk_test_123',
        CLERK_WEBHOOK_SECRET: 'whsec_test_123',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
        RESEND_API_KEY: 're_test_123',
        POSTHOG_API_KEY: 'ph_test_123',
        SENTRY_DSN: 'https://example@sentry.io/123',
      }

      const result = serverEnvSchema.safeParse(envWithOptionals)
      expect(result.success).toBe(true)
    })

    it('should validate NODE_ENV enum', () => {
      const validEnvs = ['development', 'test', 'production']
      
      validEnvs.forEach((env) => {
        const result = serverEnvSchema.safeParse({
          NODE_ENV: env,
          CLERK_SECRET_KEY: 'sk_test_123',
          CLERK_WEBHOOK_SECRET: 'whsec_test_123',
          SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
          STRIPE_SECRET_KEY: 'sk_test_123',
          STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
        })
        expect(result.success).toBe(true)
      })

      const invalidResult = serverEnvSchema.safeParse({
        NODE_ENV: 'invalid',
        CLERK_SECRET_KEY: 'sk_test_123',
        CLERK_WEBHOOK_SECRET: 'whsec_test_123',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
      })
      expect(invalidResult.success).toBe(false)
    })

    it('should default NODE_ENV to development', () => {
      const envWithoutNodeEnv = {
        CLERK_SECRET_KEY: 'sk_test_123',
        CLERK_WEBHOOK_SECRET: 'whsec_test_123',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
      }

      const result = serverEnvSchema.safeParse(envWithoutNodeEnv)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development')
      }
    })
  })

  describe('clientEnvSchema', () => {
    it('should validate required client environment variables', () => {
      const validEnv = {
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_123',
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
      }

      const result = clientEnvSchema.safeParse(validEnv)
      expect(result.success).toBe(true)
    })

    it('should validate NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY format', () => {
      const invalidEnv = {
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'invalid_key', // Should start with pk_
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
      }

      const result = clientEnvSchema.safeParse(invalidEnv)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors).toHaveProperty('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY')
      }
    })

    it('should validate URL formats', () => {
      const invalidEnv = {
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_123',
        NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
      }

      const result = clientEnvSchema.safeParse(invalidEnv)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors).toHaveProperty('NEXT_PUBLIC_SUPABASE_URL')
      }
    })

    it('should provide default values for optional fields', () => {
      const envWithDefaults = {
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_123',
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
      }

      const result = clientEnvSchema.safeParse(envWithDefaults)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.NEXT_PUBLIC_CLERK_SIGN_IN_URL).toBe('/sign-in')
        expect(result.data.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL).toBe('/dashboard')
        expect(result.data.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000')
      }
    })

    it('should accept optional analytics variables', () => {
      const envWithAnalytics = {
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_123',
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
        NEXT_PUBLIC_POSTHOG_KEY: 'ph_test_123',
        NEXT_PUBLIC_POSTHOG_HOST: 'https://app.posthog.com',
      }

      const result = clientEnvSchema.safeParse(envWithAnalytics)
      expect(result.success).toBe(true)
    })
  })

  describe('validateEnv()', () => {
    it('should throw error on invalid server env', () => {
      process.env = {
        // Missing required vars
      }

      expect(() => validateEnv()).toThrow('Invalid server environment variables')
    })

    it('should throw error on invalid client env', () => {
      process.env = {
        CLERK_SECRET_KEY: 'sk_test_123',
        CLERK_WEBHOOK_SECRET: 'whsec_test_123',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
        // Missing client vars
      }

      expect(() => validateEnv()).toThrow('Invalid client environment variables')
    })

    it('should return validated env on success', () => {
      process.env = {
        NODE_ENV: 'test',
        CLERK_SECRET_KEY: 'sk_test_123',
        CLERK_WEBHOOK_SECRET: 'whsec_test_123',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_123',
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
      }

      const result = validateEnv()
      expect(result.server).toBeDefined()
      expect(result.client).toBeDefined()
      expect(result.server.CLERK_SECRET_KEY).toBe('sk_test_123')
      expect(result.client.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBe('pk_test_123')
    })
  })

  describe('getServerEnv()', () => {
    it('should throw on invalid env', () => {
      process.env = {
        // Missing required vars
      }

      expect(() => getServerEnv()).toThrow()
    })

    it('should return validated server env', () => {
      process.env = {
        CLERK_SECRET_KEY: 'sk_test_123',
        CLERK_WEBHOOK_SECRET: 'whsec_test_123',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
      }

      const env = getServerEnv()
      expect(env.CLERK_SECRET_KEY).toBe('sk_test_123')
    })
  })

  describe('getClientEnv()', () => {
    it('should throw on invalid env', () => {
      process.env = {
        // Missing required vars
      }

      expect(() => getClientEnv()).toThrow()
    })

    it('should return validated client env', () => {
      process.env = {
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_123',
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
      }

      const env = getClientEnv()
      expect(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBe('pk_test_123')
    })
  })
})
