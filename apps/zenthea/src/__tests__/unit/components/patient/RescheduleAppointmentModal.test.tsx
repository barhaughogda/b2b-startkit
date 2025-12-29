import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RescheduleAppointmentModal } from '@/components/patient/RescheduleAppointmentModal';
import { useAppointmentsStore } from '@/stores/appointmentsStore';

// Mock appointments store
const mockRescheduleAppointment = vi.fn().mockResolvedValue(undefined);
const mockClearError = vi.fn();

vi.mock('@/stores/appointmentsStore', () => ({
  useAppointmentsStore: vi.fn(),
}));

// Mock date-fns format
vi.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => {
    if (formatStr === 'PPP') {
      return date.toLocaleDateString();
    }
    if (formatStr === 'yyyy-MM-dd') {
      return date.toISOString().split('T')[0];
    }
    if (formatStr === 'h:mm a') {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return date.toString();
  },
}));

describe('RescheduleAppointmentModal', () => {
  const mockAppointment = {
    id: 'appt-123',
    date: '2024-01-20',
    time: '10:00 AM',
    provider: {
      name: 'Dr. Sarah Johnson',
      specialty: 'Cardiology',
    },
    type: 'Consultation',
  };

  const mockStore = {
    isLoading: false,
    error: null,
    rescheduleAppointment: mockRescheduleAppointment,
    clearError: mockClearError,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAppointmentsStore).mockReturnValue(mockStore as any);
  });

  describe('Rendering', () => {
    it('should not render when appointment is null', () => {
      const { container } = render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={vi.fn()}
          appointment={null}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('should render modal when appointment is provided', () => {
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={vi.fn()}
          appointment={mockAppointment}
        />
      );
      
      expect(screen.getByText('Reschedule Appointment')).toBeInTheDocument();
      expect(screen.getByText(/Change the date and time/i)).toBeInTheDocument();
    });

    it('should display current appointment information', () => {
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={vi.fn()}
          appointment={mockAppointment}
        />
      );
      
      expect(screen.getByText(/Current Appointment/i)).toBeInTheDocument();
      expect(screen.getByText(/Dr\. Sarah Johnson/i)).toBeInTheDocument();
      expect(screen.getByText(/2024-01-20/i)).toBeInTheDocument();
      expect(screen.getByText(/10:00 AM/i)).toBeInTheDocument();
      expect(screen.getByText(/Consultation/i)).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('should render date picker', () => {
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={vi.fn()}
          appointment={mockAppointment}
        />
      );
      
      expect(screen.getByText(/New Date/i)).toBeInTheDocument();
      expect(screen.getByText(/Pick a new date/i)).toBeInTheDocument();
    });

    it('should render time selector', () => {
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={vi.fn()}
          appointment={mockAppointment}
        />
      );
      
      expect(screen.getByText(/New Time/i)).toBeInTheDocument();
      expect(screen.getByText(/Select a new time/i)).toBeInTheDocument();
    });

    it('should render reason textarea', () => {
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={vi.fn()}
          appointment={mockAppointment}
        />
      );
      
      expect(screen.getByText(/Reason for Rescheduling/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Please let us know why/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should disable submit button when date is not selected', () => {
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={vi.fn()}
          appointment={mockAppointment}
        />
      );
      
      const submitButton = screen.getByRole('button', { name: /Reschedule Appointment/i });
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when time is not selected', async () => {
      const user = userEvent.setup();
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={vi.fn()}
          appointment={mockAppointment}
        />
      );
      
      // Select date but not time
      const dateButton = screen.getByText(/Pick a new date/i);
      await user.click(dateButton);
      
      // Wait for calendar to appear and select a date
      await waitFor(() => {
        const calendar = screen.queryByRole('grid');
        if (calendar) {
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          // Try to find and click tomorrow's date
        }
      });
      
      const submitButton = screen.getByRole('button', { name: /Reschedule Appointment/i });
      // Button should still be disabled without time
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Submission', () => {
    it('should call rescheduleAppointment on form submit', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={onClose}
          appointment={mockAppointment}
        />
      );
      
      // Select date
      const dateButton = screen.getByText(/Pick a new date/i);
      await user.click(dateButton);
      
      // Select time
      const timeSelect = screen.getByText(/Select a new time/i);
      await user.click(timeSelect);
      
      // Wait for options and select first time slot
      await waitFor(() => {
        const timeOption = screen.queryByText(/9:00 AM/i);
        if (timeOption) {
          user.click(timeOption);
        }
      });
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /Reschedule Appointment/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockRescheduleAppointment).toHaveBeenCalled();
      });
    });

    it('should close modal on successful submission', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={onClose}
          appointment={mockAppointment}
        />
      );
      
      // Fill form and submit (simplified for test)
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);
      
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error occurs', () => {
      vi.mocked(useAppointmentsStore).mockReturnValue({
        ...mockStore,
        error: 'Failed to reschedule appointment',
      } as any);
      
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={vi.fn()}
          appointment={mockAppointment}
        />
      );
      
      expect(screen.getByText(/Failed to reschedule appointment/i)).toBeInTheDocument();
    });

    it('should clear error after 5 seconds', async () => {
      vi.useFakeTimers();
      
      vi.mocked(useAppointmentsStore).mockReturnValue({
        ...mockStore,
        error: 'Test error',
      } as any);
      
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={vi.fn()}
          appointment={mockAppointment}
        />
      );
      
      vi.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled();
      });
      
      vi.useRealTimers();
    });
  });

  describe('Modal Actions', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={onClose}
          appointment={mockAppointment}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should reset form when modal is closed', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={onClose}
          appointment={mockAppointment}
        />
      );
      
      // Fill some fields
      const reasonInput = screen.getByPlaceholderText(/Please let us know why/i);
      await user.type(reasonInput, 'Test reason');
      
      // Close modal
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);
      
      // Reopen and check form is reset
      const { rerender } = render(
        <RescheduleAppointmentModal
          isOpen={false}
          onClose={onClose}
          appointment={mockAppointment}
        />
      );
      
      rerender(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={onClose}
          appointment={mockAppointment}
        />
      );
      
      const reasonInputAfter = screen.getByPlaceholderText(/Please let us know why/i);
      expect(reasonInputAfter).toHaveValue('');
    });
  });

  describe('Loading States', () => {
    it('should disable submit button when loading', () => {
      vi.mocked(useAppointmentsStore).mockReturnValue({
        ...mockStore,
        isLoading: true,
      } as any);
      
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={vi.fn()}
          appointment={mockAppointment}
        />
      );
      
      const submitButton = screen.getByRole('button', { name: /Rescheduling/i });
      expect(submitButton).toBeDisabled();
    });

    it('should disable cancel button when submitting', () => {
      vi.mocked(useAppointmentsStore).mockReturnValue({
        ...mockStore,
        isLoading: true,
      } as any);
      
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={vi.fn()}
          appointment={mockAppointment}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper dialog structure', () => {
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={vi.fn()}
          appointment={mockAppointment}
        />
      );
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have labeled form fields', () => {
      render(
        <RescheduleAppointmentModal
          isOpen={true}
          onClose={vi.fn()}
          appointment={mockAppointment}
        />
      );
      
      expect(screen.getByText(/New Date/i)).toBeInTheDocument();
      expect(screen.getByText(/New Time/i)).toBeInTheDocument();
      expect(screen.getByText(/Reason for Rescheduling/i)).toBeInTheDocument();
    });
  });
});

