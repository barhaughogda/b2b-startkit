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
    boolean: vi.fn(),
  },
}));

describe('System Settings Convex Functions', () => {
  describe('Function Exports', () => {
    it('should export getSystemSettings query', async () => {
      const importedModule = await import('../../../../convex/admin/systemSettings');
      
      expect(importedModule).toHaveProperty('getSystemSettings');
      expect(typeof importedModule.getSystemSettings).toBe('object');
    });

    it('should export updateSystemSettings mutation', async () => {
      const importedModule = await import('../../../../convex/admin/systemSettings');
      
      expect(importedModule).toHaveProperty('updateSystemSettings');
      expect(typeof importedModule.updateSystemSettings).toBe('object');
    });
  });

  describe('Function Structure', () => {
    it('getSystemSettings should be a query function', async () => {
      const importedModule = await import('../../../../convex/admin/systemSettings');
      
      expect(module.getSystemSettings).toBeDefined();
    });

    it('updateSystemSettings should be a mutation function', async () => {
      const importedModule = await import('../../../../convex/admin/systemSettings');
      
      expect(module.updateSystemSettings).toBeDefined();
    });
  });
});

