import { vi } from 'vitest';

/**
 * Creates a mock Convex mutation function with proper reset behavior.
 * 
 * This utility ensures consistent mock reset behavior across all form tests,
 * preventing test interference when using mockResolvedValueOnce or mockRejectedValueOnce.
 * 
 * @param defaultReturnValue - The default resolved value for the mutation (default: undefined)
 * @returns An object containing the mock function and a reset helper
 * 
 * @example
 * ```typescript
 * const { mockFn, reset } = createMockConvexMutation();
 * 
 * vi.mock('convex/react', () => ({
 *   useMutation: () => mockFn,
 * }));
 * 
 * beforeEach(() => {
 *   reset(); // Resets mock and restores default behavior
 * });
 * ```
 */
export function createMockConvexMutation<T = unknown>(defaultReturnValue: T | undefined = undefined) {
  const mockFn = vi.fn().mockResolvedValue(defaultReturnValue);

  return {
    mockFn,
    reset: () => {
      vi.clearAllMocks();
      mockFn.mockReset();
      mockFn.mockResolvedValue(defaultReturnValue);
    },
  };
}

/**
 * Creates multiple mock Convex mutation functions for forms that use multiple mutations.
 * 
 * @param mutations - Object mapping mutation names to their default return values
 * @returns An object containing mock functions and a reset helper
 * 
 * @example
 * ```typescript
 * const { mocks, reset } = createMockConvexMutations({
 *   addAllergy: undefined,
 *   removeAllergy: undefined,
 * });
 * 
 * vi.mock('convex/react', () => ({
 *   useMutation: vi.fn((mutationFn) => {
 *     if (mutationFn?.toString().includes('addAllergy')) {
 *       return mocks.addAllergy;
 *     }
 *     if (mutationFn?.toString().includes('removeAllergy')) {
 *       return mocks.removeAllergy;
 *     }
 *     return vi.fn().mockResolvedValue(undefined);
 *   }),
 * }));
 * 
 * beforeEach(() => {
 *   reset(); // Resets all mocks
 * });
 * ```
 */
export function createMockConvexMutations<T extends Record<string, unknown>>(
  mutations: T
) {
  const mocks = Object.entries(mutations).reduce(
    (acc, [key, defaultValue]) => {
      acc[key] = vi.fn().mockResolvedValue(defaultValue);
      return acc;
    },
    {} as Record<keyof T, ReturnType<typeof vi.fn>>
  );

  return {
    mocks,
    reset: () => {
      vi.clearAllMocks();
      Object.values(mocks).forEach((mock) => {
        mock.mockReset();
      });
      Object.entries(mutations).forEach(([key, defaultValue]) => {
        mocks[key as keyof T].mockResolvedValue(defaultValue);
      });
    },
  };
}

