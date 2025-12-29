import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PatientProfilePage from '@/app/patient/profile/page';

// Mock next-auth/react
const mockUseSession = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock PatientProfileDashboard component
vi.mock('@/components/patient/PatientProfileDashboard', () => ({
  PatientProfileDashboard: () => <div data-testid="patient-profile-dashboard">Patient Profile Dashboard</div>,
}));

// Mock config module
vi.mock('@/lib/config', () => ({
  config: {
    isDemoMode: true, // Default to true for tests that need demo mode
  },
}));

describe('PatientProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state when session is loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    });

    render(<PatientProfilePage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show access denied when no session', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(<PatientProfilePage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/Please sign in to access your patient profile/i)).toBeInTheDocument();
  });

  it('should show access denied when user role is not patient', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          email: 'provider@example.com',
          role: 'provider',
        },
      },
      status: 'authenticated',
    });

    render(<PatientProfilePage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('should render PatientProfileDashboard when authenticated as patient', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'patient-123',
          email: 'patient@example.com',
          role: 'patient',
        },
      },
      status: 'authenticated',
    });

    render(<PatientProfilePage />);
    expect(screen.getByTestId('patient-profile-dashboard')).toBeInTheDocument();
  });

  it('should display sign in link when access denied', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(<PatientProfilePage />);
    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute('href', '/patient/login');
  });

  it('should display demo credentials when demo mode is enabled', () => {
    // Config is mocked at module level with isDemoMode: true
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(<PatientProfilePage />);
    expect(screen.getByText(/Demo Credentials/i)).toBeInTheDocument();
    expect(screen.getByText(/patient@demo.com/i)).toBeInTheDocument();
  });
});

