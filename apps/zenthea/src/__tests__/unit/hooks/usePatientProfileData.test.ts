import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useQuery } from 'convex/react';
import { usePatientProfileData } from '@/hooks/usePatientProfileData';
import { getPatientProfileApi } from '@/lib/convex-api-types';
import { canUseConvexQuery } from '@/lib/convexIdValidation';

// Mock dependencies
vi.mock('@/hooks/useZentheaSession', () => ({
  useZentheaSession: vi.fn(),
}));

vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/lib/convex-api-types', () => ({
  getPatientProfileApi: vi.fn(),
}));

vi.mock('@/lib/convexIdValidation', () => ({
  canUseConvexQuery: vi.fn(),
  isValidConvexIdForTable: vi.fn((id, table) => !!id),
}));

type Id<T extends string> = string & { __tableName: T };

describe('usePatientProfileData', () => {
  const mockPatientId = 'patient-123' as Id<'patients'>;
  const mockEmail = 'patient@example.com';
  const mockTenantId = 'demo-tenant-1';

  const mockSession = {
    user: {
      id: mockPatientId,
      email: mockEmail,
      name: 'John Doe',
      tenantId: mockTenantId,
    },
    expires: '2024-12-31',
  };

  const mockPatientProfile = {
    firstName: 'John',
    lastName: 'Doe',
    email: mockEmail,
    gender: 'male',
    primaryLanguage: 'en',
    dateOfBirth: '1990-01-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useZentheaSession as any).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });

    (canUseConvexQuery as any).mockReturnValue(true);
    
    (getPatientProfileApi as any).mockReturnValue({
      findPatientByEmail: vi.fn(),
      getPatientProfile: vi.fn(),
    });
  });

  describe('Data Fetching', () => {
    it('should fetch patient ID by email', () => {
      (useQuery as any).mockImplementation((queryFn: any, args: any) => {
        if (args && typeof args === 'object' && 'email' in args) {
          return mockPatientId;
        }
        return undefined;
      });

      const { result } = renderHook(() => usePatientProfileData());

      expect(result.current.patientId).toBe(mockPatientId);
      expect(result.current.isLoading).toBe(false);
    });

    it('should fetch patient profile when patient ID is available', () => {
      (useQuery as any).mockImplementation((queryFn: any, args: any) => {
        if (args && typeof args === 'object' && 'email' in args) {
          return mockPatientId;
        }
        if (args && typeof args === 'object' && 'patientId' in args) {
          return mockPatientProfile;
        }
        return undefined;
      });

      const { result } = renderHook(() => usePatientProfileData());

      expect(result.current.patientProfile).toEqual(mockPatientProfile);
      expect(result.current.patientId).toBe(mockPatientId);
    });

    it('should skip queries when email is empty', () => {
      (useZentheaSession as any).mockReturnValue({
        data: { ...mockSession, user: { ...mockSession.user, email: '' } },
        status: 'authenticated',
      });

      (useQuery as any).mockImplementation((queryFn: any, args: any) => {
        if (args === 'skip') {
          return undefined;
        }
        return undefined;
      });

      const { result } = renderHook(() => usePatientProfileData());

      expect(result.current.queriesSkipped).toBe(true);
      expect(result.current.patientId).toBeUndefined();
    });

    it('should skip queries when canUseConvexQuery returns false', () => {
      (canUseConvexQuery as any).mockReturnValue(false);

      (useQuery as any).mockImplementation((queryFn: any, args: any) => {
        if (args === 'skip') {
          return undefined;
        }
        return undefined;
      });

      const { result } = renderHook(() => usePatientProfileData());

      expect(result.current.queriesSkipped).toBe(true);
    });
  });

  describe('Loading States', () => {
    it('should indicate loading when patient ID is undefined', () => {
      (useQuery as any).mockImplementation(() => undefined);

      const { result } = renderHook(() => usePatientProfileData());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.patientId).toBeUndefined();
    });

    it('should indicate loading when patient profile is undefined', () => {
      (useQuery as any).mockImplementation((queryFn: any, args: any) => {
        if (args && typeof args === 'object' && 'email' in args) {
          return mockPatientId;
        }
        return undefined; // Profile still loading
      });

      const { result } = renderHook(() => usePatientProfileData());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.patientProfile).toBeUndefined();
    });

    it('should indicate not loading when both ID and profile are available', () => {
      (useQuery as any).mockImplementation((queryFn: any, args: any) => {
        if (args && typeof args === 'object' && 'email' in args) {
          return mockPatientId;
        }
        if (args && typeof args === 'object' && 'patientId' in args) {
          return mockPatientProfile;
        }
        return undefined;
      });

      const { result } = renderHook(() => usePatientProfileData());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.patientId).toBe(mockPatientId);
      expect(result.current.patientProfile).toEqual(mockPatientProfile);
    });
  });

  describe('Error States', () => {
    it('should handle patient not found', () => {
      (useQuery as any).mockImplementation((queryFn: any, args: any) => {
        if (args && typeof args === 'object' && 'email' in args) {
          return null; // Patient not found
        }
        return null;
      });

      const { result } = renderHook(() => usePatientProfileData());

      expect(result.current.patientId).toBeNull();
      expect(result.current.patientProfile).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle profile not found when patient ID exists', () => {
      (useQuery as any).mockImplementation((queryFn: any, args: any) => {
        if (args && typeof args === 'object' && 'email' in args) {
          return mockPatientId;
        }
        if (args && typeof args === 'object' && 'patientId' in args) {
          return null; // Profile not found
        }
        return null;
      });

      const { result } = renderHook(() => usePatientProfileData());

      expect(result.current.patientId).toBe(mockPatientId);
      expect(result.current.patientProfile).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Session Handling', () => {
    it('should extract email and tenantId from session', () => {
      (useQuery as any).mockImplementation((queryFn: any, args: any) => {
        if (args && typeof args === 'object' && 'email' in args) {
          expect(args.email).toBe(mockEmail);
          expect(args.tenantId).toBe(mockTenantId);
          return mockPatientId;
        }
        return undefined;
      });

      renderHook(() => usePatientProfileData());

      expect(useQuery).toHaveBeenCalled();
    });

    it('should handle missing session gracefully', () => {
      (useZentheaSession as any).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      (useQuery as any).mockImplementation((queryFn: any, args: any) => {
        if (args === 'skip') {
          return undefined;
        }
        return undefined;
      });

      const { result } = renderHook(() => usePatientProfileData());

      expect(result.current.queriesSkipped).toBe(true);
    });
  });
});

