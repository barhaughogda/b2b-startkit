import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SOAPNoteModal } from '../SOAPNoteModal';

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

describe('SOAPNoteModal', () => {
  const defaultProps = {
    patientName: 'John Doe',
    providerName: 'Dr. Smith',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the modal with correct title', () => {
      render(<SOAPNoteModal {...defaultProps} />);
      
      expect(screen.getByText('SOAP Note')).toBeInTheDocument();
    });

    it('displays patient and provider names in badges', () => {
      render(<SOAPNoteModal {...defaultProps} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    });

    it('renders all SOAP sections with correct labels', () => {
      render(<SOAPNoteModal {...defaultProps} />);
      
      expect(screen.getByText('Subjective')).toBeInTheDocument();
      expect(screen.getByText('Objective')).toBeInTheDocument();
      expect(screen.getByText('Assessment')).toBeInTheDocument();
      expect(screen.getByText('Plan')).toBeInTheDocument();
    });

    it('renders all textarea inputs with correct placeholders', () => {
      render(<SOAPNoteModal {...defaultProps} />);
      
      expect(screen.getByPlaceholderText("Patient's chief complaint and history...")).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Physical examination findings, vital signs...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Clinical impression, diagnosis...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Treatment plan, follow-up instructions...')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(<SOAPNoteModal {...defaultProps} />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save Note')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<SOAPNoteModal {...defaultProps} />);
      
      const subjectiveLabel = screen.getByText('Subjective');
      const objectiveLabel = screen.getByText('Objective');
      const assessmentLabel = screen.getByText('Assessment');
      const planLabel = screen.getByText('Plan');
      
      expect(subjectiveLabel).toHaveAttribute('for', 'subjective');
      expect(objectiveLabel).toHaveAttribute('for', 'objective');
      expect(assessmentLabel).toHaveAttribute('for', 'assessment');
      expect(planLabel).toHaveAttribute('for', 'plan');
    });

    it('has proper textarea IDs', () => {
      render(<SOAPNoteModal {...defaultProps} />);
      
      const textareas = screen.getAllByDisplayValue('');
      expect(textareas).toHaveLength(4);
      expect(textareas[0]).toHaveAttribute('id', 'subjective');
      expect(textareas[1]).toHaveAttribute('id', 'objective');
      expect(textareas[2]).toHaveAttribute('id', 'assessment');
      expect(textareas[3]).toHaveAttribute('id', 'plan');
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when Cancel button is clicked', () => {
      const mockOnClose = vi.fn();
      render(<SOAPNoteModal {...defaultProps} onClose={mockOnClose} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('handles text input in textareas', () => {
      render(<SOAPNoteModal {...defaultProps} />);
      
      const subjectiveTextarea = screen.getByPlaceholderText("Patient's chief complaint and history...");
      fireEvent.change(subjectiveTextarea, { target: { value: 'Patient reports chest pain' } });
      
      expect(subjectiveTextarea).toHaveValue('Patient reports chest pain');
    });

    it('handles multiple textarea inputs', () => {
      render(<SOAPNoteModal {...defaultProps} />);
      
      const subjectiveTextarea = screen.getByPlaceholderText("Patient's chief complaint and history...");
      const objectiveTextarea = screen.getByPlaceholderText('Physical examination findings, vital signs...');
      
      fireEvent.change(subjectiveTextarea, { target: { value: 'Chest pain' } });
      fireEvent.change(objectiveTextarea, { target: { value: 'BP 120/80, HR 72' } });
      
      expect(subjectiveTextarea).toHaveValue('Chest pain');
      expect(objectiveTextarea).toHaveValue('BP 120/80, HR 72');
    });
  });

  describe('Props Handling', () => {
    it('renders with different patient and provider names', () => {
      const customProps = {
        patientName: 'Jane Smith',
        providerName: 'Dr. Johnson',
      };
      
      render(<SOAPNoteModal {...customProps} />);
      
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Dr. Johnson')).toBeInTheDocument();
    });

    it('works without onClose prop', () => {
      expect(() => {
        render(<SOAPNoteModal {...defaultProps} />);
      }).not.toThrow();
    });
  });

  describe('Layout and Styling', () => {
    it('applies correct CSS classes', () => {
      render(<SOAPNoteModal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('w-full', 'max-w-4xl', 'mx-auto');
    });

    it('has proper grid layout for SOAP sections', () => {
      render(<SOAPNoteModal {...defaultProps} />);
      
      const content = screen.getByTestId('card-content');
      expect(content).toHaveClass('space-y-6');
    });
  });
});
