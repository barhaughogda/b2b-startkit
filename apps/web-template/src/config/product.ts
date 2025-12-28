/**
 * Product configuration
 *
 * @ai-context This file contains product-specific settings.
 * Modify these values to customize your product.
 */

export const productConfig = {
  name: 'web-template',
  displayName: 'StartKit Template',
  description: 'A StartKit-powered B2B SaaS product template',

  // Branding
  branding: {
    primaryColor: '#0070f3',
    logo: '/logo.svg',
    favicon: '/favicon.ico',
  },

  // Pricing model
  pricing: {
    model: 'per_seat' as const,
    trialDays: 14,
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        features: ['Up to 5 team members', 'Basic features', 'Community support'],
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 29,
        features: ['Unlimited team members', 'All features', 'Priority support', 'API access'],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: null, // Contact for pricing
        features: ['Custom contracts', 'SLA', 'Dedicated support', 'SSO/SAML'],
      },
    ],
  },

  // Feature flags
  features: {
    aiFeatures: false,
  },

  // Navigation items
  navigation: {
    main: [
      { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
      { label: 'Team', href: '/team', icon: 'Users' },
      { label: 'Billing', href: '/billing', icon: 'CreditCard' },
      { label: 'Settings', href: '/settings', icon: 'Settings' },
    ],
  },
}

export type ProductConfig = typeof productConfig
