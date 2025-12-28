#!/usr/bin/env tsx
/**
 * Stripe Setup Script
 *
 * Creates products and prices in Stripe for StartKit default plans:
 * - Free: $0/month
 * - Pro: $29/month or $290/year
 * - Enterprise: $99/month or $990/year
 *
 * Usage:
 *   pnpm setup:stripe
 *
 * Requirements:
 *   - STRIPE_SECRET_KEY must be set in environment
 *
 * This script is idempotent - safe to run multiple times.
 * It will skip products/prices that already exist.
 */

import { getStripe } from '@startkit/billing'
import type Stripe from 'stripe'

interface PlanConfig {
  name: string
  description: string
  monthlyPrice: number // in cents
  yearlyPrice: number // in cents
  metadata?: Record<string, string>
}

const DEFAULT_PLANS: Record<string, PlanConfig> = {
  free: {
    name: 'Free',
    description: 'Perfect for getting started with basic features',
    monthlyPrice: 0,
    yearlyPrice: 0,
    metadata: {
      tier: 'free',
      seats: '1',
    },
  },
  pro: {
    name: 'Pro',
    description: 'For growing teams with advanced features',
    monthlyPrice: 2900, // $29/month
    yearlyPrice: 29000, // $290/year (~$24.17/month)
    metadata: {
      tier: 'pro',
      seats: '10',
    },
  },
  enterprise: {
    name: 'Enterprise',
    description: 'For large organizations with custom needs',
    monthlyPrice: 9900, // $99/month
    yearlyPrice: 99000, // $990/year (~$82.50/month)
    metadata: {
      tier: 'enterprise',
      seats: 'unlimited',
    },
  },
}

interface CreatedResources {
  products: Record<string, Stripe.Product>
  prices: {
    monthly: Record<string, Stripe.Price>
    yearly: Record<string, Stripe.Price>
  }
}

/**
 * Find existing product by name (case-insensitive)
 */
async function findExistingProduct(
  stripe: Stripe,
  name: string
): Promise<Stripe.Product | null> {
  const products = await stripe.products.list({ limit: 100 })
  return products.data.find((p) => p.name.toLowerCase() === name.toLowerCase()) || null
}

/**
 * Find existing price for a product
 */
async function findExistingPrice(
  stripe: Stripe,
  productId: string,
  interval: 'month' | 'year',
  amount: number
): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({
    product: productId,
    limit: 100,
  })

  return (
    prices.data.find(
      (p) =>
        p.recurring?.interval === interval &&
        p.unit_amount === amount &&
        p.active
    ) || null
  )
}

/**
 * Create or get existing product
 */
async function ensureProduct(
  stripe: Stripe,
  planKey: string,
  config: PlanConfig
): Promise<Stripe.Product> {
  const existing = await findExistingProduct(stripe, config.name)

  if (existing) {
    console.log(`  ✓ Product "${config.name}" already exists (${existing.id})`)
    return existing
  }

  const product = await stripe.products.create({
    name: config.name,
    description: config.description,
    metadata: {
      plan_key: planKey,
      ...config.metadata,
    },
  })

  console.log(`  ✓ Created product "${config.name}" (${product.id})`)
  return product
}

/**
 * Create or get existing price
 */
async function ensurePrice(
  stripe: Stripe,
  product: Stripe.Product,
  interval: 'month' | 'year',
  amount: number
): Promise<Stripe.Price> {
  const existing = await findExistingPrice(stripe, product.id, interval, amount)

  if (existing) {
    const intervalLabel = interval === 'month' ? 'monthly' : 'yearly'
    console.log(
      `    ✓ ${intervalLabel} price already exists (${existing.id})`
    )
    return existing
  }

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: 'usd',
    recurring: {
      interval,
    },
    metadata: {
      plan_tier: product.metadata.tier || 'unknown',
      billing_interval: interval,
    },
  })

  const intervalLabel = interval === 'month' ? 'monthly' : 'yearly'
  const amountFormatted = (amount / 100).toFixed(2)
  console.log(
    `    ✓ Created ${intervalLabel} price: $${amountFormatted} (${price.id})`
  )

  return price
}

/**
 * Main setup function
 */
async function setupStripe(): Promise<CreatedResources> {
  // Check for Stripe secret key
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ Error: STRIPE_SECRET_KEY environment variable is not set')
    console.error('')
    console.error('Please set your Stripe secret key:')
    console.error('  export STRIPE_SECRET_KEY=sk_test_...')
    console.error('')
    console.error('Or add it to your .env.local file')
    process.exit(1)
  }

  const stripe = getStripe()
  const resources: CreatedResources = {
    products: {},
    prices: {
      monthly: {},
      yearly: {},
    },
  }

  console.log('🚀 Setting up Stripe products and prices...\n')

  // Create products and prices
  for (const [planKey, config] of Object.entries(DEFAULT_PLANS)) {
    console.log(`📦 Setting up ${config.name} plan...`)

    // Create or get product
    const product = await ensureProduct(stripe, planKey, config)
    resources.products[planKey] = product

    // Create monthly price (if not free)
    if (config.monthlyPrice > 0) {
      const monthlyPrice = await ensurePrice(
        stripe,
        product,
        'month',
        config.monthlyPrice
      )
      resources.prices.monthly[planKey] = monthlyPrice
    } else {
      console.log('    ⏭️  Skipping monthly price (free plan)')
    }

    // Create yearly price (if not free)
    if (config.yearlyPrice > 0) {
      const yearlyPrice = await ensurePrice(
        stripe,
        product,
        'year',
        config.yearlyPrice
      )
      resources.prices.yearly[planKey] = yearlyPrice
    } else {
      console.log('    ⏭️  Skipping yearly price (free plan)')
    }

    console.log('')
  }

  return resources
}

/**
 * Format price IDs for .env.local
 */
function formatEnvOutput(resources: CreatedResources): string {
  const lines: string[] = []
  lines.push('# Stripe Price IDs (created by setup-stripe script)')
  lines.push('# Add these to your .env.local or product config')
  lines.push('')

  // Monthly prices
  lines.push('# Monthly prices')
  for (const [planKey, price] of Object.entries(resources.prices.monthly)) {
    const envKey = `STRIPE_PRICE_ID_${planKey.toUpperCase()}_MONTHLY`
    lines.push(`${envKey}=${price.id}`)
  }
  lines.push('')

  // Yearly prices
  lines.push('# Yearly prices')
  for (const [planKey, price] of Object.entries(resources.prices.yearly)) {
    const envKey = `STRIPE_PRICE_ID_${planKey.toUpperCase()}_YEARLY`
    lines.push(`${envKey}=${price.id}`)
  }
  lines.push('')

  // Product IDs
  lines.push('# Product IDs')
  for (const [planKey, product] of Object.entries(resources.products)) {
    const envKey = `STRIPE_PRODUCT_ID_${planKey.toUpperCase()}`
    lines.push(`${envKey}=${product.id}`)
  }

  return lines.join('\n')
}

/**
 * Format price IDs as JSON config
 */
function formatJsonConfig(resources: CreatedResources): string {
  const config: Record<string, unknown> = {
    products: {},
    prices: {
      monthly: {},
      yearly: {},
    },
  }

  for (const [planKey, product] of Object.entries(resources.products)) {
    config.products[planKey] = product.id
  }

  for (const [planKey, price] of Object.entries(resources.prices.monthly)) {
    config.prices.monthly[planKey] = price.id
  }

  for (const [planKey, price] of Object.entries(resources.prices.yearly)) {
    config.prices.yearly[planKey] = price.id
  }

  return JSON.stringify(config, null, 2)
}

/**
 * Main execution
 */
async function main() {
  try {
    const resources = await setupStripe()

    console.log('='.repeat(60))
    console.log('✅ Stripe setup complete!')
    console.log('='.repeat(60))
    console.log('')

    // Output environment variables format
    console.log('📋 Price IDs (for .env.local):')
    console.log('')
    console.log(formatEnvOutput(resources))
    console.log('')

    // Output JSON config format
    console.log('📋 Price IDs (JSON config format):')
    console.log('')
    console.log(formatJsonConfig(resources))
    console.log('')

    console.log('💡 Next steps:')
    console.log('  1. Copy the price IDs above to your .env.local or product config')
    console.log('  2. Use these IDs in your checkout session creation')
    console.log('  3. Set up webhook endpoint: /api/webhooks/stripe')
    console.log('')
  } catch (error) {
    console.error('❌ Error setting up Stripe:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
      if (error.stack) {
        console.error('')
        console.error(error.stack)
      }
    } else {
      console.error(error)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
