import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookAppointmentModal } from '@/components/patient/BookAppointmentModal';
import { useAppointmentsStore } from '@/stores/appointmentsStore';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Calendar: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  CalendarIcon: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Clock: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  MapPin: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  User: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  X: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  ChevronLeftIcon: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  ChevronRightIcon: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  ChevronDown: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  ChevronUp: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Check: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
}));

// Mock the appointments store
vi.mock('@/stores/appointmentsStore', () => ({
  useAppointmentsStore: vi.fn()
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date) => date.toISOString().split('T')[0])
}));

describe('BookAppointmentModal', () => {
  const mockProviders = [
    {
      id: 'provider-1',
      name: 'Dr. Sarah Johnson',
      specialty: 'Internal Medicine',
      available: true
    },
    {
      id: 'provider-2',
      name: 'Dr. Michael Chen',
      specialty: 'Cardiology',
      available: true
    }
  ];

  const mockStore = {
    providers: mockProviders,
    isLoading: false,
    error: null,
    fetchProviders: vi.fn(),
    bookAppointment: vi.fn(),
    clearError: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppointmentsStore as any).mockReturnValue(mockStore);
  });

  describe('Modal Rendering', () => {
    it('should render modal when open', () => {
      render(
        <BookAppointmentModal 
          isOpen={true} 
          onClose={vi.fn()} 
        />
      );

      expect(screen.getByText('Schedule New Appointment')).toBeInTheDocument();
      expect(screen.getByText('Choose your preferred provider, date, and time for your appointment.')).toBeInTheDocument();
    });

    it('should not render modal when closed', () => {
      render(
        <BookAppointmentModal 
          isOpen={false} 
          onClose={vi.fn()} 
        />
      );

      expect(screen.queryByText('Schedule New Appointment')).not.toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('should render all form fields', () => {
      render(
        <BookAppointmentModal 
          isOpen={true} 
          onClose={vi.fn()} 
        />
      );

      expect(screen.getByLabelText(/select healthcare provider/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/select appointment date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/select appointment time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/select appointment type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/preferred appointment location/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reason for visit/i)).toBeInTheDocument();
    });

    it('should display provider options', () => {
      render(
        <BookAppointmentModal 
          isOpen={true} 
          onClose={vi.fn()} 
        />
      );

      const providerSelect = screen.getByLabelText(/select healthcare provider/i);
      fireEvent.click(providerSelect);

      expect(screen.getAllByText('Dr. Sarah Johnson - Internal Medicine')).toHaveLength(2); // One in option, one in selected display
      expect(screen.getAllByText('Dr. Michael Chen - Cardiology')).toHaveLength(2);
    });
  });

  describe('Form Submission', () => {
    it('should call onClose when cancel button is clicked', () => {
      const mockOnClose = vi.fn();
      render(
        <BookAppointmentModal 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show submit button', () => {
      render(
        <BookAppointmentModal 
          isOpen={true} 
          onClose={vi.fn()} 
        />
      );

      expect(screen.getByRole('button', { name: /schedule appointment/i })).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state when fetching providers', () => {
      (useAppointmentsStore as any).mockReturnValue({
        ...mockStore,
        isLoading: true
      });

      render(
        <BookAppointmentModal 
          isOpen={true} 
          onClose={vi.fn()} 
        />
      );

      const submitButton = screen.getByRole('button', { name: /schedule appointment/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when there is an error', () => {
      (useAppointmentsStore as any).mockReturnValue({
        ...mockStore,
        error: 'Failed to load providers'
      });

      render(
        <BookAppointmentModal 
          isOpen={true} 
          onClose={vi.fn()} 
        />
      );

      expect(screen.getByText('Failed to load providers')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <BookAppointmentModal 
          isOpen={true} 
          onClose={vi.fn()} 
        />
      );

      expect(screen.getByLabelText(/select healthcare provider/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/select appointment date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/select appointment time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/select appointment type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/preferred appointment location/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reason for visit/i)).toBeInTheDocument();
    });

    it('should have proper form structure', () => {
      render(
        <BookAppointmentModal 
          isOpen={true} 
          onClose={vi.fn()} 
        />
      );

      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
    });
  });
});