import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Must mock modules before importing component
const mockUsePathname = vi.fn();
const mockUseSession = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

vi.mock('@/lib/auth-utils', () => ({
  isClinicUser: vi.fn((user) => {
    if (!user) return false;
    return ['clinic_user', 'admin', 'provider'].includes(user.role);
  }),
}));

vi.mock('@/lib/tenant-routing', () => ({
  isPublicTenantRoute: vi.fn((pathname) => {
    return pathname?.startsWith('/clinic/') ?? false;
  }),
}));

// Mock Next.js Script component
vi.mock('next/script', () => ({
  default: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
    return React.createElement('script', props, children);
  },
}));

// Import after mocks are set up
import { ElevenLabsWidget } from '@/components/ElevenLabsWidget';

describe('ElevenLabsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset customElements mock
    if (typeof window !== 'undefined') {
      // @ts-expect-error - mocking customElements.get
      window.customElements.get = vi.fn(() => undefined);
    }
  });

  describe('Route-based visibility', () => {
    it('should NOT render when on /company/settings/website (builder route)', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'test-user',
            email: 'test@example.com',
            role: 'clinic_user',
            tenantId: 'test-tenant',
          },
        },
        status: 'authenticated',
      });
      mockUsePathname.mockReturnValue('/company/settings/website');

      const { container } = render(<ElevenLabsWidget />);

      // Widget should not render on builder route
      expect(container.innerHTML).toBe('');
    });

    it('should NOT render when on /company/settings/website/builder (legacy route)', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'test-user',
            email: 'test@example.com',
            role: 'clinic_user',
            tenantId: 'test-tenant',
          },
        },
        status: 'authenticated',
      });
      mockUsePathname.mockReturnValue('/company/settings/website/builder');

      const { container } = render(<ElevenLabsWidget />);

      // Widget should not render on legacy builder route
      expect(container.innerHTML).toBe('');
    });

    it('should NOT render when user is not authenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });
      mockUsePathname.mockReturnValue('/company/dashboard');

      const { container } = render(<ElevenLabsWidget />);

      expect(container.innerHTML).toBe('');
    });

    it('should NOT render on public tenant routes', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'test-user',
            email: 'test@example.com',
            role: 'clinic_user',
            tenantId: 'test-tenant',
          },
        },
        status: 'authenticated',
      });
      mockUsePathname.mockReturnValue('/clinic/my-clinic');

      const { container } = render(<ElevenLabsWidget />);

      expect(container.innerHTML).toBe('');
    });

    it('should NOT render when user does not have clinic role', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'test-user',
            email: 'test@example.com',
            role: 'patient', // Not a clinic user role
            tenantId: 'test-tenant',
          },
        },
        status: 'authenticated',
      });
      mockUsePathname.mockReturnValue('/company/dashboard');

      const { container } = render(<ElevenLabsWidget />);

      expect(container.innerHTML).toBe('');
    });
  });
});

