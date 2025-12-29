/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-wrapper';
import { useQuery, useMutation } from 'convex/react';
import { LocationManager } from '@/components/provider/LocationManager';
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
  Button: ({ children, onClick, variant, disabled }: any) => (
    <button 
      data-testid="button" 
      onClick={onClick}
      data-variant={variant}
      disabled={disabled}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, ...props }: any) => (
    <input 
      data-testid="input"
      value={value}
      onChange={onChange}
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
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

const mockUseQuery = useQuery as any;
const mockUseMutation = useMutation as any;
const mockToast = toast as any;

describe('LocationManager', () => {
  const mockProviderId = 'provider-123' as Id<'providers'>;
  const mockTenantId = 'tenant-123';

  const mockProviderLocations = [
    {
      _id: 'location-1' as Id<'locations'>,
      name: 'Main Office',
      type: 'office',
      isDefault: true,
    },
    {
      _id: 'location-2' as Id<'locations'>,
      name: 'Satellite Office',
      type: 'hospital',
      isDefault: false,
    },
  ];

  const mockAllLocations = [
    ...mockProviderLocations,
    {
      _id: 'location-3' as Id<'locations'>,
      name: 'Telehealth Office',
      type: 'telehealth',
    },
  ];

  const mockCreateLocation = vi.fn();
  const mockUpdateLocation = vi.fn();
  const mockAddProviderToLocation = vi.fn();
  const mockRemoveProviderFromLocation = vi.fn();
  const mockSetDefaultLocation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseQuery.mockImplementation((queryFn: any, args: any) => {
      if (args === 'skip') return undefined;
      if (queryFn === api.locations.getProviderLocations) {
        return mockProviderLocations;
      }
      if (queryFn === api.locations.getLocationsByTenant) {
        return mockAllLocations;
      }
      return undefined;
    });

    mockUseMutation.mockImplementation((mutationFn: any) => {
      if (mutationFn === api.locations.createLocation) {
        return mockCreateLocation;
      }
      if (mutationFn === api.locations.updateLocation) {
        return mockUpdateLocation;
      }
      if (mutationFn === api.locations.addProviderToLocation) {
        return mockAddProviderToLocation;
      }
      if (mutationFn === api.locations.removeProviderFromLocation) {
        return mockRemoveProviderFromLocation;
      }
      if (mutationFn === api.locations.setDefaultLocation) {
        return mockSetDefaultLocation;
      }
      return vi.fn();
    });

    mockCreateLocation.mockResolvedValue('location-new' as Id<'locations'>);
    mockAddProviderToLocation.mockResolvedValue(undefined);
    mockRemoveProviderFromLocation.mockResolvedValue(undefined);
    mockSetDefaultLocation.mockResolvedValue(undefined);
  });

  it('should render location manager', () => {
    render(
      <LocationManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    expect(screen.getByText('Locations')).toBeInTheDocument();
  });

  it('should display provider locations', () => {
    render(
      <LocationManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    expect(screen.getByText('Main Office')).toBeInTheDocument();
    expect(screen.getByText('Satellite Office')).toBeInTheDocument();
  });

  it('should show add location form when add button is clicked', async () => {
    render(
      <LocationManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    const addButton = screen.getByText(/Add Location/i);
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    });
  });

  it('should create new location', async () => {
    render(
      <LocationManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    const addButton = screen.getByText(/Add Location/i);
    fireEvent.click(addButton);
    
    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Name/i);
      fireEvent.change(nameInput, { target: { value: 'New Office' } });
    });
    
    const createButton = screen.getByText(/Create Location/i);
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(mockCreateLocation).toHaveBeenCalled();
      expect(mockAddProviderToLocation).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        'Location created',
        expect.objectContaining({
          description: 'The location has been created and added to your locations.',
        })
      );
    });
  });

  it('should show error when creating location without name', async () => {
    render(
      <LocationManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    const addButton = screen.getByText(/Add Location/i);
    fireEvent.click(addButton);
    
    await waitFor(() => {
      const createButton = screen.getByText(/Create Location/i);
      fireEvent.click(createButton);
    });
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'Name required',
        expect.objectContaining({
          description: 'Please enter a location name.',
        })
      );
    });
  });

  it('should remove location from provider', async () => {
    render(
      <LocationManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    // Find remove button for a location
    const removeButtons = screen.getAllByText(/Remove/i);
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);
    }
    
    await waitFor(() => {
      expect(mockRemoveProviderFromLocation).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        'Location removed',
        expect.objectContaining({
          description: 'The location has been removed from your locations.',
        })
      );
    });
  });

  it('should set default location', async () => {
    render(
      <LocationManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    // Find set default button
    const defaultButtons = screen.getAllByText(/Set Default/i);
    if (defaultButtons.length > 0) {
      fireEvent.click(defaultButtons[0]);
    }
    
    await waitFor(() => {
      expect(mockSetDefaultLocation).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        'Default location updated',
        expect.objectContaining({
          description: 'The default location has been updated.',
        })
      );
    });
  });

  it('should add existing location to provider', async () => {
    render(
      <LocationManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    // Look for "Add Existing" section
    const addExistingButtons = screen.getAllByText(/Add/i);
    // Find the one that adds existing location
    const addExistingButton = addExistingButtons.find(btn => 
      btn.textContent?.includes('Add') && !btn.textContent?.includes('Location')
    );
    
    if (addExistingButton) {
      fireEvent.click(addExistingButton);
      
      await waitFor(() => {
        expect(mockAddProviderToLocation).toHaveBeenCalled();
        expect(mockToast.success).toHaveBeenCalledWith(
          'Location added',
          expect.objectContaining({
            description: 'The location has been added to your locations.',
          })
        );
      });
    }
  });

  it('should display default location badge', () => {
    render(
      <LocationManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    // Should show default badge for Main Office
    expect(screen.getByText(/Default/i)).toBeInTheDocument();
  });

  it('should handle create location error', async () => {
    mockCreateLocation.mockRejectedValue(new Error('Create failed'));
    
    render(
      <LocationManager
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    const addButton = screen.getByText(/Add Location/i);
    fireEvent.click(addButton);
    
    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Name/i);
      fireEvent.change(nameInput, { target: { value: 'New Office' } });
    });
    
    const createButton = screen.getByText(/Create Location/i);
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'Error',
        expect.objectContaining({
          description: 'Create failed',
        })
      );
    });
  });
});

