#!/usr/bin/env tsx
/**
 * Zenthea Stripe Setup Script
 *
 * Provisions Zenthea-specific products and prices in Stripe:
 * - Free: $0/mo (5 seats, 500 patients)
 * - Pro with AI: $350/user/mo
 * - Enterprise: Custom
 */

import type Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';

// Manual .env loader
function loadEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  content.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

// Load env from apps/zenthea/.env.local
const envPath = path.resolve(process.cwd(), 'apps/zenthea/.env.local');
loadEnv(envPath);

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ Error: STRIPE_SECRET_KEY not found in apps/zenthea/.env.local');
  process.exit(1);
}

const ZENTHEA_PLANS = {
  free: {
    name: 'Zenthea Free',
    description: 'Basic clinic management for small practices (up to 5 providers)',
    amount: 0,
    interval: 'month',
    usage_type: 'licensed', 
    metadata: {
      tier: 'free',
      seats: '5',
      patients: '500',
    },
  },
  pro: {
    name: 'Zenthea Pro with AI',
    description: 'Advanced clinic operations with AI Documentation Scribe',
    amount: 35000, // $350.00
    interval: 'month',
    usage_type: 'licensed',
    metadata: {
      tier: 'pro',
      ai_enabled: 'true',
    },
  },
  enterprise: {
    name: 'Zenthea Enterprise',
    description: 'Custom solutions for large healthcare organizations',
    amount: 0, // Placeholder
    interval: 'month',
    usage_type: 'licensed',
    metadata: {
      tier: 'enterprise',
    },
  },
};

async function findExistingProduct(stripe: any, name: string) {
  const products = await stripe.products.list({ limit: 100 });
  return products.data.find((p: any) => p.name === name);
}

async function ensureProduct(stripe: any, key: string, config: any) {
  let product = await findExistingProduct(stripe, config.name);
  if (product) {
    console.log(`  ✓ Product "${config.name}" already exists (${product.id})`);
    return product;
  }

  product = await stripe.products.create({
    name: config.name,
    description: config.description,
    metadata: config.metadata,
  });
  console.log(`  ✓ Created product "${config.name}" (${product.id})`);
  return product;
}

async function ensurePrice(stripe: any, product: any, config: any) {
  const prices = await stripe.prices.list({ product: product.id, active: true });
  const existing = prices.data.find(
    (p: any) => p.unit_amount === config.amount && p.recurring?.interval === config.interval
  );

  if (existing) {
    console.log(`    ✓ Price exists (${existing.id})`);
    return existing;
  }

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: config.amount,
    currency: 'usd',
    recurring: {
      interval: config.interval,
      usage_type: config.usage_type,
    },
    metadata: config.metadata,
  });
  console.log(`    ✓ Created price: $${(config.amount / 100).toFixed(2)} (${price.id})`);
  return price;
}

async function main() {
  // We use dynamic import for stripe to avoid require issues in ESM-like tsx environment if needed
  const Stripe = require('stripe');
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  console.log('🚀 Provisioning Zenthea Stripe Resources...\n');

  const output: any = {
    prices: {},
    products: {},
  };

  for (const [key, config] of Object.entries(ZENTHEA_PLANS)) {
    console.log(`📦 Setting up ${config.name}...`);
    const product = await ensureProduct(stripe, key, config);
    output.products[key] = product.id;

    if (config.amount >= 0) {
      const price = await ensurePrice(stripe, product, config);
      output.prices[key] = price.id;
    }
    console.log('');
  }

  console.log('✅ Zenthea Stripe Setup Complete!');
  console.log('\n--- PRICE IDs FOR .env.local ---');
  console.log(`STRIPE_PRICE_ID_FREE=${output.prices.free}`);
  console.log(`STRIPE_PRICE_ID_PRO=${output.prices.pro}`);
  console.log(`STRIPE_PRICE_ID_ENTERPRISE=${output.prices.enterprise || 'MANUAL'}`);
  console.log('\n--- PRODUCT IDs ---');
  console.log(`STRIPE_PRODUCT_ID_FREE=${output.products.free}`);
  console.log(`STRIPE_PRODUCT_ID_PRO=${output.products.pro}`);
}

main().catch(console.error);
