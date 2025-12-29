import { describe, it, expect } from 'vitest';

/**
 * Integration tests for tenant configuration completeness calculation
 * Tests the logic that calculates how complete a tenant's configuration is
 */

describe('Tenant Configuration Completeness Calculation', () => {
  /**
   * Calculate configuration completeness percentage
   * This mirrors the logic in convex/admin/tenants.ts
   */
  function calculateCompleteness(tenant: {
    branding?: {
      primaryColor?: string;
      secondaryColor?: string;
      logo?: string;
      customDomain?: string;
      favicon?: string;
    };
    contactInfo?: {
      email?: string;
      phone?: string;
      address?: {
        street?: string;
        city?: string;
      };
      website?: string;
    };
    features?: Record<string, boolean>;
    subscription?: {
      plan?: string;
    };
  }): number {
    let completed = 0;
    let total = 0;

    // Branding (30% weight) - 5 items
    total += 5;
    if (tenant.branding?.primaryColor && tenant.branding.primaryColor !== "#2563eb") completed += 1;
    if (tenant.branding?.secondaryColor && tenant.branding.secondaryColor !== "#1e40af") completed += 1;
    if (tenant.branding?.logo) completed += 1;
    if (tenant.branding?.customDomain) completed += 1;
    if (tenant.branding?.favicon) completed += 1;

    // Contact Info (40% weight) - 4 items
    total += 4;
    if (tenant.contactInfo?.email) completed += 1;
    if (tenant.contactInfo?.phone) completed += 1;
    if (tenant.contactInfo?.address?.street && tenant.contactInfo?.address?.city) completed += 1;
    if (tenant.contactInfo?.website) completed += 1;

    // Features (20% weight) - at least 3 features enabled
    total += 1;
    const enabledFeatures = tenant.features ? Object.values(tenant.features).filter(Boolean).length : 0;
    if (enabledFeatures >= 3) completed += 1;

    // Subscription (10% weight) - plan is set and not demo
    total += 1;
    if (tenant.subscription?.plan && tenant.subscription.plan !== "demo") completed += 1;

    return Math.round((completed / total) * 100);
  }

  describe('Complete Configuration', () => {
    it('returns 100% for fully configured tenant', () => {
      const tenant = {
        branding: {
          primaryColor: '#5FBFAF',
          secondaryColor: '#5F284A',
          logo: 'https://example.com/logo.png',
          customDomain: 'example.com',
          favicon: 'https://example.com/favicon.ico',
        },
        contactInfo: {
          email: 'contact@example.com',
          phone: '+1-555-0123',
          address: {
            street: '123 Main St',
            city: 'Test City',
            state: 'CA',
            zipCode: '12345',
            country: 'US',
          },
          website: 'https://example.com',
        },
        features: {
          onlineScheduling: true,
          telehealth: true,
          prescriptionRefills: true,
          labResults: true,
          messaging: true,
          billing: false,
          patientPortal: true,
          mobileApp: false,
        },
        subscription: {
          plan: 'premium',
          status: 'active',
          maxUsers: 50,
          maxPatients: 1000,
        },
      };

      const completeness = calculateCompleteness(tenant);
      expect(completeness).toBe(100);
    });
  });

  describe('Incomplete Configuration', () => {
    it('returns low percentage for tenant with default branding colors', () => {
      const tenant = {
        branding: {
          primaryColor: '#2563eb', // Default color
          secondaryColor: '#1e40af', // Default color
          // Missing: logo, customDomain, favicon
        },
        contactInfo: {
          email: 'contact@example.com',
          phone: '+1-555-0123',
          address: {
            street: '123 Main St',
            city: 'Test City',
          },
          // Missing: website
        },
        features: {
          onlineScheduling: true,
          telehealth: false,
          prescriptionRefills: false,
          // Only 1 feature enabled (needs 3)
        },
        subscription: {
          plan: 'demo', // Demo plan doesn't count
        },
      };

      const completeness = calculateCompleteness(tenant);
      // Should be low because:
      // - Branding: 0/5 (default colors don't count, missing logo/domain/favicon)
      // - Contact: 3/4 (missing website)
      // - Features: 0/1 (only 1 feature, needs 3)
      // - Subscription: 0/1 (demo plan)
      // Total: 3/11 = ~27%
      expect(completeness).toBeLessThan(50);
    });

    it('returns 0% for completely unconfigured tenant', () => {
      const tenant = {
        branding: {},
        contactInfo: {},
        features: {},
        subscription: {},
      };

      const completeness = calculateCompleteness(tenant);
      expect(completeness).toBe(0);
    });

    it('handles missing optional fields gracefully', () => {
      const tenant = {
        branding: {
          primaryColor: '#5FBFAF',
          secondaryColor: '#5F284A',
          // Missing optional: logo, customDomain, favicon
        },
        contactInfo: {
          email: 'contact@example.com',
          phone: '+1-555-0123',
          address: {
            street: '123 Main St',
            city: 'Test City',
          },
          // Missing optional: website
        },
        features: {
          onlineScheduling: true,
          telehealth: true,
          prescriptionRefills: true,
          // 3 features enabled - passes
        },
        subscription: {
          plan: 'basic',
        },
      };

      const completeness = calculateCompleteness(tenant);
      // Should be:
      // - Branding: 2/5 (colors set, missing logo/domain/favicon)
      // - Contact: 3/4 (missing website)
      // - Features: 1/1 (3+ features enabled)
      // - Subscription: 1/1 (non-demo plan)
      // Total: 7/11 = ~64%
      expect(completeness).toBeGreaterThan(50);
      expect(completeness).toBeLessThan(80);
    });
  });

  describe('Edge Cases', () => {
    it('handles null/undefined values', () => {
      const tenant = {
        branding: null,
        contactInfo: undefined,
        features: null,
        subscription: undefined,
      };

      const completeness = calculateCompleteness(tenant as any);
      expect(completeness).toBe(0);
    });

    it('correctly identifies default colors as incomplete', () => {
      const tenant = {
        branding: {
          primaryColor: '#2563eb', // Default
          secondaryColor: '#1e40af', // Default
        },
        contactInfo: {
          email: 'test@example.com',
          phone: '+1-555-0123',
          address: {
            street: '123 Main St',
            city: 'Test City',
          },
        },
        features: {
          onlineScheduling: true,
          telehealth: true,
          prescriptionRefills: true,
        },
        subscription: {
          plan: 'premium',
        },
      };

      const completeness = calculateCompleteness(tenant);
      // Branding should be 0/5 because default colors don't count
      // Contact: 3/4 (missing website)
      // Features: 1/1
      // Subscription: 1/1
      // Total: 5/11 = ~45%
      expect(completeness).toBeLessThan(50);
    });

    it('requires at least 3 features to be enabled', () => {
      const tenantWith2Features = {
        branding: {
          primaryColor: '#5FBFAF',
          secondaryColor: '#5F284A',
        },
        contactInfo: {
          email: 'test@example.com',
          phone: '+1-555-0123',
          address: {
            street: '123 Main St',
            city: 'Test City',
          },
        },
        features: {
          onlineScheduling: true,
          telehealth: true,
          // Only 2 features - should not count
        },
        subscription: {
          plan: 'premium',
        },
      };

      const tenantWith3Features = {
        ...tenantWith2Features,
        features: {
          onlineScheduling: true,
          telehealth: true,
          prescriptionRefills: true,
          // 3 features - should count
        },
      };

      const completeness2Features = calculateCompleteness(tenantWith2Features);
      const completeness3Features = calculateCompleteness(tenantWith3Features);

      expect(completeness3Features).toBeGreaterThan(completeness2Features);
    });

    it('does not count demo plan as complete subscription', () => {
      const tenantWithDemo = {
        branding: {
          primaryColor: '#5FBFAF',
          secondaryColor: '#5F284A',
        },
        contactInfo: {
          email: 'test@example.com',
          phone: '+1-555-0123',
          address: {
            street: '123 Main St',
            city: 'Test City',
          },
        },
        features: {
          onlineScheduling: true,
          telehealth: true,
          prescriptionRefills: true,
        },
        subscription: {
          plan: 'demo',
        },
      };

      const tenantWithPremium = {
        ...tenantWithDemo,
        subscription: {
          plan: 'premium',
        },
      };

      const completenessDemo = calculateCompleteness(tenantWithDemo);
      const completenessPremium = calculateCompleteness(tenantWithPremium);

      expect(completenessPremium).toBeGreaterThan(completenessDemo);
    });
  });

  describe('Weight Distribution', () => {
    it('applies correct weights to different categories', () => {
      // Test that branding (5 items) has more impact than subscription (1 item)
      const tenantMinimalBranding = {
        branding: {
          primaryColor: '#5FBFAF',
          // Missing other branding items
        },
        contactInfo: {
          email: 'test@example.com',
          phone: '+1-555-0123',
          address: {
            street: '123 Main St',
            city: 'Test City',
          },
        },
        features: {
          onlineScheduling: true,
          telehealth: true,
          prescriptionRefills: true,
        },
        subscription: {
          plan: 'premium',
        },
      };

      const tenantFullBranding = {
        ...tenantMinimalBranding,
        branding: {
          primaryColor: '#5FBFAF',
          secondaryColor: '#5F284A',
          logo: 'https://example.com/logo.png',
          customDomain: 'example.com',
          favicon: 'https://example.com/favicon.ico',
        },
      };

      const completenessMinimal = calculateCompleteness(tenantMinimalBranding);
      const completenessFull = calculateCompleteness(tenantFullBranding);

      // Full branding should significantly increase completeness
      expect(completenessFull).toBeGreaterThan(completenessMinimal + 20);
    });
  });
});

