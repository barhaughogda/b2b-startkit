import { z } from 'zod'

/**
 * Common form validation patterns using Zod
 * These can be reused across forms in different products
 */

/**
 * Email validation pattern
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')

/**
 * Password validation pattern
 * Minimum 8 characters, at least one letter and one number
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

/**
 * Strong password validation pattern
 * Minimum 12 characters, at least one uppercase, one lowercase, one number, one special character
 */
export const strongPasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')

/**
 * URL validation pattern
 */
export const urlSchema = z.string().url('Please enter a valid URL')

/**
 * Phone number validation pattern (basic)
 * Accepts formats: (123) 456-7890, 123-456-7890, 123.456.7890, +1 123 456 7890
 */
export const phoneSchema = z
  .string()
  .regex(
    /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
    'Please enter a valid phone number'
  )

/**
 * Organization slug validation pattern
 * Lowercase letters, numbers, and hyphens only, 3-50 characters
 */
export const slugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  .refine((val) => !val.startsWith('-') && !val.endsWith('-'), {
    message: 'Slug cannot start or end with a hyphen',
  })

/**
 * Name validation pattern
 * 2-100 characters, allows letters, spaces, hyphens, apostrophes
 */
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')

/**
 * Non-empty string validation
 */
export const nonEmptyStringSchema = z.string().min(1, 'This field is required')

/**
 * Positive integer validation
 */
export const positiveIntegerSchema = z
  .number()
  .int('Must be a whole number')
  .positive('Must be a positive number')

/**
 * Non-negative integer validation (allows zero)
 */
export const nonNegativeIntegerSchema = z.number().int('Must be a whole number').min(0, 'Cannot be negative')

/**
 * Currency amount validation (positive number with 2 decimal places)
 */
export const currencySchema = z
  .number()
  .positive('Amount must be positive')
  .max(999999999.99, 'Amount is too large')
  .refine((val) => {
    const decimals = val.toString().split('.')[1]
    return !decimals || decimals.length <= 2
  }, 'Amount can have at most 2 decimal places')

/**
 * Date validation (must be in the future)
 */
export const futureDateSchema = z.date().refine((date) => date > new Date(), {
  message: 'Date must be in the future',
})

/**
 * Date validation (must be in the past)
 */
export const pastDateSchema = z.date().refine((date) => date < new Date(), {
  message: 'Date must be in the past',
})

/**
 * Helper to create a required field schema
 */
export function required<T extends z.ZodTypeAny>(schema: T): z.ZodEffects<T> {
  return schema.refine((val) => val !== null && val !== undefined && val !== '', {
    message: 'This field is required',
  })
}

/**
 * Helper to create an optional field schema
 */
export function optional<T extends z.ZodTypeAny>(schema: T): z.ZodOptional<T> {
  return schema.optional()
}

/**
 * Helper to create a nullable field schema
 */
export function nullable<T extends z.ZodTypeAny>(schema: T): z.ZodNullable<T> {
  return schema.nullable()
}

/**
 * Common form schemas for reuse
 */
export const commonSchemas = {
  email: emailSchema,
  password: passwordSchema,
  strongPassword: strongPasswordSchema,
  url: urlSchema,
  phone: phoneSchema,
  slug: slugSchema,
  name: nameSchema,
  nonEmptyString: nonEmptyStringSchema,
  positiveInteger: positiveIntegerSchema,
  nonNegativeInteger: nonNegativeIntegerSchema,
  currency: currencySchema,
  futureDate: futureDateSchema,
  pastDate: pastDateSchema,
} as const

/**
 * Example usage:
 *
 * ```tsx
 * import { z } from 'zod'
 * import { emailSchema, passwordSchema, nameSchema } from '@startkit/ui/lib/form-validation'
 *
 * const signUpSchema = z.object({
 *   name: nameSchema,
 *   email: emailSchema,
 *   password: passwordSchema,
 *   confirmPassword: z.string(),
 * }).refine((data) => data.password === data.confirmPassword, {
 *   message: "Passwords don't match",
 *   path: ["confirmPassword"],
 * })
 * ```
 */
