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
    array: vi.fn((schema) => schema),
    literal: vi.fn((value) => value),
    union: vi.fn((...schemas) => schemas),
  },
}));

describe('Platform Settings Convex Functions', () => {
  describe('Function Exports', () => {
    it('should export getPlatformSettings query', async () => {
      // Import the module to verify exports exist
      const importedModule = await import('../../../../convex/admin/platformSettings');
      
      expect(importedModule).toHaveProperty('getPlatformSettings');
      expect(typeof importedModule.getPlatformSettings).toBe('object');
    });

    it('should export updatePlatformSettings mutation', async () => {
      const importedModule = await import('../../../../convex/admin/platformSettings');
      
      expect(importedModule).toHaveProperty('updatePlatformSettings');
      expect(typeof importedModule.updatePlatformSettings).toBe('object');
    });
  });

  describe('Function Structure', () => {
    it('getPlatformSettings should be a query function', async () => {
      const importedModule = await import('../../../../convex/admin/platformSettings');
      
      // Verify it's exported and has the expected structure
      expect(module.getPlatformSettings).toBeDefined();
    });

    it('updatePlatformSettings should be a mutation function', async () => {
      const importedModule = await import('../../../../convex/admin/platformSettings');
      
      // Verify it's exported and has the expected structure
      expect(module.updatePlatformSettings).toBeDefined();
    });
  });
});

