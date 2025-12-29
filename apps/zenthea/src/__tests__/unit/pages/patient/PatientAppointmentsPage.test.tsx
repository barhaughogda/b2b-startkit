import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientAppointmentsPage from '@/app/patient/appointments/page';
import { useAppointmentsStore } from '@/stores/appointmentsStore';

// Mock stores
const mockFetchAppointments = vi.fn();
const mockClearError = vi.fn();
const mockAppointments = [
  {
    id: '1',
    date: '2024-01-15',
    time: '10:00 AM',
    provider: { id: '1', name: 'Dr. Sarah Johnson', specialty: 'Cardiology' },
    type: 'Annual Checkup',
    status: 'confirmed',
    location: 'Main Clinic',
    duration: '30 min',
  },
];

vi.mock('@/stores/appointmentsStore', () => ({
  useAppointmentsStore: vi.fn(),
}));

vi.mock('@/stores/notificationsStore', () => ({
  useNotificationsStore: () => ({
    unreadCount: 0,
  }),
}));

// Mock components
vi.mock('@/components/patient/BookAppointmentModal', () => ({
  BookAppointmentModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div data-testid="book-appointment-modal">Book Appointment Modal</div> : null
  ),
}));

vi.mock('@/components/patient/RescheduleAppointmentModal', () => ({
  RescheduleAppointmentModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div data-testid="reschedule-appointment-modal">Reschedule Appointment Modal</div> : null
  ),
}));

vi.mock('@/components/patient/CancelAppointmentModal', () => ({
  CancelAppointmentModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div data-testid="cancel-appointment-modal">Cancel Appointment Modal</div> : null
  ),
}));

vi.mock('@/components/patient/NotificationCenter', () => ({
  NotificationCenter: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div data-testid="notification-center">Notification Center</div> : null
  ),
}));

vi.mock('@/components/patient/PatientAppointmentsList', () => ({
  PatientAppointmentsList: ({ appointments }: { appointments: any[] }) => (
    <div data-testid="appointments-list">
      {appointments.map((apt) => (
        <div key={apt.id} data-testid={`appointment-${apt.id}`}>
          {apt.provider.name} - {apt.type}
        </div>
      ))}
    </div>
  ),
}));

describe('PatientAppointmentsPage', () => {
  const user = userEvent.setup();

  const defaultStore = {
    appointments: mockAppointments,
    isLoading: false,
    error: null,
    fetchAppointments: mockFetchAppointments,
    clearError: mockClearError,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppointmentsStore as any).mockReturnValue(defaultStore);
  });

  it('should render the appointments page', () => {
    render(<PatientAppointmentsPage />);
    expect(screen.getByText('Appointments')).toBeInTheDocument();
    expect(screen.getByText(/Manage your scheduled appointments/i)).toBeInTheDocument();
  });

  it('should display search input', () => {
    render(<PatientAppointmentsPage />);
    const searchInput = screen.getByTestId('search-input');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Search appointments...');
  });

  it('should display status filter', () => {
    render(<PatientAppointmentsPage />);
    const statusFilter = screen.getByTestId('status-filter');
    expect(statusFilter).toBeInTheDocument();
    expect(statusFilter).toHaveValue('all');
  });

  it('should display schedule appointment button', () => {
    render(<PatientAppointmentsPage />);
    expect(screen.getByRole('button', { name: /schedule appointment/i })).toBeInTheDocument();
  });

  it('should open book appointment modal when schedule button is clicked', async () => {
    render(<PatientAppointmentsPage />);
    const scheduleButton = screen.getByRole('button', { name: /schedule appointment/i });
    await user.click(scheduleButton);
    
    expect(screen.getByTestId('book-appointment-modal')).toBeInTheDocument();
  });

  it('should display appointments list when appointments exist', () => {
    render(<PatientAppointmentsPage />);
    expect(screen.getByTestId('appointments-list')).toBeInTheDocument();
    expect(screen.getByTestId('appointment-1')).toBeInTheDocument();
  });

  it('should display empty state when no appointments', () => {
    (useAppointmentsStore as any).mockReturnValue({
      appointments: [],
      isLoading: false,
      error: null,
      fetchAppointments: mockFetchAppointments,
      clearError: mockClearError,
    });

    render(<PatientAppointmentsPage />);
    expect(screen.getByText(/No appointments found/i)).toBeInTheDocument();
  });

  it('should display loading state', () => {
    (useAppointmentsStore as any).mockReturnValue({
      appointments: [],
      isLoading: true,
      error: null,
      fetchAppointments: mockFetchAppointments,
      clearError: mockClearError,
    });

    render(<PatientAppointmentsPage />);
    expect(screen.getByText(/Loading appointments/i)).toBeInTheDocument();
  });

  it('should display error message when error exists', () => {
    (useAppointmentsStore as any).mockReturnValue({
      appointments: [],
      isLoading: false,
      error: 'Failed to load appointments',
      fetchAppointments: mockFetchAppointments,
      clearError: mockClearError,
    });

    render(<PatientAppointmentsPage />);
    expect(screen.getByText(/Error: Failed to load appointments/i)).toBeInTheDocument();
  });

  it('should filter appointments by search term', async () => {
    render(<PatientAppointmentsPage />);
    const searchInput = screen.getByTestId('search-input');
    await user.type(searchInput, 'Sarah');
    
    // Should still show the appointment since it matches
    expect(screen.getByTestId('appointment-1')).toBeInTheDocument();
  });

  it('should filter appointments by status', async () => {
    render(<PatientAppointmentsPage />);
    const statusFilter = screen.getByTestId('status-filter');
    await user.selectOptions(statusFilter, 'confirmed');
    
    expect(statusFilter).toHaveValue('confirmed');
  });

  it('should display quick stats', () => {
    render(<PatientAppointmentsPage />);
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should display refresh button', () => {
    render(<PatientAppointmentsPage />);
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('should call fetchAppointments on refresh', async () => {
    render(<PatientAppointmentsPage />);
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);
    
    expect(mockFetchAppointments).toHaveBeenCalled();
  });
});

