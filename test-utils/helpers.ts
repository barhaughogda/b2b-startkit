/**
 * Test Helper Functions
 * 
 * Utility functions for common test operations like setup, teardown,
 * and assertions.
 */


/**
 * Wait for a specified number of milliseconds
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return
    }
    await wait(interval)
  }
  throw new Error(`Condition not met within ${timeout}ms`)
}

/**
 * Create a test database transaction wrapper
 * Use this to isolate tests that modify the database
 */
export function createTestTransaction() {
  // This would be implemented based on your database setup
  // For now, it's a placeholder for the pattern
  return {
    async begin() {
      // Start transaction
    },
    async commit() {
      // Commit transaction
    },
    async rollback() {
      // Rollback transaction
    },
  }
}

/**
 * Clean up test data after each test
 */
export function setupTestCleanup(cleanupFn: () => Promise<void> | void) {
  afterEach(async () => {
    await cleanupFn()
  })
}

/**
 * Setup test environment before each test
 */
export function setupTestEnvironment(setupFn: () => Promise<void> | void) {
  beforeEach(async () => {
    await setupFn()
  })
}

/**
 * Generate a random string for test IDs
 */
export function randomId(prefix = 'test'): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a random email for testing
 */
export function randomEmail(domain = 'example.com'): string {
  return `test_${Math.random().toString(36).substr(2, 9)}@${domain}`
}

/**
 * Assert that a value is a valid UUID
 */
export function assertIsUUID(value: string): void {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(value)) {
    throw new Error(`Expected UUID, got: ${value}`)
  }
}

/**
 * Assert that a date is within a reasonable range
 */
export function assertIsRecentDate(date: Date, maxAgeMs = 60000): void {
  const now = Date.now()
  const dateMs = date.getTime()
  const age = now - dateMs

  if (age < 0 || age > maxAgeMs) {
    throw new Error(`Expected recent date (within ${maxAgeMs}ms), got age: ${age}ms`)
  }
}

// Import vi from vitest for the mockConsole function
import { vi, beforeEach, afterEach } from 'vitest'

/**
 * Mock console methods and restore after test
 */
export function mockConsole() {
  const originalError = console.error
  const originalWarn = console.warn
  const originalLog = console.log

  const mocks = {
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  }

  beforeEach(() => {
    console.error = mocks.error
    console.warn = mocks.warn
    console.log = mocks.log
  })

  afterEach(() => {
    console.error = originalError
    console.warn = originalWarn
    console.log = originalLog
    mocks.error.mockClear()
    mocks.warn.mockClear()
    mocks.log.mockClear()
  })

  return mocks
}
