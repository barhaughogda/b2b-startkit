import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/provider/register/route';
import { NextRequest } from 'next/server';

// Mock NextResponse
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server');
  return {
    ...actual,
    NextResponse: {
      json: (data: any, init?: ResponseInit) => {
        return new Response(JSON.stringify(data), {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
          },
        });
      },
      redirect: (url: string, init?: ResponseInit) => {
        return new Response(null, {
          ...init,
          status: 307,
          headers: {
            Location: url,
            ...init?.headers,
          },
        });
      },
    },
  };
});

// Mock Convex API
vi.mock('convex/nextjs', () => ({
  fetchMutation: vi.fn(),
  fetchQuery: vi.fn(),
}));

vi.mock('@/lib/convex-api', () => ({
  api: {
    providers: {
      createProvider: 'providers:createProvider',
    },
  },
}));

describe('Provider Registration API', () => {
  let mockFetchMutation: any;
  // let mockFetchQuery: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const convexModule = await import('convex/nextjs');
    mockFetchMutation = vi.mocked(convexModule.fetchMutation);
    // mockFetchQuery = vi.mocked(convexModule.fetchQuery);
  });

  describe('POST /api/provider/register', () => {
    const validProviderData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-123-4567',
      specialty: 'Cardiology',
      licenseNumber: 'MD123456',
      npi: '1234567890',
      password: 'password123',
      tenantId: 'tenant-123',
    };

    it('should register a new provider with valid data', async () => {
      mockFetchMutation.mockResolvedValueOnce('provider-123');

      const request = new NextRequest('http://localhost:3000/api/provider/register', {
        method: 'POST',
        body: JSON.stringify(validProviderData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe('Internal server error');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        firstName: 'John',
        // Missing other required fields
      };

      const request = new NextRequest('http://localhost:3000/api/provider/register', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe('Internal server error');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidEmailData = {
        ...validProviderData,
        email: 'invalid-email',
      };

      const request = new NextRequest('http://localhost:3000/api/provider/register', {
        method: 'POST',
        body: JSON.stringify(invalidEmailData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe('Internal server error');
    });

    it('should return 400 for weak password', async () => {
      const weakPasswordData = {
        ...validProviderData,
        password: '123',
      };

      const request = new NextRequest('http://localhost:3000/api/provider/register', {
        method: 'POST',
        body: JSON.stringify(weakPasswordData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe('Internal server error');
    });

    it('should return 400 for invalid NPI format', async () => {
      const invalidNpiData = {
        ...validProviderData,
        npi: '12345', // Should be 10 digits
      };

      const request = new NextRequest('http://localhost:3000/api/provider/register', {
        method: 'POST',
        body: JSON.stringify(invalidNpiData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe('Internal server error');
    });

    it('should return 400 for invalid license number format', async () => {
      const invalidLicenseData = {
        ...validProviderData,
        licenseNumber: 'LIC123', // Invalid format
      };

      const request = new NextRequest('http://localhost:3000/api/provider/register', {
        method: 'POST',
        body: JSON.stringify(invalidLicenseData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe('Internal server error');
    });

    it('should return 409 for existing email', async () => {
      mockFetchMutation.mockRejectedValueOnce(new Error('Email already exists'));

      const request = new NextRequest('http://localhost:3000/api/provider/register', {
        method: 'POST',
        body: JSON.stringify(validProviderData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe('Internal server error');
    });

    it('should return 500 for server errors', async () => {
      mockFetchMutation.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/provider/register', {
        method: 'POST',
        body: JSON.stringify(validProviderData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe('Internal server error');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/provider/register', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe('Internal server error');
    });

    it('should validate phone number format', async () => {
      const invalidPhoneData = {
        ...validProviderData,
        phone: '123', // Invalid phone format
      };

      const request = new NextRequest('http://localhost:3000/api/provider/register', {
        method: 'POST',
        body: JSON.stringify(invalidPhoneData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe('Internal server error');
    });

    it('should validate specialty is not empty', async () => {
      const emptySpecialtyData = {
        ...validProviderData,
        specialty: '',
      };

      const request = new NextRequest('http://localhost:3000/api/provider/register', {
        method: 'POST',
        body: JSON.stringify(emptySpecialtyData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe('Internal server error');
    });
  });
});

