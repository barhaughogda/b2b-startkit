/**
 * Zenthea Product Configuration
 *
 * This is the canonical source of truth for Zenthea product capabilities,
 * plans, and limits.
 */

import { defineProductConfig } from '@startkit/config';

export const productConfig = defineProductConfig({
  id: 'zenthea',
  name: 'Zenthea',
  version: '1.0.0',
  description: 'HIPAA-compliant healthcare platform with AI-powered documentation',

  // ============================================
  // Feature Definitions
  // ============================================
  features: {
    dashboard: {
      key: 'dashboard',
      name: 'Clinic Dashboard',
      category: 'core',
    },
    patient_management: {
      key: 'patient_management',
      name: 'Patient Management',
      category: 'core',
    },
    appointments: {
      key: 'appointments',
      name: 'Appointment Scheduling',
      category: 'core',
    },
    ai_scribe: {
      key: 'ai_scribe',
      name: 'AI Documentation Scribe',
      description: 'AI-generated medical notes and summaries',
      category: 'premium',
    },
    advanced_rcm: {
      key: 'advanced_rcm',
      name: 'Advanced Revenue Cycle Management',
      category: 'premium',
    },
    custom_branding: {
      key: 'custom_branding',
      name: 'Custom Clinic Branding',
      category: 'enterprise',
    },
    audit_logs: {
      key: 'audit_logs',
      name: 'Enhanced Audit Trail',
      category: 'enterprise',
    },
    sso: {
      key: 'sso',
      name: 'SSO/SAML Authentication',
      category: 'enterprise',
    },
  },

  // ============================================
  // Plan Configuration
  // ============================================
  plans: {
    free: {
      features: ['dashboard', 'patient_management', 'appointments'],
      limits: {
        seats: 5,
        patients: 500,
      },
    },
    pro: {
      features: [
        'dashboard',
        'patient_management',
        'appointments',
        'ai_scribe',
        'advanced_rcm',
      ],
      limits: {
        seats: 100, // Scalable per-seat
        patients: 10000,
      },
    },
    enterprise: {
      features: [
        'dashboard',
        'patient_management',
        'appointments',
        'ai_scribe',
        'advanced_rcm',
        'custom_branding',
        'audit_logs',
        'sso',
      ],
      limits: {
        seats: undefined, // Unlimited
        patients: undefined, // Unlimited
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
    primaryColor: '#5FBFAF', // Zenthea Teal
    logo: '/images/zenthea-logo.svg',
    favicon: '/favicon.ico',
  },
});

export type ProductConfig = typeof productConfig;
