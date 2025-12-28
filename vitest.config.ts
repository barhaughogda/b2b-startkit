import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next', '.turbo', '**/e2e/**'],
    setupFiles: ['./test-utils/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        '**/*.config.*',
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/*.d.ts',
        'test-utils/',
        'e2e/',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@startkit/config': path.resolve(__dirname, './packages/config/src'),
      '@startkit/database': path.resolve(__dirname, './packages/database/src'),
      '@startkit/auth': path.resolve(__dirname, './packages/auth/src'),
      '@startkit/rbac': path.resolve(__dirname, './packages/rbac/src'),
      '@startkit/billing': path.resolve(__dirname, './packages/billing/src'),
      '@startkit/ui': path.resolve(__dirname, './packages/ui/src'),
      '@startkit/analytics': path.resolve(__dirname, './packages/analytics/src'),
    },
  },
})
