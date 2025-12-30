import { renderHook } from '@testing-library/react';
import { usePatients } from '@/hooks/usePatients';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { vi } from 'vitest';

// Mock @/lib/auth
vi.mock('@/hooks/useZentheaSession', () => ({
  useZentheaSession: vi.fn(),
}));

// Mock Convex
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
}));

describe('usePatients', () => {
  const mockUseSession = useZentheaSession as ReturnType<typeof vi.fn>;
  const mockUseQuery = require('convex/react').useQuery as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use demo-tenant-1 when no session tenantId', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });

    mockUseQuery.mockReturnValue({
      page: [],
    });

    const { result } = renderHook(() => usePatients());

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.any(Object),
      { tenantId: 'demo-tenant-1' }
    );
  });

  it('should use session tenantId when available', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'provider',
          tenantId: 'custom-tenant',
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      status: 'authenticated',
      update: vi.fn(),
    });

    mockUseQuery.mockReturnValue({
      page: [],
    });

    const { result } = renderHook(() => usePatients());

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.any(Object),
      { tenantId: 'custom-tenant' }
    );
  });

  it('should transform patient data correctly', () => {
    const mockPatientData = {
      page: [
        {
          _id: 'patient-1',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: new Date('1990-01-01').getTime(),
          email: 'john@example.com',
          phone: '+1234567890',
          tenantId: 'demo-tenant-1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    };

    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });

    mockUseQuery.mockReturnValue(mockPatientData);

    const { result } = renderHook(() => usePatients());

    expect(result.current.patients).toHaveLength(1);
    expect(result.current.patients[0]).toMatchObject({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      gender: expect.any(String),
      status: expect.any(String),
    });
  });

  it('should handle loading state correctly', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });

    mockUseQuery.mockReturnValue(undefined); // Simulate loading

    const { result } = renderHook(() => usePatients());

    expect(result.current.isLoading).toBe(true);
    expect(Array.isArray(result.current.patients)).toBe(true);
    expect(result.current.patients.length).toBeGreaterThan(0);
  });
});
