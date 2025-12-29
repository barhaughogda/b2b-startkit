import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock global fetch
global.fetch = vi.fn();

// Mock theme context
vi.mock('@/lib/theme-context', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    isDark: false,
    isHighContrast: false,
    toggleTheme: vi.fn(),
  }),
  ZentheaThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Convex
vi.mock('convex/nextjs', () => ({
  fetchQuery: vi.fn(),
  fetchMutation: vi.fn(),
}));

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn(() => ({
    action: vi.fn(),
    query: vi.fn(),
  })),
}));

// Mock JWT validation for tests
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token: string) => {
      if (token === 'valid-token') {
        return { sub: 'provider-123', exp: Date.now() / 1000 + 3600 };
      }
      if (token === 'expired-token') {
        return { sub: 'provider-123', exp: Date.now() / 1000 - 3600 };
      }
      if (token === 'invalid-token') {
        throw new Error('jwt malformed');
      }
      throw new Error('invalid token');
    }),
  },
}));

// Mock environment variables for integration tests
(process.env as any).NODE_ENV = 'test';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-jwt-secret';