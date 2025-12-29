/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-wrapper';
import { useQuery, useMutation } from 'convex/react';
import { AvailabilityManager } from '@/components/provider/AvailabilityManager';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';

// Mock Convex
vi.mock('convex/react');
vi.mock('sonner');

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
  CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, disabled, className }: any) => (
    <button 
      data-testid="button" 
      onClick={onClick}
      data-variant={variant}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, type, ...props }: any) => (
    <input 
      data-testid="input"
      value={value}
      onChange={onChange}
      type={type}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label data-testid="label">{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select 
      data-testid="select"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: () => <span data-testid="select-value" />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

const mockUseQuery = useQuery as any;
const mockUseMutation = useMutation as any;
const mockToast = toast as any;

describe('AvailabilityManager', () => {
  const mockProviderId = 'provider-123' as Id<'providers'>;
  const mockTenantId = 'tenant-123';
  const mockLocationId = 'location-1' as Id<'locations'>;

  const mockAvailability = {
    recurring: [
      { dayOfWeek: 'monday', startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'wednesday', startTime: '10:00', endTime: '16:00' },
    ],
    overrides: [
      { overrideDate: new Date('2024-01-15').getTime(), startTime: '08:00', endTime: '12:00' },
    ],
  };

  const mockSetRecurringAvailability = vi.fn();
  const mockAddOverride = vi.fn();
  const mockRemoveOverride = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseQuery.mockImplementation((queryFn: any, args: any) => {
      if (args === 'skip') return undefined;
      if (queryFn === api.availability.getProviderAvailability) {
        return mockAvailability;
      }
      return undefined;
    });

    mockUseMutation.mockImplementation((mutationFn: any) => {
      if (mutationFn === api.availability.setRecurringAvailability) {
        return mockSetRecurringAvailability;
      }
      if (mutationFn === api.availability.addAvailabilityOverride) {
        return mockAddOverride;
      }
      if (mutationFn === api.availability.removeAvailabilityOverride) {
        return mockRemoveOverride;
      }
      return vi.fn();
    });

    mockSetRecurringAvailability.mockResolvedValue(undefined);
    mockAddOverride.mockResolvedValue(undefined);
    mockRemoveOverride.mockResolvedValue(undefined);
  });

  it('should render availability manager', () => {
    render(
      <AvailabilityManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    expect(screen.getByText('Recurring Schedule')).toBeInTheDocument();
    expect(screen.getByText('Date Overrides')).toBeInTheDocument();
  });

  it('should display recurring schedule tab by default', () => {
    render(
      <AvailabilityManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    expect(screen.getByText('Weekly Recurring Schedule')).toBeInTheDocument();
  });

  it('should switch to date overrides tab', async () => {
    render(
      <AvailabilityManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    const overridesButton = screen.getByText('Date Overrides');
    fireEvent.click(overridesButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Add Date Override/i)).toBeInTheDocument();
    });
  });

  it('should toggle day availability', async () => {
    render(
      <AvailabilityManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    // Find Monday checkbox (should be enabled based on mock data)
    const mondayCheckbox = screen.getByLabelText(/Monday/i);
    expect(mondayCheckbox).toBeChecked();
    
    fireEvent.click(mondayCheckbox);
    
    await waitFor(() => {
      expect(mondayCheckbox).not.toBeChecked();
    });
  });

  it('should update time for a day', async () => {
    render(
      <AvailabilityManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    // Find Monday start time input
    const startTimeInputs = screen.getAllByDisplayValue('09:00');
    const mondayStartTime = startTimeInputs[0];
    
    fireEvent.change(mondayStartTime, { target: { value: '08:00' } });
    
    await waitFor(() => {
      expect(mondayStartTime).toHaveValue('08:00');
    });
  });

  it('should save recurring schedule', async () => {
    render(
      <AvailabilityManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    const saveButton = screen.getByText(/Save Schedule/i);
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockSetRecurringAvailability).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        'Schedule saved',
        expect.objectContaining({
          description: 'Your recurring availability has been updated.',
        })
      );
    });
  });

  it('should add date override', async () => {
    render(
      <AvailabilityManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    // Switch to overrides tab
    const overridesButton = screen.getByText('Date Overrides');
    fireEvent.click(overridesButton);
    
    await waitFor(() => {
      const dateInput = screen.getByLabelText(/Date/i);
      fireEvent.change(dateInput, { target: { value: '2024-01-20' } });
    });
    
    const addButton = screen.getByText(/Add Override/i);
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(mockAddOverride).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        'Override added',
        expect.any(Object)
      );
    });
  });

  it('should show error when adding override without date', async () => {
    render(
      <AvailabilityManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    const overridesButton = screen.getByText('Date Overrides');
    fireEvent.click(overridesButton);
    
    await waitFor(() => {
      const addButton = screen.getByText(/Add Override/i);
      fireEvent.click(addButton);
    });
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'Date required',
        expect.objectContaining({
          description: 'Please select a date for the override.',
        })
      );
    });
  });

  it('should remove date override', async () => {
    render(
      <AvailabilityManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    const overridesButton = screen.getByText('Date Overrides');
    fireEvent.click(overridesButton);
    
    await waitFor(() => {
      // Find remove button for existing override
      const removeButtons = screen.getAllByText(/Remove/i);
      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0]);
      }
    });
    
    await waitFor(() => {
      expect(mockRemoveOverride).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        'Override removed',
        expect.objectContaining({
          description: 'The availability override has been removed.',
        })
      );
    });
  });

  it('should handle location-specific availability', () => {
    render(
      <AvailabilityManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
        locationId={mockLocationId}
      />
    );
    
    expect(screen.getByText('Recurring Schedule')).toBeInTheDocument();
  });

  it('should display existing recurring schedule', () => {
    render(
      <AvailabilityManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    // Monday should be enabled with 09:00-17:00
    const mondayCheckbox = screen.getByLabelText(/Monday/i);
    expect(mondayCheckbox).toBeChecked();
  });

  it('should handle save error', async () => {
    mockSetRecurringAvailability.mockRejectedValue(new Error('Save failed'));
    
    render(
      <AvailabilityManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    const saveButton = screen.getByText(/Save Schedule/i);
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'Error',
        expect.objectContaining({
          description: 'Save failed',
        })
      );
    });
  });
});

