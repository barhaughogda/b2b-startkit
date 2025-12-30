import { vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import './setup/radix-ui-setup';
import './setup/lucide-react-mock';

// Define MockNextResponse class once with all methods
// Note: We don't extend Response to avoid type conflicts with Next.js API
class MockNextResponse {
  static json(data: any, init?: ResponseInit) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  }
  
  static redirect(url: string, init?: ResponseInit) {
    return new Response(null, {
      ...init,
      status: 302,
      headers: {
        Location: url,
        ...init?.headers,
      },
    });
  }
  
  static error(message?: string, status?: number) {
    return new Response(message || 'Internal Server Error', {
      status: status || 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

// Mock next/server before anything imports it
vi.mock('next/server', () => {
  class MockNextRequest extends Request {
    private _body: any;
    
    constructor(input: string | Request, init?: RequestInit) {
      super(input, init);
      // Store body for later access - handle both string and ReadableStream
      this._body = init?.body;
    }
    
    async json() {
      // Access body from the stored _body property
      if (typeof this._body === 'string') {
        return JSON.parse(this._body);
      }
      // If body is already an object (shouldn't happen in tests, but be safe)
      if (this._body && typeof this._body === 'object' && !(this._body instanceof ReadableStream)) {
        return this._body;
      }
      // Handle ReadableStream if needed (for completeness)
      if (this._body instanceof ReadableStream) {
        const reader = this._body.getReader();
        const chunks: Uint8Array[] = [];
        let done = false;
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) chunks.push(value);
        }
        // Combine all chunks into a single Uint8Array
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        const bodyText = new TextDecoder().decode(combined);
        return JSON.parse(bodyText);
      }
      return null;
    }
    
    async text() {
      if (typeof this._body === 'string') {
        return this._body;
      }
      // Handle ReadableStream if needed
      if (this._body instanceof ReadableStream) {
        const reader = this._body.getReader();
        const chunks: Uint8Array[] = [];
        let done = false;
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) chunks.push(value);
        }
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        return new TextDecoder().decode(combined);
      }
      return typeof this._body === 'string' ? this._body : JSON.stringify(this._body || '');
    }
  }
  
  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse, // Use the shared class definition
  };
});

// Assign the same MockNextResponse to global for code that accesses it directly
global.NextResponse = MockNextResponse as any;

// Mock bcryptjs for password hashing in tests (CommonJS compatible)
const mockHash = vi.fn((password: string, rounds: number) => Promise.resolve(`hashed-${password}`));
const mockCompare = vi.fn((password: string, hash: string) => Promise.resolve(hash === `hashed-${password}`));

vi.mock('bcryptjs', () => {
  const bcrypt = {
    hash: mockHash,
    compare: mockCompare,
  };
  // For CommonJS require() compatibility
  (bcrypt as any).default = bcrypt;
  return bcrypt;
});

// Set up test environment variables
(process.env as any).NODE_ENV = 'test';
process.env.NEXTAUTH_SECRET = 'test-secret-key';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test-convex-url';
process.env.CONVEX_DEPLOYMENT = 'test-deployment';
process.env.DEV_AUTH_FALLBACK = 'true';

// Additional environment variables from jest.setup.js
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_S3_BUCKET = 'test-bucket';

// Mock global fetch
global.fetch = vi.fn();

// Polyfill for Request/Response in Node.js environment
global.Request = class Request {
  private _url: string;
  public method: string;
  public headers: Map<string, string>;
  public body: any;
  
  constructor(input: string | Request, init?: RequestInit) {
    this._url = typeof input === 'string' ? input : input.url;
    this.method = init?.method || 'GET';
    this.headers = new Map(Object.entries(init?.headers || {}));
    this.body = init?.body;
  }
  
  get url() {
    return this._url;
  }
  
  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body);
    }
    return this.body ? JSON.parse(this.body) : null;
  }
  
  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body || '');
  }
} as any;

// Note: MockNextResponse is already defined above and assigned to global.NextResponse

global.Response = class Response {
  public body: string | null;
  public status: number;
  public statusText: string;
  public headers: Map<string, string>;
  
  constructor(body: string | null, init?: ResponseInit) {
    this.body = body;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    this.headers = new Map(Object.entries(init?.headers || {}));
  }
  
  async json() {
    if (this.body) {
      return JSON.parse(this.body);
    }
    return null;
  }
  
  async text() {
    return this.body || '';
  }
} as any;

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock Next.js Link component
vi.mock('next/link', () => {
  const MockLink = ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => {
    return React.createElement('a', { href, ...props }, children);
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

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
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock window.alert
global.alert = vi.fn();

// Mock NextAuth
vi.mock('@/hooks/useZentheaSession', () => ({
  useZentheaSession: vi.fn(() => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
    },
    status: 'authenticated',
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  signIn: vi.fn(),
  signOut: vi.fn(),
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
      throw new Error('jwt malformed');
    }),
  },
}));

// Mock Convex generated API - must be before any imports that use it
// Define stable function references directly in the factory
// Using named function expressions ensures stable references for comparison
vi.mock('@/convex/_generated/api', () => {
  // Create stable function references that can be compared in tests
  const getUsers = function getUsers() {};
  const createUserMutation = function createUserMutation() {};
  const updateUserMutation = function updateUserMutation() {};
  const deleteUserMutation = function deleteUserMutation() {};
  const getUserById = function getUserById() {};
  const getUserByEmail = function getUserByEmail() {};
  const getProviderProfileByUserId = function getProviderProfileByUserId() {};
  const getProviderByEmail = function getProviderByEmail() {};
  const getProviderLocations = function getProviderLocations() {};
  const getLocationsByTenant = function getLocationsByTenant() {};
  const createLocation = function createLocation() {};
  const updateLocation = function updateLocation() {};
  const addProviderToLocation = function addProviderToLocation() {};
  const removeProviderFromLocation = function removeProviderFromLocation() {};
  const setDefaultLocation = function setDefaultLocation() {};
  const getProviderAvailability = function getProviderAvailability() {};
  const setRecurringAvailability = function setRecurringAvailability() {};
  const addAvailabilityOverride = function addAvailabilityOverride() {};
  const removeAvailabilityOverride = function removeAvailabilityOverride() {};
  const getAppointmentsByDateRange = function getAppointmentsByDateRange() {};
  const getSyncStatus = function getSyncStatus() {};
  const updateSyncSettings = function updateSyncSettings() {};
  const disconnectCalendar = function disconnectCalendar() {};
  const initGoogleCalendarSync = function initGoogleCalendarSync() {};
  const generateReport = function generateReport() {};

  return {
    api: {
      admin: {
        users: {
          getUsers,
          createUserMutation,
          updateUserMutation,
          deleteUserMutation,
          getUserById,
        },
        reports: {
          generateReport,
        },
      },
      users: {
        getUserByEmail,
      },
      providerProfiles: {
        getProviderProfileByUserId,
      },
      providers: {
        getProviderByEmail,
      },
      locations: {
        getProviderLocations,
        getLocationsByTenant,
        createLocation,
        updateLocation,
        addProviderToLocation,
        removeProviderFromLocation,
        setDefaultLocation,
      },
      providerAvailability: {
        getProviderAvailability,
        setRecurringAvailability,
        addAvailabilityOverride,
        removeAvailabilityOverride,
      },
      availability: {
        getProviderAvailability,
        setRecurringAvailability,
        addAvailabilityOverride,
        removeAvailabilityOverride,
      },
      appointments: {
        getAppointmentsByDateRange,
        getMultiUserAppointments: getAppointmentsByDateRange,
      },
      calendarShares: {
        getSharedCalendars: function getSharedCalendars() {},
        shareCalendar: function shareCalendar() {},
        revokeCalendarShare: function revokeCalendarShare() {},
        getCalendarShares: function getCalendarShares() {},
      },
      calendarSync: {
        getSyncStatus,
        updateSyncSettings,
        disconnectCalendar,
        initGoogleCalendarSync,
      },
    },
  };
});