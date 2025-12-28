/**
 * Product Configuration Contract
 *
 * This is the canonical source of truth for web-template product capabilities.
 * All feature, plan, and limit logic should derive from this file.
 *
 * @ai-context This file defines:
 * - What features exist in this product
 * - What plans unlock what features
 * - What limits apply per plan
 * - Kill switch defaults
 */

import { defineProductConfig } from '@startkit/config'

export const productConfig = defineProductConfig({
  id: 'web-template',
  name: 'StartKit Template',
  version: '1.0.0',
  description: 'A StartKit-powered B2B SaaS product template',

  // ============================================
  // Feature Definitions
  // ============================================
  features: {
    // Core features - available on all plans
    dashboard: {
      key: 'dashboard',
      name: 'Dashboard',
      description: 'Main dashboard with analytics and overview',
      category: 'core',
    },
    team_management: {
      key: 'team_management',
      name: 'Team Management',
      description: 'Invite and manage team members',
      category: 'core',
    },
    settings: {
      key: 'settings',
      name: 'Settings',
      description: 'Organization and user settings',
      category: 'core',
    },

    // Premium features - Pro and above
    api_access: {
      key: 'api_access',
      name: 'API Access',
      description: 'Programmatic access via REST API',
      category: 'premium',
    },
    advanced_analytics: {
      key: 'advanced_analytics',
      name: 'Advanced Analytics',
      description: 'Detailed reports and custom dashboards',
      category: 'premium',
    },
    priority_support: {
      key: 'priority_support',
      name: 'Priority Support',
      description: 'Faster response times and dedicated support',
      category: 'premium',
    },

    // Enterprise features
    sso: {
      key: 'sso',
      name: 'SSO/SAML',
      description: 'Single sign-on with your identity provider',
      category: 'enterprise',
    },
    audit_logs: {
      key: 'audit_logs',
      name: 'Audit Logs',
      description: 'Detailed audit trail of all actions',
      category: 'enterprise',
    },
    custom_integrations: {
      key: 'custom_integrations',
      name: 'Custom Integrations',
      description: 'Build custom integrations with webhooks',
      category: 'enterprise',
    },
    dedicated_support: {
      key: 'dedicated_support',
      name: 'Dedicated Support',
      description: 'Named account manager and SLA',
      category: 'enterprise',
    },

    // Beta features
    ai_assistant: {
      key: 'ai_assistant',
      name: 'AI Assistant',
      description: 'AI-powered features (beta)',
      category: 'beta',
    },
  },

  // ============================================
  // Plan Configuration
  // ============================================
  plans: {
    free: {
      features: [
        'dashboard',
        'team_management',
        'settings',
      ],
      limits: {
        seats: 3,
        apiCallsPerMonth: 1000,
        storageGb: 1,
      },
    },

    starter: {
      features: [
        'dashboard',
        'team_management',
        'settings',
      ],
      limits: {
        seats: 10,
        apiCallsPerMonth: 10000,
        storageGb: 10,
      },
      customFlags: ['email_support'],
    },

    pro: {
      features: [
        'dashboard',
        'team_management',
        'settings',
        'api_access',
        'advanced_analytics',
        'priority_support',
      ],
      limits: {
        seats: 50,
        apiCallsPerMonth: 100000,
        storageGb: 100,
      },
    },

    enterprise: {
      features: [
        'dashboard',
        'team_management',
        'settings',
        'api_access',
        'advanced_analytics',
        'priority_support',
        'sso',
        'audit_logs',
        'custom_integrations',
        'dedicated_support',
      ],
      limits: {
        // undefined = unlimited
        seats: undefined,
        apiCallsPerMonth: undefined,
        storageGb: undefined,
      },
    },
  },

  // ============================================
  // Kill Switch Defaults
  // ============================================
  killSwitches: {
    productEnabled: true,
    maintenanceMode: false,
  },

  // ============================================
  // Branding
  // ============================================
  branding: {
    primaryColor: '#0070f3',
    logo: '/logo.svg',
    favicon: '/favicon.ico',
  },

  // ============================================
  // Navigation
  // ============================================
  navigation: {
    main: [
      { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', requiredFeature: 'dashboard' },
      { label: 'Team', href: '/team', icon: 'Users', requiredFeature: 'team_management' },
      { label: 'Billing', href: '/billing', icon: 'CreditCard' },
      { label: 'Settings', href: '/settings', icon: 'Settings', requiredFeature: 'settings' },
    ],
  },
})

export type ProductConfig = typeof productConfig
