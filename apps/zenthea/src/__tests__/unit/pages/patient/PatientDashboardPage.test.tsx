import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PatientDashboardPage from '@/app/patient/dashboard/page';

// Mock @/lib/auth/react
const mockUseSession = vi.fn();
vi.mock('@/hooks/useZentheaSession', () => ({
  useZentheaSession: () => mockUseSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock HealthRecordsOverview component
vi.mock('@/components/patient/HealthRecordsOverview', () => ({
  HealthRecordsOverview: () => <div data-testid="health-records-overview">Health Records Overview</div>,
}));

describe('PatientDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state when session is loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    });

    render(<PatientDashboardPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show access denied when no session', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(<PatientDashboardPage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/Please sign in to access your patient dashboard/i)).toBeInTheDocument();
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

    render(<PatientDashboardPage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('should render dashboard with session', () => {
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

    render(<PatientDashboardPage />);
    expect(screen.getByTestId('patient-dashboard')).toBeInTheDocument();
  });

  it('should display welcome header', () => {
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

    render(<PatientDashboardPage />);
    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
  });

  it('should display quick stats cards', () => {
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

    render(<PatientDashboardPage />);
    expect(screen.getByText('Next Appointment')).toBeInTheDocument();
    expect(screen.getByText('Unread Messages')).toBeInTheDocument();
    expect(screen.getByText('Pending Tasks')).toBeInTheDocument();
    expect(screen.getByText('Health Score')).toBeInTheDocument();
  });

  it('should display upcoming appointments section', () => {
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

    render(<PatientDashboardPage />);
    expect(screen.getByText('Upcoming Appointments')).toBeInTheDocument();
    expect(screen.getByText('View All Appointments')).toBeInTheDocument();
  });

  it('should display recent messages section', () => {
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

    render(<PatientDashboardPage />);
    expect(screen.getByText('Recent Messages')).toBeInTheDocument();
    expect(screen.getByText('View All Messages')).toBeInTheDocument();
  });

  it('should display health records overview', () => {
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

    render(<PatientDashboardPage />);
    expect(screen.getByTestId('health-records-overview')).toBeInTheDocument();
  });

  it('should display quick actions section', () => {
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

    render(<PatientDashboardPage />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Schedule Appointment')).toBeInTheDocument();
    expect(screen.getByText('View Records')).toBeInTheDocument();
    expect(screen.getByText('Send Message')).toBeInTheDocument();
    expect(screen.getByText('Make Payment')).toBeInTheDocument();
  });

  it('should display navigation links', () => {
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

    render(<PatientDashboardPage />);
    const viewAllAppointments = screen.getByText('View All Appointments');
    const viewAllMessages = screen.getByText('View All Messages');
    
    expect(viewAllAppointments).toBeInTheDocument();
    expect(viewAllMessages).toBeInTheDocument();
  });
});

