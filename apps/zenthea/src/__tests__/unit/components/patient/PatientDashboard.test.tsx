import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import PatientDashboardPage from '@/app/patient/dashboard/page';

// Mock @/lib/auth
vi.mock('@/hooks/useZentheaSession', () => ({
  useZentheaSession: vi.fn()
}));

// Mock the HealthRecordsOverview component
vi.mock('@/components/patient/HealthRecordsOverview', () => ({
  HealthRecordsOverview: () => <div data-testid="health-records-overview">Health Records Overview</div>
}));

describe('Patient Dashboard Page', () => {
  const mockSession = {
    user: {
      id: 'patient-123',
      email: 'patient@example.com',
      role: 'patient',
      name: 'John Doe'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner when session is loading', () => {
      (useZentheaSession as any).mockReturnValue({
        data: null,
        status: 'loading'
      });

      render(<PatientDashboardPage />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });
  });

  describe('Access Control', () => {
    it('should show access denied when no session', () => {
      (useZentheaSession as any).mockReturnValue({
        data: null,
        status: 'unauthenticated'
      });

      render(<PatientDashboardPage />);

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('Please sign in to access your patient dashboard.')).toBeInTheDocument();
    });

    it('should show access denied when user is not a patient', () => {
      (useZentheaSession as any).mockReturnValue({
        data: {
          ...mockSession,
          user: { ...mockSession.user, role: 'provider' }
        },
        status: 'authenticated'
      });

      render(<PatientDashboardPage />);

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  describe('Dashboard Content', () => {
    beforeEach(() => {
      (useZentheaSession as any).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      });
    });

    it('should render dashboard header with welcome message', () => {
      render(<PatientDashboardPage />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Welcome back, John/)).toBeInTheDocument();
    });

    it('should render quick stats cards', () => {
      render(<PatientDashboardPage />);

      // Check for quick stats section
      expect(screen.getByText('Upcoming Appointments')).toBeInTheDocument();
      expect(screen.getByText('Unread Messages')).toBeInTheDocument();
      expect(screen.getByText('Pending Tasks')).toBeInTheDocument();
      expect(screen.getByText('Health Summary')).toBeInTheDocument();
    });

    it('should display upcoming appointments', () => {
      render(<PatientDashboardPage />);

      expect(screen.getByText('Dr. Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Annual Checkup')).toBeInTheDocument();
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
      expect(screen.getByText('Dr. Michael Chen')).toBeInTheDocument();
      expect(screen.getByText('Follow-up')).toBeInTheDocument();
    });

    it('should display appointment status badges', () => {
      render(<PatientDashboardPage />);

      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should display recent messages', () => {
      render(<PatientDashboardPage />);

      expect(screen.getByText('Test Results Available')).toBeInTheDocument();
      expect(screen.getByText('Dr. Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Prescription Refill Approved')).toBeInTheDocument();
      expect(screen.getByText('Nurse Practitioner Lisa')).toBeInTheDocument();
    });

    it('should show unread message indicators', () => {
      render(<PatientDashboardPage />);

      // Check for unread indicators (badges or styling)
      const unreadMessages = screen.getAllByText('Unread');
      expect(unreadMessages.length).toBeGreaterThan(0);
    });

    it('should render health records overview component', () => {
      render(<PatientDashboardPage />);

      expect(screen.getByTestId('health-records-overview')).toBeInTheDocument();
    });

    it('should display health summary information', () => {
      render(<PatientDashboardPage />);

      expect(screen.getByText('Last Visit')).toBeInTheDocument();
      expect(screen.getByText('Next Appointment')).toBeInTheDocument();
      expect(screen.getByText('Pending Tasks')).toBeInTheDocument();
      expect(screen.getByText('Unread Messages')).toBeInTheDocument();
    });
  });

  describe('Interactive Elements', () => {
    beforeEach(() => {
      (useZentheaSession as any).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      });
    });

    it('should have clickable appointment cards', () => {
      render(<PatientDashboardPage />);

      const appointmentCards = screen.getAllByRole('button');
      expect(appointmentCards.length).toBeGreaterThan(0);
    });

    it('should have clickable message cards', () => {
      render(<PatientDashboardPage />);

      const messageCards = screen.getAllByRole('button');
      expect(messageCards.length).toBeGreaterThan(0);
    });

    it('should display action buttons for appointments', () => {
      render(<PatientDashboardPage />);

      // Look for common action buttons
      const buttons = screen.getAllByRole('button');
      const buttonTexts = buttons.map(button => button.textContent);
      
      // Should have buttons for common actions
      expect(buttonTexts.some(text => 
        text?.includes('View') || 
        text?.includes('Reschedule') || 
        text?.includes('Cancel')
      )).toBe(true);
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      (useZentheaSession as any).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      });
    });

    it('should have proper grid layout classes', () => {
      render(<PatientDashboardPage />);

      // Check for responsive grid classes
      const gridElements = screen.getAllByRole('grid');
      expect(gridElements.length).toBeGreaterThan(0);
    });

    it('should have proper card layout structure', () => {
      render(<PatientDashboardPage />);

      // Check for card components
      const cards = screen.getAllByRole('article');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('Data Display', () => {
    beforeEach(() => {
      (useZentheaSession as any).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      });
    });

    it('should format dates correctly', () => {
      render(<PatientDashboardPage />);

      // Check for properly formatted dates
      expect(screen.getByText('2024-01-15')).toBeInTheDocument();
      expect(screen.getByText('2024-01-20')).toBeInTheDocument();
    });

    it('should display provider information correctly', () => {
      render(<PatientDashboardPage />);

      expect(screen.getByText('Dr. Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Dr. Michael Chen')).toBeInTheDocument();
    });

    it('should show appointment types and statuses', () => {
      render(<PatientDashboardPage />);

      expect(screen.getByText('Annual Checkup')).toBeInTheDocument();
      expect(screen.getByText('Follow-up')).toBeInTheDocument();
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      (useZentheaSession as any).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      });
    });

    it('should have proper heading hierarchy', () => {
      render(<PatientDashboardPage />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Dashboard');

      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThan(0);
    });

    it('should have accessible button elements', () => {
      render(<PatientDashboardPage />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
        // Buttons should have accessible text or aria-labels
        expect(button.textContent || button.getAttribute('aria-label')).toBeTruthy();
      });
    });

    it('should have proper ARIA labels for interactive elements', () => {
      render(<PatientDashboardPage />);

      // Check for proper ARIA attributes
      const interactiveElements = screen.getAllByRole('button');
      expect(interactiveElements.length).toBeGreaterThan(0);
    });
  });
});
