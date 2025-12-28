#!/usr/bin/env tsx
/**
 * Create a new product from the web-template
 *
 * Usage:
 *   pnpm create:product --name=my-product --display-name="My Product"
 *
 * @ai-no-modify This script scaffolds new products.
 * Changes require careful review to ensure consistency.
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

interface CreateProductOptions {
  name: string
  displayName: string
  description?: string
  pricingModel?: 'per_seat' | 'usage_based' | 'flat_rate'
  hasAiFeatures?: boolean
}

function parseArgs(): CreateProductOptions {
  const args = process.argv.slice(2)
  const options: Partial<CreateProductOptions> = {}

  for (const arg of args) {
    const [key, value] = arg.replace('--', '').split('=')
    switch (key) {
      case 'name':
        options.name = value
        break
      case 'display-name':
        options.displayName = value
        break
      case 'description':
        options.description = value
        break
      case 'pricing-model':
        options.pricingModel = value as CreateProductOptions['pricingModel']
        break
      case 'has-ai-features':
        options.hasAiFeatures = value === 'true'
        break
    }
  }

  if (!options.name) {
    console.error('Error: --name is required')
    console.log('Usage: pnpm create:product --name=my-product --display-name="My Product"')
    process.exit(1)
  }

  return {
    name: options.name,
    displayName: options.displayName ?? options.name,
    description: options.description ?? `A StartKit product: ${options.displayName ?? options.name}`,
    pricingModel: options.pricingModel ?? 'per_seat',
    hasAiFeatures: options.hasAiFeatures ?? false,
  }
}

function validateName(name: string): void {
  // Must be kebab-case
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error('Error: name must be kebab-case (lowercase letters, numbers, hyphens)')
    process.exit(1)
  }

  // Check if already exists
  const targetPath = path.join(process.cwd(), 'apps', name)
  if (fs.existsSync(targetPath)) {
    console.error(`Error: Product "${name}" already exists at ${targetPath}`)
    process.exit(1)
  }
}

function copyTemplate(options: CreateProductOptions): void {
  const templatePath = path.join(process.cwd(), 'apps', 'web-template')
  const targetPath = path.join(process.cwd(), 'apps', options.name)

  if (!fs.existsSync(templatePath)) {
    console.error('Error: web-template not found. Make sure you have the template set up.')
    process.exit(1)
  }

  console.log(`📁 Copying template to apps/${options.name}...`)

  // Copy directory recursively
  fs.cpSync(templatePath, targetPath, { recursive: true })

  // Update package.json
  const packageJsonPath = path.join(targetPath, 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  packageJson.name = options.name
  packageJson.description = options.description
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

  // Create product config
  const configContent = `/**
 * Product configuration for ${options.displayName}
 *
 * @ai-context This file contains product-specific settings.
 * Modify these values to customize your product.
 */

export const productConfig = {
  name: '${options.name}',
  displayName: '${options.displayName}',
  description: '${options.description}',
  
  // Branding
  branding: {
    primaryColor: '#0070f3',
    logo: '/logo.svg',
    favicon: '/favicon.ico',
  },
  
  // Pricing model
  pricing: {
    model: '${options.pricingModel}' as const,
    trialDays: 14,
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        features: ['Basic features', 'Community support'],
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 29,
        features: ['All features', 'Priority support', 'API access'],
      },
    ],
  },
  
  // Feature flags
  features: {
    aiFeatures: ${options.hasAiFeatures},
  },
}

export type ProductConfig = typeof productConfig
`
  fs.writeFileSync(path.join(targetPath, 'src', 'config', 'product.ts'), configContent)

  console.log('✅ Template copied and configured')
}

function generateEnvFile(options: CreateProductOptions): void {
  const targetPath = path.join(process.cwd(), 'apps', options.name)
  const envExamplePath = path.join(targetPath, '.env.example')

  const envContent = `# ${options.displayName} Environment Variables
# Copy this file to .env.local and fill in the values

# See /infra/env-templates/.env.template for full documentation

# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk (Required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# Stripe (Required)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
`

  fs.writeFileSync(envExamplePath, envContent)
  console.log('✅ Environment example file created')
}

function updateTurboJson(options: CreateProductOptions): void {
  // turbo.json is already set up to work with all apps/* folders
  // No modification needed
  console.log('✅ Turborepo configuration ready')
}

function printNextSteps(options: CreateProductOptions): void {
  console.log('\n' + '='.repeat(60))
  console.log(`🎉 Product "${options.displayName}" created successfully!`)
  console.log('='.repeat(60))
  console.log('\nNext steps:')
  console.log('')
  console.log('1. Set up environment variables:')
  console.log(`   cd apps/${options.name}`)
  console.log('   cp .env.example .env.local')
  console.log('   # Edit .env.local with your credentials')
  console.log('')
  console.log('2. Create Clerk application:')
  console.log('   - Go to https://dashboard.clerk.com')
  console.log(`   - Create app named "${options.name}-development"`)
  console.log('   - Copy publishable key and secret key to .env.local')
  console.log('   - Set up webhooks: POST /api/webhooks/clerk')
  console.log('')
  console.log('3. Create Stripe products:')
  console.log('   - Go to https://dashboard.stripe.com/products')
  console.log(`   - Create product "${options.displayName}"`)
  console.log('   - Create pricing plans')
  console.log('   - Set up webhooks: POST /api/webhooks/stripe')
  console.log('')
  console.log('4. Run database migrations:')
  console.log('   pnpm --filter @startkit/database db:push')
  console.log('')
  console.log('5. Start development:')
  console.log(`   pnpm --filter ${options.name} dev`)
  console.log('')
  console.log('='.repeat(60))
}

async function main() {
  console.log('🚀 StartKit Product Creator\n')

  const options = parseArgs()
  validateName(options.name)
  copyTemplate(options)
  generateEnvFile(options)
  updateTurboJson(options)
  printNextSteps(options)
}

main().catch(console.error)
