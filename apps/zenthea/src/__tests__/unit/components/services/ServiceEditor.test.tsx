/**
 * Unit Tests for ServiceEditor Component
 * 
 * Light component tests for the add/edit service flow.
 * Tests basic rendering, form interactions, and save callback.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServiceEditor, type ServiceData } from '@/components/services/ServiceEditor';

// Mock the ServiceIconPicker as it has complex internal state
vi.mock('@/components/services/ServiceIconPicker', () => ({
  ServiceIconPicker: ({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) => (
    <button
      type="button"
      data-testid="icon-picker"
      onClick={() => onChange({ kind: 'lucide', name: 'Heart' })}
    >
      {value ? 'Icon Selected' : 'Select Icon'}
    </button>
  ),
}));

// Mock Sheet components with proper semantics
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="sheet-title">{children}</h2>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="sheet-description">{children}</p>
  ),
  SheetFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-footer">{children}</div>
  ),
}));

describe('ServiceEditor Component', () => {
  const mockOnSave = vi.fn();
  const mockOnOpenChange = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onSave: mockOnSave,
    mode: 'create' as const,
    tenantCurrency: 'USD',
    tenantId: 'test-tenant-id',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
  });

  describe('Create Mode', () => {
    it('should render with correct title for create mode', () => {
      render(<ServiceEditor {...defaultProps} />);
      
      expect(screen.getByTestId('sheet-title')).toHaveTextContent('Add Service');
      expect(screen.getByTestId('sheet-description')).toHaveTextContent(
        'Create a new service that patients can book.'
      );
    });

    it('should render form fields', () => {
      render(<ServiceEditor {...defaultProps} />);
      
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByText(/duration/i)).toBeInTheDocument();
      expect(screen.getByText(/description/i)).toBeInTheDocument();
      expect(screen.getByText(/pricing/i)).toBeInTheDocument();
      expect(screen.getByTestId('icon-picker')).toBeInTheDocument();
    });

    it('should have cancel and save buttons', () => {
      render(<ServiceEditor {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create service/i })).toBeInTheDocument();
    });

    it('should disable save button when name is empty', () => {
      render(<ServiceEditor {...defaultProps} />);
      
      const saveButton = screen.getByRole('button', { name: /create service/i });
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when name is filled', async () => {
      const user = userEvent.setup();
      render(<ServiceEditor {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'General Checkup');
      
      const saveButton = screen.getByRole('button', { name: /create service/i });
      expect(saveButton).toBeEnabled();
    });

    it('should call onSave with correct data when form is submitted', async () => {
      const user = userEvent.setup();
      render(<ServiceEditor {...defaultProps} />);
      
      // Fill in the name
      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'General Checkup');
      
      // Submit the form
      const saveButton = screen.getByRole('button', { name: /create service/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(1);
      });
      
      const savedData = mockOnSave.mock.calls[0][0] as ServiceData;
      expect(savedData.name).toBe('General Checkup');
      expect(savedData.duration).toBe(30); // Default duration
      expect(savedData.enabled).toBe(true);
      expect(savedData.allowOnline).toBe(true);
    });

    it('should call onOpenChange when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<ServiceEditor {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('should render duration preset buttons', () => {
      render(<ServiceEditor {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: '15 min' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '30 min' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '45 min' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '60 min' })).toBeInTheDocument();
    });

    it('should update duration when preset is clicked', async () => {
      const user = userEvent.setup();
      render(<ServiceEditor {...defaultProps} />);
      
      const preset60 = screen.getByRole('button', { name: '60 min' });
      await user.click(preset60);
      
      // Fill name to enable submission
      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'Test Service');
      
      const saveButton = screen.getByRole('button', { name: /create service/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
      
      const savedData = mockOnSave.mock.calls[0][0] as ServiceData;
      expect(savedData.duration).toBe(60);
    });
  });

  describe('Edit Mode', () => {
    const existingService: ServiceData = {
      id: 'service-123',
      name: 'Existing Service',
      duration: 45,
      description: 'An existing service',
      enabled: true,
      allowOnline: false,
      pricing: { mode: 'fixed', amountCents: 5000, currency: 'USD' },
      icon: { kind: 'lucide', name: 'Heart' },
    };

    it('should render with correct title for edit mode', () => {
      render(
        <ServiceEditor {...defaultProps} mode="edit" service={existingService} />
      );
      
      expect(screen.getByTestId('sheet-title')).toHaveTextContent('Edit Service');
    });

    it('should pre-fill form with existing service data', () => {
      render(
        <ServiceEditor {...defaultProps} mode="edit" service={existingService} />
      );
      
      expect(screen.getByLabelText(/name/i)).toHaveValue('Existing Service');
      expect(screen.getByLabelText(/description/i)).toHaveValue('An existing service');
    });

    it('should show "Save Changes" button in edit mode', () => {
      render(
        <ServiceEditor {...defaultProps} mode="edit" service={existingService} />
      );
      
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('should pass service ID when saving in edit mode', async () => {
      const { container } = render(
        <ServiceEditor {...defaultProps} mode="edit" service={existingService} />
      );
      
      // Submit the form directly
      const form = container.querySelector('form');
      fireEvent.submit(form!);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      }, { timeout: 5000 });
      
      const savedData = mockOnSave.mock.calls[0][0] as ServiceData;
      expect(savedData.id).toBe('service-123');
    });
  });

  describe('Duplicate Mode', () => {
    const existingService: ServiceData = {
      id: 'service-123',
      name: 'Original Service',
      duration: 30,
      description: 'Service to duplicate',
      enabled: false,
      allowOnline: true,
    };

    it('should render with correct title for duplicate mode', () => {
      render(
        <ServiceEditor {...defaultProps} mode="duplicate" service={existingService} />
      );
      
      expect(screen.getByTestId('sheet-title')).toHaveTextContent('Duplicate Service');
    });

    it('should append "(Copy)" to service name', () => {
      render(
        <ServiceEditor {...defaultProps} mode="duplicate" service={existingService} />
      );
      
      expect(screen.getByLabelText(/name/i)).toHaveValue('Original Service (Copy)');
    });

    it('should not pass service ID when saving duplicate (creates new)', async () => {
      const { container } = render(
        <ServiceEditor {...defaultProps} mode="duplicate" service={existingService} />
      );
      
      // Submit the form directly
      const form = container.querySelector('form');
      fireEvent.submit(form!);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      }, { timeout: 5000 });
      
      const savedData = mockOnSave.mock.calls[0][0] as ServiceData;
      expect(savedData.id).toBeUndefined();
    });
  });

  describe('Closed State', () => {
    it('should not render when open is false', () => {
      render(<ServiceEditor {...defaultProps} open={false} />);
      
      expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
    });
  });

  describe('Icon Selection', () => {
    it('should render icon picker', () => {
      render(<ServiceEditor {...defaultProps} />);
      
      expect(screen.getByTestId('icon-picker')).toBeInTheDocument();
    });

    it('should update icon when picker is used', async () => {
      const user = userEvent.setup();
      render(<ServiceEditor {...defaultProps} />);
      
      // Click icon picker to select an icon
      const iconPicker = screen.getByTestId('icon-picker');
      await user.click(iconPicker);
      
      // Fill name to enable submission
      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'Test Service');
      
      const saveButton = screen.getByRole('button', { name: /create service/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
      
      const savedData = mockOnSave.mock.calls[0][0] as ServiceData;
      expect(savedData.icon).toEqual({ kind: 'lucide', name: 'Heart' });
    });
  });

  describe('Allow Online Toggle', () => {
    it('should show allow online booking toggle', () => {
      render(<ServiceEditor {...defaultProps} />);
      
      expect(screen.getByText(/allow online booking/i)).toBeInTheDocument();
    });
  });
});

