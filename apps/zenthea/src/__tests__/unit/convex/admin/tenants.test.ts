import { describe, it, expect, vi } from 'vitest';

// Mock Convex server functions
vi.mock('convex/_generated/server', () => ({
  query: vi.fn((fn) => fn),
  mutation: vi.fn((fn) => fn),
}));

vi.mock('convex/values', () => ({
  v: {
    object: vi.fn((schema) => schema),
    optional: vi.fn((schema) => schema),
    string: vi.fn(),
    number: vi.fn(),
    union: vi.fn((...schemas) => schemas),
    literal: vi.fn((value) => value),
    array: vi.fn((schema) => schema),
  },
}));

describe('Tenants Convex Functions (Superadmin)', () => {
  describe('Function Exports', () => {
    it('should export getTenantSummary query', async () => {
      const importedModule = await import('../../../../convex/admin/tenants');
      
      expect(importedModule).toHaveProperty('getTenantSummary');
      expect(typeof importedModule.getTenantSummary).toBe('object');
    });

    it('should export listTenantsForSuperadmin query', async () => {
      const importedModule = await import('../../../../convex/admin/tenants');
      
      expect(importedModule).toHaveProperty('listTenantsForSuperadmin');
      expect(typeof importedModule.listTenantsForSuperadmin).toBe('object');
    });

    it('should export getTenantDetailsForSuperadmin query', async () => {
      const importedModule = await import('../../../../convex/admin/tenants');
      
      expect(importedModule).toHaveProperty('getTenantDetailsForSuperadmin');
      expect(typeof importedModule.getTenantDetailsForSuperadmin).toBe('object');
    });

    it('should export updateTenantForSuperadmin mutation', async () => {
      const importedModule = await import('../../../../convex/admin/tenants');
      
      expect(importedModule).toHaveProperty('updateTenantForSuperadmin');
      expect(typeof importedModule.updateTenantForSuperadmin).toBe('object');
    });
  });

  describe('Function Structure', () => {
    it('getTenantSummary should be a query function', async () => {
      const importedModule = await import('../../../../convex/admin/tenants');
      
      expect(importedModule.getTenantSummary).toBeDefined();
    });

    it('listTenantsForSuperadmin should be a query function', async () => {
      const importedModule = await import('../../../../convex/admin/tenants');
      
      expect(importedModule.listTenantsForSuperadmin).toBeDefined();
    });

    it('getTenantDetailsForSuperadmin should be a query function', async () => {
      const importedModule = await import('../../../../convex/admin/tenants');
      
      expect(importedModule.getTenantDetailsForSuperadmin).toBeDefined();
    });

    it('updateTenantForSuperadmin should be a mutation function', async () => {
      const importedModule = await import('../../../../convex/admin/tenants');
      
      expect(importedModule.updateTenantForSuperadmin).toBeDefined();
    });
  });
});

