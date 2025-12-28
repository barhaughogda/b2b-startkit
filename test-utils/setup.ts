/**
 * Global Test Setup
 * 
 * This file runs before all tests. Use it to:
 * - Set up global mocks
 * - Configure test environment
 * - Initialize test databases
 */

import { beforeAll, afterAll } from 'vitest'

// Set test environment variables
process.env.NODE_ENV = 'test'

// Global test setup
beforeAll(async () => {
  // Add any global setup here
  // e.g., initialize test database, seed data, etc.
})

// Global test teardown
afterAll(async () => {
  // Add any global cleanup here
  // e.g., close database connections, clean up test data, etc.
})
