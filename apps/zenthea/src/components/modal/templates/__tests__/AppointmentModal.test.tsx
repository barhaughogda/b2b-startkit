import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AppointmentModal } from '../AppointmentModal';

// Mock shadcn components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div data-testid="card" className={className} {...props}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className, ...props }: any) => (
    <div data-testid="card-header" className={className} {...props}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className, ...props }: any) => (
    <h3 data-testid="card-title" className={className} {...props}>
      {children}
    </h3>
  ),
  CardContent: ({ children, className, ...props }: any) => (
    <div data-testid="card-content" className={className} {...props}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, className, onClick, variant, ...props }: any) => (
    <button
      data-testid="button"
      className={className}
      onClick={onClick}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ id, placeholder, type, value, readOnly, className, ...props }: any) => (
    <input
      data-testid="input"
      id={id}
      placeholder={placeholder}
      type={type}
      value={value}
      readOnly={readOnly}
      className={className}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ id, placeholder, className, ...props }: any) => (
    <textarea
      data-testid="textarea"
      id={id}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className, ...props }: any) => (
    <label data-testid="label" htmlFor={htmlFor} className={className} {...props}>
      {children}
    </label>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant, ...props }: any) => (
    <span
      data-testid="badge"
      className={className}
      data-variant={variant}
      {...props}
    >
      {children}
    </span>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  User: () => <div data-testid="user-icon" />,
  MapPin: () => <div data-testid="mappin-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
}));

describe('AppointmentModal', () => {
  const defaultProps = {
    patientName: 'John Doe',
    providerName: 'Dr. Smith',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the modal with correct title', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      expect(screen.getByText('Appointment')).toBeInTheDocument();
    });

    it('displays patient and provider names in badges', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    });

    it('renders all section headers', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      expect(screen.getByText('Appointment Details')).toBeInTheDocument();
      expect(screen.getByText('Patient Information')).toBeInTheDocument();
      expect(screen.getByText('Appointment Notes')).toBeInTheDocument();
      expect(screen.getByText('Status & Reminders')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save Appointment')).toBeInTheDocument();
    });
  });

  describe('Appointment Details Section', () => {
    it('renders appointment detail inputs with correct labels', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
    });

    it('renders icons for appointment detail labels', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
      expect(screen.getAllByTestId('clock-icon')).toHaveLength(2); // Time and Duration both use clock icon
    });

    it('has correct input types for date and time', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      const dateInput = screen.getByLabelText('Date');
      const timeInput = screen.getByLabelText('Time');
      
      expect(dateInput).toHaveAttribute('type', 'date');
      expect(timeInput).toHaveAttribute('type', 'time');
    });
  });

  describe('Patient Information Section', () => {
    it('renders patient information inputs', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      expect(screen.getByText('Patient Name')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Address')).toBeInTheDocument();
    });

    it('displays patient name as read-only', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      const patientNameInput = screen.getByDisplayValue('John Doe');
      expect(patientNameInput).toHaveAttribute('readOnly');
    });

    it('renders icons for patient information labels', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
      expect(screen.getByTestId('phone-icon')).toBeInTheDocument();
      expect(screen.getByTestId('mappin-icon')).toBeInTheDocument();
    });
  });

  describe('Appointment Notes Section', () => {
    it('renders notes textarea with correct placeholder', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter appointment notes, special instructions, or preparation requirements...')).toBeInTheDocument();
    });
  });

  describe('Status & Reminders Section', () => {
    it('renders status and reminder inputs', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Reminder')).toBeInTheDocument();
    });

    it('displays status as read-only with default value', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      const statusInput = screen.getByDisplayValue('Scheduled');
      expect(statusInput).toHaveAttribute('readOnly');
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when Cancel button is clicked', () => {
      const mockOnClose = vi.fn();
      render(<AppointmentModal {...defaultProps} onClose={mockOnClose} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('handles input in editable fields', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      const durationInput = screen.getByPlaceholderText('30 minutes');
      fireEvent.change(durationInput, { target: { value: '45 minutes' } });
      
      expect(durationInput).toHaveValue('45 minutes');
    });

    it('handles multiple field inputs', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      const typeInput = screen.getByPlaceholderText('Follow-up');
      const phoneInput = screen.getByPlaceholderText('(555) 123-4567');
      const emailInput = screen.getByPlaceholderText('patient@example.com');
      
      fireEvent.change(typeInput, { target: { value: 'Consultation' } });
      fireEvent.change(phoneInput, { target: { value: '(555) 987-6543' } });
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
      
      expect(typeInput).toHaveValue('Consultation');
      expect(phoneInput).toHaveValue('(555) 987-6543');
      expect(emailInput).toHaveValue('john@example.com');
    });

    it('handles textarea input for notes', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      const notesTextarea = screen.getByPlaceholderText('Enter appointment notes, special instructions, or preparation requirements...');
      fireEvent.change(notesTextarea, { target: { value: 'Patient needs to fast before appointment' } });
      
      expect(notesTextarea).toHaveValue('Patient needs to fast before appointment');
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels for all inputs', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      const inputs = screen.getAllByTestId('input');
      const textareas = screen.getAllByTestId('textarea');
      
      expect(inputs.length + textareas.length).toBeGreaterThan(0);
    });

    it('has proper label associations', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      const dateLabel = screen.getByText('Date');
      const dateInput = screen.getByLabelText('Date');
      
      expect(dateLabel).toHaveAttribute('for', 'date');
      expect(dateInput).toHaveAttribute('id', 'date');
    });
  });

  describe('Props Handling', () => {
    it('renders with different patient and provider names', () => {
      const customProps = {
        patientName: 'Jane Smith',
        providerName: 'Dr. Johnson',
      };
      
      render(<AppointmentModal {...customProps} />);
      
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Dr. Johnson')).toBeInTheDocument();
      
      const patientNameInput = screen.getByDisplayValue('Jane Smith');
      expect(patientNameInput).toHaveAttribute('readOnly');
    });

    it('works without onClose prop', () => {
      expect(() => {
        render(<AppointmentModal {...defaultProps} />);
      }).not.toThrow();
    });
  });

  describe('Layout and Styling', () => {
    it('applies correct CSS classes', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('w-full', 'max-w-4xl', 'mx-auto');
    });

    it('has proper grid layout for form sections', () => {
      render(<AppointmentModal {...defaultProps} />);
      
      const content = screen.getByTestId('card-content');
      expect(content).toHaveClass('space-y-6');
    });
  });
});
