import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { PatientAppointmentsList } from '@/components/patient/PatientAppointmentsList';
import { render } from '@/__tests__/utils/test-wrapper';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Calendar: ({ className }: { className?: string }) => <div data-testid="calendar-icon" className={className} />,
  Clock: ({ className }: { className?: string }) => <div data-testid="clock-icon" className={className} />,
  MapPin: ({ className }: { className?: string }) => <div data-testid="mappin-icon" className={className} />,
  User: ({ className }: { className?: string }) => <div data-testid="user-icon" className={className} />,
}));

describe('PatientAppointmentsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default mock appointments', () => {
      render(<PatientAppointmentsList />);

      expect(screen.getByTestId('appointments-list')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Appointments')).toBeInTheDocument();
      expect(screen.getByText('Recent Appointments')).toBeInTheDocument();
      expect(screen.getAllByTestId('appointment-card')).toHaveLength(4);
    });

    it('should render empty state when no appointments provided', () => {
      render(<PatientAppointmentsList appointments={[]} />);

      expect(screen.getByTestId('appointments-list')).toBeInTheDocument();
      expect(screen.getByText('No appointments found')).toBeInTheDocument();
      expect(screen.queryByText('Upcoming Appointments')).not.toBeInTheDocument();
      expect(screen.queryByText('Recent Appointments')).not.toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <PatientAppointmentsList className="custom-class" />
      );

      const listContainer = container.querySelector('.custom-class');
      expect(listContainer).toBeInTheDocument();
    });
  });

  describe('Appointment Display', () => {
    const mockFormattedAppointments = [
      {
        id: '1',
        title: 'Annual Physical Exam',
        provider: 'Dr. Sarah Johnson',
        date: 'Monday, Jan 15, 2024',
        originalDate: '2024-01-15',
        time: '10:00 AM',
        status: 'confirmed' as const,
        type: 'upcoming' as const,
        location: 'Main Clinic - Room 201',
        duration: '60 minutes',
        notes: 'Comprehensive annual health assessment',
        priority: 'high' as const,
      },
      {
        id: '2',
        title: 'Blood Pressure Check',
        provider: 'Dr. Michael Chen',
        date: 'Dec 20, 2023',
        originalDate: '2023-12-20',
        time: '9:00 AM',
        status: 'completed' as const,
        type: 'recent' as const,
        location: 'Main Clinic - Room 201',
        duration: '15 minutes',
        notes: 'Routine blood pressure monitoring',
        priority: 'low' as const,
      },
    ];

    it('should display appointment details correctly', () => {
      render(<PatientAppointmentsList appointments={mockFormattedAppointments} />);

      // Check provider name
      expect(screen.getByText('Dr. Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Dr. Michael Chen')).toBeInTheDocument();

      // Check appointment titles
      expect(screen.getByText('Annual Physical Exam')).toBeInTheDocument();
      expect(screen.getByText('Blood Pressure Check')).toBeInTheDocument();

      // Check dates
      expect(screen.getByText('Monday, Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Dec 20, 2023')).toBeInTheDocument();

      // Check times
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
      expect(screen.getByText('9:00 AM')).toBeInTheDocument();

      // Check locations (both appointments have the same location)
      expect(screen.getAllByText('Main Clinic - Room 201')).toHaveLength(2);
    });

    it('should display status badges correctly', () => {
      render(<PatientAppointmentsList appointments={mockFormattedAppointments} />);

      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should display priority badges correctly', () => {
      render(<PatientAppointmentsList appointments={mockFormattedAppointments} />);

      expect(screen.getByText('High Priority')).toBeInTheDocument();
      expect(screen.getByText('Low Priority')).toBeInTheDocument();
    });

    it('should have correct test IDs', () => {
      render(<PatientAppointmentsList appointments={mockFormattedAppointments} />);

      expect(screen.getByTestId('appointments-list')).toBeInTheDocument();
      expect(screen.getAllByTestId('appointment-card')).toHaveLength(2);
      expect(screen.getAllByTestId('appointment-provider')).toHaveLength(2);
      expect(screen.getAllByTestId('appointment-status')).toHaveLength(2);
      expect(screen.getAllByTestId('appointment-type')).toHaveLength(2);
      expect(screen.getAllByTestId('appointment-date')).toHaveLength(2);
      expect(screen.getAllByTestId('appointment-time')).toHaveLength(2);
      expect(screen.getAllByTestId('appointment-location')).toHaveLength(2);
    });
  });

  describe('Data Transformation', () => {
    it('should transform store format appointments correctly', () => {
      const storeAppointments = [
        {
          id: '1',
          date: '2024-01-15',
          time: '10:00 AM',
          provider: {
            id: 'provider-1',
            name: 'Dr. Sarah Johnson',
            specialty: 'Internal Medicine',
          },
          type: 'General Checkup',
          status: 'confirmed',
          location: 'Main Office',
          duration: '30 minutes',
          notes: 'Annual physical examination',
        },
      ];

      render(<PatientAppointmentsList appointments={storeAppointments} />);

      // Should display transformed data
      expect(screen.getByText('Dr. Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('General Checkup')).toBeInTheDocument();
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
    });

    it('should handle appointments with invalid status', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const storeAppointments = [
        {
          id: '1',
          date: '2024-01-15',
          time: '10:00 AM',
          provider: {
            id: 'provider-1',
            name: 'Dr. Sarah Johnson',
            specialty: 'Internal Medicine',
          },
          type: 'General Checkup',
          status: 'InvalidStatus',
          location: 'Main Office',
          duration: '30 minutes',
        },
      ];

      render(<PatientAppointmentsList appointments={storeAppointments} />);

      // Should default to 'Pending' status
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid appointment status')
      );

      consoleSpy.mockRestore();
    });

    it('should handle appointments with missing priority', () => {
      const storeAppointments = [
        {
          id: '1',
          date: '2024-01-15',
          time: '10:00 AM',
          provider: {
            id: 'provider-1',
            name: 'Dr. Sarah Johnson',
            specialty: 'Internal Medicine',
          },
          type: 'General Checkup',
          status: 'confirmed',
          location: 'Main Office',
          duration: '30 minutes',
        },
      ];

      render(<PatientAppointmentsList appointments={storeAppointments} />);

      // Should calculate priority from status (confirmed = high)
      expect(screen.getByText('High Priority')).toBeInTheDocument();
    });

    it('should handle appointments without title', () => {
      const storeAppointments = [
        {
          id: '1',
          date: '2024-01-15',
          time: '10:00 AM',
          provider: {
            id: 'provider-1',
            name: 'Dr. Sarah Johnson',
            specialty: 'Internal Medicine',
          },
          type: 'General Checkup',
          status: 'confirmed',
          location: 'Main Office',
          duration: '30 minutes',
        },
      ];

      render(<PatientAppointmentsList appointments={storeAppointments} />);

      // Should use type as title when title is missing
      expect(screen.getByText('General Checkup')).toBeInTheDocument();
    });
  });

  describe('Appointment Categorization', () => {
    it('should categorize future appointments as upcoming', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateString = futureDate.toISOString().split('T')[0]!;

      const storeAppointments = [
        {
          id: '1',
          date: futureDateString,
          time: '10:00 AM',
          provider: {
            id: 'provider-1',
            name: 'Dr. Sarah Johnson',
            specialty: 'Internal Medicine',
          },
          type: 'General Checkup',
          status: 'confirmed',
          location: 'Main Office',
          duration: '30 minutes',
        },
      ];

      render(<PatientAppointmentsList appointments={storeAppointments} />);

      expect(screen.getByText('Upcoming Appointments')).toBeInTheDocument();
      expect(screen.queryByText('Recent Appointments')).not.toBeInTheDocument();
    });

    it('should categorize past appointments as recent', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      const pastDateString = pastDate.toISOString().split('T')[0]!;

      const storeAppointments = [
        {
          id: '1',
          date: pastDateString,
          time: '10:00 AM',
          provider: {
            id: 'provider-1',
            name: 'Dr. Sarah Johnson',
            specialty: 'Internal Medicine',
          },
          type: 'General Checkup',
          status: 'confirmed',
          location: 'Main Office',
          duration: '30 minutes',
        },
      ];

      render(<PatientAppointmentsList appointments={storeAppointments} />);

      expect(screen.getByText('Recent Appointments')).toBeInTheDocument();
      expect(screen.queryByText('Upcoming Appointments')).not.toBeInTheDocument();
    });

    it('should always categorize completed appointments as recent', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateString = futureDate.toISOString().split('T')[0]!;

      const storeAppointments = [
        {
          id: '1',
          date: futureDateString,
          time: '10:00 AM',
          provider: {
            id: 'provider-1',
            name: 'Dr. Sarah Johnson',
            specialty: 'Internal Medicine',
          },
          type: 'General Checkup',
          status: 'completed',
          location: 'Main Office',
          duration: '30 minutes',
        },
      ];

      render(<PatientAppointmentsList appointments={storeAppointments} />);

      // Completed appointments should always be recent, even if date is in future
      expect(screen.getByText('Recent Appointments')).toBeInTheDocument();
      expect(screen.queryByText('Upcoming Appointments')).not.toBeInTheDocument();
    });

    it('should always categorize cancelled appointments as recent', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateString = futureDate.toISOString().split('T')[0]!;

      const storeAppointments = [
        {
          id: '1',
          date: futureDateString,
          time: '10:00 AM',
          provider: {
            id: 'provider-1',
            name: 'Dr. Sarah Johnson',
            specialty: 'Internal Medicine',
          },
          type: 'General Checkup',
          status: 'cancelled',
          location: 'Main Office',
          duration: '30 minutes',
        },
      ];

      render(<PatientAppointmentsList appointments={storeAppointments} />);

      // Cancelled appointments should always be recent
      expect(screen.getByText('Recent Appointments')).toBeInTheDocument();
      expect(screen.queryByText('Upcoming Appointments')).not.toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort upcoming appointments by date ascending', () => {
      // Use future dates to ensure they're categorized as upcoming
      const futureDate1 = new Date();
      futureDate1.setDate(futureDate1.getDate() + 7); // 7 days from now
      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 14); // 14 days from now
      
      const storeAppointments = [
        {
          id: '1',
          date: futureDate2.toISOString().split('T')[0]!, // Later date
          time: '2:00 PM',
          provider: { id: 'p1', name: 'Dr. A', specialty: 'General' },
          type: 'Checkup',
          status: 'confirmed',
          location: 'Office',
          duration: '30 min',
        },
        {
          id: '2',
          date: futureDate1.toISOString().split('T')[0]!, // Earlier date
          time: '10:00 AM',
          provider: { id: 'p2', name: 'Dr. B', specialty: 'General' },
          type: 'Checkup',
          status: 'confirmed',
          location: 'Office',
          duration: '30 min',
        },
      ];

      render(<PatientAppointmentsList appointments={storeAppointments} />);

      // Verify both appointments are in upcoming section
      expect(screen.getByText('Upcoming Appointments')).toBeInTheDocument();
      
      // Get all provider elements and verify they appear in the correct order
      // The component should sort by date ascending (earliest first)
      const providers = screen.getAllByTestId('appointment-provider');
      
      // Verify we have both appointments
      expect(providers).toHaveLength(2);
      
      // First appointment should be the earlier date (Dr. B)
      expect(providers[0]).toHaveTextContent('Dr. B');
      
      // Second appointment should be the later date (Dr. A)
      expect(providers[1]).toHaveTextContent('Dr. A');
    });

    it('should sort recent appointments by date descending', () => {
      const storeAppointments = [
        {
          id: '1',
          date: '2023-12-15',
          time: '2:00 PM',
          provider: { id: 'p1', name: 'Dr. A', specialty: 'General' },
          type: 'Checkup',
          status: 'completed',
          location: 'Office',
          duration: '30 min',
        },
        {
          id: '2',
          date: '2023-12-20',
          time: '10:00 AM',
          provider: { id: 'p2', name: 'Dr. B', specialty: 'General' },
          type: 'Checkup',
          status: 'completed',
          location: 'Office',
          duration: '30 min',
        },
      ];

      render(<PatientAppointmentsList appointments={storeAppointments} />);

      const cards = screen.getAllByTestId('appointment-card');
      // First card should be the more recent date (Dec 20)
      expect(cards[0]).toHaveTextContent('Dr. B');
      expect(cards[1]).toHaveTextContent('Dr. A');
    });
  });

  describe('Interaction', () => {
    it('should call onAppointmentClick when appointment card is clicked', () => {
      const handleClick = vi.fn();
      const mockAppointments = [
        {
          id: '1',
          title: 'Annual Physical Exam',
          provider: 'Dr. Sarah Johnson',
          date: 'Monday, Jan 15, 2024',
          originalDate: '2024-01-15',
          time: '10:00 AM',
          status: 'confirmed' as const,
          type: 'upcoming' as const,
          location: 'Main Clinic - Room 201',
          duration: '60 minutes',
          priority: 'high' as const,
        },
      ];

      render(
        <PatientAppointmentsList 
          appointments={mockAppointments} 
          onAppointmentClick={handleClick}
        />
      );

      const card = screen.getByTestId('appointment-card');
      fireEvent.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(expect.objectContaining({
        id: '1',
        title: 'Annual Physical Exam',
      }));
    });

    it('should not call onAppointmentClick if handler is not provided', () => {
      const mockAppointments = [
        {
          id: '1',
          title: 'Annual Physical Exam',
          provider: 'Dr. Sarah Johnson',
          date: 'Monday, Jan 15, 2024',
          originalDate: '2024-01-15',
          time: '10:00 AM',
          status: 'confirmed' as const,
          type: 'upcoming' as const,
          location: 'Main Clinic - Room 201',
          duration: '60 minutes',
          priority: 'high' as const,
        },
      ];

      render(<PatientAppointmentsList appointments={mockAppointments} />);

      const card = screen.getByTestId('appointment-card');
      fireEvent.click(card);

      // Should not throw error
      expect(card).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render action buttons when showActions is true', () => {
      const handleReschedule = vi.fn();
      const handleCancel = vi.fn();

      const actionButtons = [
        {
          label: 'Reschedule',
          onClick: handleReschedule,
          variant: 'outline' as const,
          showForStatus: ['confirmed', 'pending'],
        },
        {
          label: 'Cancel',
          onClick: handleCancel,
          variant: 'outline' as const,
          showForStatus: ['confirmed', 'pending'],
        },
      ];

      const mockAppointments = [
        {
          id: '1',
          title: 'Annual Physical Exam',
          provider: 'Dr. Sarah Johnson',
          date: 'Monday, Jan 15, 2024',
          originalDate: '2024-01-15',
          time: '10:00 AM',
          status: 'confirmed' as const,
          type: 'upcoming' as const,
          location: 'Main Clinic - Room 201',
          duration: '60 minutes',
          priority: 'high' as const,
        },
      ];

      render(
        <PatientAppointmentsList 
          appointments={mockAppointments}
          showActions={true}
          actionButtons={actionButtons}
        />
      );

      expect(screen.getByText('Reschedule')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should filter action buttons by status', () => {
      const handleReschedule = vi.fn();
      const handleCancel = vi.fn();

      const actionButtons = [
        {
          label: 'Reschedule',
          onClick: handleReschedule,
          showForStatus: ['confirmed'],
        },
        {
          label: 'Cancel',
          onClick: handleCancel,
          showForStatus: ['pending'],
        },
      ];

      const mockAppointments = [
        {
          id: '1',
          title: 'Annual Physical Exam',
          provider: 'Dr. Sarah Johnson',
          date: 'Monday, Jan 15, 2024',
          originalDate: '2024-01-15',
          time: '10:00 AM',
          status: 'confirmed' as const,
          type: 'upcoming' as const,
          location: 'Main Clinic - Room 201',
          duration: '60 minutes',
          priority: 'high' as const,
        },
        {
          id: '2',
          title: 'Follow-up',
          provider: 'Dr. Michael Chen',
          date: 'Friday, Jan 20, 2024',
          originalDate: '2024-01-20',
          time: '2:30 PM',
          status: 'pending' as const,
          type: 'upcoming' as const,
          location: 'Specialist Clinic',
          duration: '30 minutes',
          priority: 'medium' as const,
        },
      ];

      render(
        <PatientAppointmentsList 
          appointments={mockAppointments}
          showActions={true}
          actionButtons={actionButtons}
        />
      );

      // First appointment (confirmed) should only show Reschedule
      const cards = screen.getAllByTestId('appointment-card');
      const firstCard = cards[0];
      expect(firstCard).toHaveTextContent('Reschedule');
      expect(firstCard).not.toHaveTextContent('Cancel');

      // Second appointment (pending) should only show Cancel
      const secondCard = cards[1];
      expect(secondCard).toHaveTextContent('Cancel');
      expect(secondCard).not.toHaveTextContent('Reschedule');
    });

    it('should call action button onClick handler', () => {
      const handleReschedule = vi.fn();

      const actionButtons = [
        {
          label: 'Reschedule',
          onClick: handleReschedule,
          showForStatus: ['confirmed'],
        },
      ];

      const mockAppointments = [
        {
          id: '1',
          title: 'Annual Physical Exam',
          provider: 'Dr. Sarah Johnson',
          date: 'Monday, Jan 15, 2024',
          originalDate: '2024-01-15',
          time: '10:00 AM',
          status: 'confirmed' as const,
          type: 'upcoming' as const,
          location: 'Main Clinic - Room 201',
          duration: '60 minutes',
          priority: 'high' as const,
        },
      ];

      render(
        <PatientAppointmentsList 
          appointments={mockAppointments}
          showActions={true}
          actionButtons={actionButtons}
        />
      );

      const rescheduleButton = screen.getByText('Reschedule');
      fireEvent.click(rescheduleButton);

      expect(handleReschedule).toHaveBeenCalledTimes(1);
      expect(handleReschedule).toHaveBeenCalledWith(expect.objectContaining({
        id: '1',
        status: 'confirmed',
      }));
    });

    it('should not show action buttons when showActions is false', () => {
      const actionButtons = [
        {
          label: 'Reschedule',
          onClick: vi.fn(),
        },
      ];

      const mockAppointments = [
        {
          id: '1',
          title: 'Annual Physical Exam',
          provider: 'Dr. Sarah Johnson',
          date: 'Monday, Jan 15, 2024',
          originalDate: '2024-01-15',
          time: '10:00 AM',
          status: 'confirmed' as const,
          type: 'upcoming' as const,
          location: 'Main Clinic - Room 201',
          duration: '60 minutes',
          priority: 'high' as const,
        },
      ];

      render(
        <PatientAppointmentsList 
          appointments={mockAppointments}
          showActions={false}
          actionButtons={actionButtons}
        />
      );

      expect(screen.queryByText('Reschedule')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle appointments without location', () => {
      const mockAppointments = [
        {
          id: '1',
          title: 'Annual Physical Exam',
          provider: 'Dr. Sarah Johnson',
          date: 'Monday, Jan 15, 2024',
          originalDate: '2024-01-15',
          time: '10:00 AM',
          status: 'confirmed' as const,
          type: 'upcoming' as const,
          duration: '60 minutes',
          priority: 'high' as const,
        },
      ];

      render(<PatientAppointmentsList appointments={mockAppointments} />);

      expect(screen.getByText('Annual Physical Exam')).toBeInTheDocument();
      expect(screen.queryByTestId('appointment-location')).not.toBeInTheDocument();
    });

    it('should handle appointments without duration', () => {
      const mockAppointments = [
        {
          id: '1',
          title: 'Annual Physical Exam',
          provider: 'Dr. Sarah Johnson',
          date: 'Monday, Jan 15, 2024',
          originalDate: '2024-01-15',
          time: '10:00 AM',
          status: 'confirmed' as const,
          type: 'upcoming' as const,
          location: 'Main Clinic - Room 201',
          priority: 'high' as const,
        },
      ];

      render(<PatientAppointmentsList appointments={mockAppointments} />);

      expect(screen.getByText('Annual Physical Exam')).toBeInTheDocument();
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    });

    it('should handle appointments with provider as string', () => {
      const storeAppointments = [
        {
          id: '1',
          date: '2024-01-15',
          time: '10:00 AM',
          provider: 'Dr. Sarah Johnson',
          type: 'General Checkup',
          status: 'confirmed',
          location: 'Main Office',
          duration: '30 minutes',
        },
      ];

      render(<PatientAppointmentsList appointments={storeAppointments} />);

      expect(screen.getByText('Dr. Sarah Johnson')).toBeInTheDocument();
    });

    it('should handle invalid date formats gracefully', () => {
      const storeAppointments = [
        {
          id: '1',
          date: 'invalid-date',
          time: '10:00 AM',
          provider: {
            id: 'provider-1',
            name: 'Dr. Sarah Johnson',
            specialty: 'Internal Medicine',
          },
          type: 'General Checkup',
          status: 'confirmed',
          location: 'Main Office',
          duration: '30 minutes',
        },
      ];

      render(<PatientAppointmentsList appointments={storeAppointments} />);

      // Should still render, defaulting to upcoming for non-completed appointments
      expect(screen.getByText('Upcoming Appointments')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should display all status types correctly', () => {
      const storeAppointments = [
        {
          id: '1',
          date: '2024-01-15',
          time: '10:00 AM',
          provider: { id: 'p1', name: 'Dr. A', specialty: 'General' },
          type: 'Checkup',
          status: 'scheduled',
          location: 'Office',
          duration: '30 min',
        },
        {
          id: '2',
          date: '2024-01-16',
          time: '11:00 AM',
          provider: { id: 'p2', name: 'Dr. B', specialty: 'General' },
          type: 'Checkup',
          status: 'confirmed',
          location: 'Office',
          duration: '30 min',
        },
        {
          id: '3',
          date: '2024-01-17',
          time: '12:00 PM',
          provider: { id: 'p3', name: 'Dr. C', specialty: 'General' },
          type: 'Checkup',
          status: 'pending',
          location: 'Office',
          duration: '30 min',
        },
        {
          id: '4',
          date: '2024-01-18',
          time: '1:00 PM',
          provider: { id: 'p4', name: 'Dr. D', specialty: 'General' },
          type: 'Checkup',
          status: 'completed',
          location: 'Office',
          duration: '30 min',
        },
        {
          id: '5',
          date: '2024-01-19',
          time: '2:00 PM',
          provider: { id: 'p5', name: 'Dr. E', specialty: 'General' },
          type: 'Checkup',
          status: 'cancelled',
          location: 'Office',
          duration: '30 min',
        },
      ];

      render(<PatientAppointmentsList appointments={storeAppointments} />);

      expect(screen.getByText('Scheduled')).toBeInTheDocument();
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });
  });

  describe('Priority Display', () => {
    it('should display all priority types correctly', () => {
      const mockAppointments = [
        {
          id: '1',
          title: 'Annual Checkup',
          provider: 'Dr. A',
          date: 'Monday, Jan 15, 2024',
          originalDate: '2024-01-15',
          time: '10:00 AM',
          status: 'confirmed' as const,
          type: 'upcoming' as const,
          location: 'Office',
          duration: '30 min',
          priority: 'high' as const,
        },
        {
          id: '2',
          title: 'Follow-up Visit',
          provider: 'Dr. B',
          date: 'Tuesday, Jan 16, 2024',
          originalDate: '2024-01-16',
          time: '11:00 AM',
          status: 'pending' as const,
          type: 'upcoming' as const,
          location: 'Office',
          duration: '30 min',
          priority: 'medium' as const,
        },
        {
          id: '3',
          title: 'Routine Exam',
          provider: 'Dr. C',
          date: 'Wednesday, Jan 17, 2024',
          originalDate: '2024-01-17',
          time: '12:00 PM',
          status: 'completed' as const,
          type: 'recent' as const,
          location: 'Office',
          duration: '30 min',
          priority: 'low' as const,
        },
      ];

      render(<PatientAppointmentsList appointments={mockAppointments} />);

      // Check that priority badges are displayed (using getAllByText since there might be multiple matches)
      expect(screen.getAllByText('High Priority').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Medium Priority').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Low Priority').length).toBeGreaterThan(0);
    });
  });
});
