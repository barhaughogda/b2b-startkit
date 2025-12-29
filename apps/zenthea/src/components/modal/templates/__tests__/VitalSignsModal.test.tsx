import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { VitalSignsModal } from '../VitalSignsModal';

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
  Input: ({ id, placeholder, className, ...props }: any) => (
    <input
      data-testid="input"
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
  Heart: () => <div data-testid="heart-icon" />,
  Circle: () => <div data-testid="circle-icon" />,
  Square: () => <div data-testid="square-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
}));

describe('VitalSignsModal', () => {
  const defaultProps = {
    patientName: 'John Doe',
    providerName: 'Dr. Smith',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the modal with correct title', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      expect(screen.getByText('Vital Signs')).toBeInTheDocument();
    });

    it('displays patient and provider names in badges', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    });

    it('renders quick entry section with all vital signs inputs', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      expect(screen.getByText('Quick Entry')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('120/80 mmHg')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('72 bpm')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('98.6°F')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('150 lbs')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('5\'8 inches')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('98%')).toBeInTheDocument();
    });

    it('renders recent readings section', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      expect(screen.getByText('Recent Readings')).toBeInTheDocument();
      expect(screen.getAllByText('Blood Pressure')).toHaveLength(2); // Label + recent reading
      expect(screen.getAllByText('Heart Rate')).toHaveLength(2); // Label + recent reading
      expect(screen.getByText('120/80')).toBeInTheDocument();
      expect(screen.getByText('72 bpm')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save Vitals')).toBeInTheDocument();
    });
  });

  describe('Vital Signs Input Fields', () => {
    it('renders all vital signs labels with icons', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      // Use getAllByText for text that appears multiple times
      expect(screen.getAllByText('Blood Pressure')).toHaveLength(2); // Label + recent reading
      expect(screen.getAllByText('Heart Rate')).toHaveLength(2); // Label + recent reading
      expect(screen.getByText('Temperature')).toBeInTheDocument();
      expect(screen.getByText('Weight')).toBeInTheDocument();
      expect(screen.getByText('Height')).toBeInTheDocument();
      expect(screen.getByText('Oxygen Saturation')).toBeInTheDocument();
    });

    it('has proper form labels and IDs', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      // Use getAllByText for text that appears multiple times
      const bloodPressureLabels = screen.getAllByText('Blood Pressure');
      const bloodPressureLabel = bloodPressureLabels[0]; // First occurrence is the label
      const heartRateLabels = screen.getAllByText('Heart Rate');
      const heartRateLabel = heartRateLabels[0]; // First occurrence is the label
      
      expect(bloodPressureLabel).toHaveAttribute('for', 'blood-pressure');
      expect(heartRateLabel).toHaveAttribute('for', 'heart-rate');
    });

    it('renders icons for vital signs labels', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      expect(screen.getByTestId('activity-icon')).toBeInTheDocument();
      expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
      expect(screen.getByTestId('circle-icon')).toBeInTheDocument();
      expect(screen.getByTestId('square-icon')).toBeInTheDocument();
    });
  });

  describe('Recent Readings Display', () => {
    it('displays recent blood pressure reading', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      expect(screen.getByText('120/80')).toBeInTheDocument();
      expect(screen.getAllByText('2 hours ago')).toHaveLength(2); // One for each reading
    });

    it('displays recent heart rate reading', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      expect(screen.getByText('72 bpm')).toBeInTheDocument();
    });

    it('shows status badges for readings', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      const normalBadges = screen.getAllByText('Normal');
      expect(normalBadges).toHaveLength(2);
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when Cancel button is clicked', () => {
      const mockOnClose = vi.fn();
      render(<VitalSignsModal {...defaultProps} onClose={mockOnClose} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('handles input in vital signs fields', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      const bloodPressureInput = screen.getByPlaceholderText('120/80 mmHg');
      fireEvent.change(bloodPressureInput, { target: { value: '130/85' } });
      
      expect(bloodPressureInput).toHaveValue('130/85');
    });

    it('handles multiple vital signs inputs', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      const bloodPressureInput = screen.getByPlaceholderText('120/80 mmHg');
      const heartRateInput = screen.getByPlaceholderText('72 bpm');
      const temperatureInput = screen.getByPlaceholderText('98.6°F');
      
      fireEvent.change(bloodPressureInput, { target: { value: '130/85' } });
      fireEvent.change(heartRateInput, { target: { value: '80' } });
      fireEvent.change(temperatureInput, { target: { value: '99.2' } });
      
      expect(bloodPressureInput).toHaveValue('130/85');
      expect(heartRateInput).toHaveValue('80');
      expect(temperatureInput).toHaveValue('99.2');
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels for all inputs', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      const inputs = screen.getAllByTestId('input');
      expect(inputs).toHaveLength(6);
      
      inputs.forEach(input => {
        expect(input).toHaveAttribute('id');
      });
    });

    it('has proper label associations', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      // Use getAllByText to get the label (first occurrence) and check its association
      const bloodPressureLabels = screen.getAllByText('Blood Pressure');
      const bloodPressureLabel = bloodPressureLabels[0]; // First occurrence is the label
      const bloodPressureInput = screen.getByPlaceholderText('120/80 mmHg');
      
      expect(bloodPressureLabel).toHaveAttribute('for', 'blood-pressure');
      expect(bloodPressureInput).toHaveAttribute('id', 'blood-pressure');
    });
  });

  describe('Props Handling', () => {
    it('renders with different patient and provider names', () => {
      const customProps = {
        patientName: 'Jane Smith',
        providerName: 'Dr. Johnson',
      };
      
      render(<VitalSignsModal {...customProps} />);
      
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Dr. Johnson')).toBeInTheDocument();
    });

    it('works without onClose prop', () => {
      expect(() => {
        render(<VitalSignsModal {...defaultProps} />);
      }).not.toThrow();
    });
  });

  describe('Layout and Styling', () => {
    it('applies correct CSS classes', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('w-full', 'max-w-4xl', 'mx-auto');
    });

    it('has proper grid layout for vital signs inputs', () => {
      render(<VitalSignsModal {...defaultProps} />);
      
      const content = screen.getByTestId('card-content');
      expect(content).toHaveClass('space-y-6');
    });
  });
});
