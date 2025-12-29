/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-wrapper';
import { useQuery, useMutation } from 'convex/react';
import { CalendarSyncSettings } from '@/components/provider/CalendarSyncSettings';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';

// Mock window.location
const mockLocation = {
  origin: 'http://localhost:3000',
  href: '',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, disabled }: any) => (
    <select 
      data-testid="select"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      disabled={disabled}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

const mockUseQuery = useQuery as any;
const mockUseMutation = useMutation as any;
const mockToast = toast as any;

describe('CalendarSyncSettings', () => {
  const mockProviderId = 'provider-123' as Id<'providers'>;
  const mockTenantId = 'tenant-123';

  const mockConnectedSync = {
    _id: 'sync-1' as Id<'calendarSync'>,
    syncType: 'google' as const,
    isConnected: true,
    syncDirection: 'bidirectional' as const,
    lastSyncAt: new Date('2024-01-15T10:00:00').getTime(),
    calendarId: 'primary',
  };

  const mockDisconnectedSync = {
    _id: 'sync-2' as Id<'calendarSync'>,
    syncType: 'microsoft' as const,
    isConnected: false,
    syncDirection: 'outbound-only' as const,
  };

  const mockSyncStatuses = [mockConnectedSync, mockDisconnectedSync];

  const mockUpdateSyncSettings = vi.fn();
  const mockDisconnectCalendar = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
    
    mockUseQuery.mockImplementation((queryFn: any, args: any) => {
      if (args === 'skip') return undefined;
      if (queryFn === api.calendarSync.getSyncStatus) {
        return mockSyncStatuses;
      }
      return undefined;
    });

    mockUseMutation.mockImplementation((mutationFn: any) => {
      if (mutationFn === api.calendarSync.updateSyncSettings) {
        return mockUpdateSyncSettings;
      }
      if (mutationFn === api.calendarSync.disconnectCalendar) {
        return mockDisconnectCalendar;
      }
      return vi.fn();
    });

    mockUpdateSyncSettings.mockResolvedValue(undefined);
    mockDisconnectCalendar.mockResolvedValue(undefined);
  });

  it('should render calendar sync settings', () => {
    render(
      <CalendarSyncSettings
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    expect(screen.getByText('Calendar Sync')).toBeInTheDocument();
    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
  });

  it('should display connected status for Google Calendar', () => {
    render(
      <CalendarSyncSettings
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should display not connected status for Microsoft', () => {
    render(
      <CalendarSyncSettings
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    expect(screen.getByText('Not Connected')).toBeInTheDocument();
  });

  it('should redirect to OAuth when connecting Google Calendar', () => {
    render(
      <CalendarSyncSettings
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    // Find connect button (should be for Microsoft since Google is connected)
    const connectButtons = screen.getAllByText(/Connect/i);
    if (connectButtons.length > 0) {
      fireEvent.click(connectButtons[0]);
    }
    
    // Should redirect to OAuth URL
    expect(mockLocation.href).toContain('/api/auth/google-calendar');
  });

  it('should disconnect calendar', async () => {
    render(
      <CalendarSyncSettings
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    const disconnectButtons = screen.getAllByText(/Disconnect/i);
    if (disconnectButtons.length > 0) {
      fireEvent.click(disconnectButtons[0]);
    }
    
    await waitFor(() => {
      expect(mockDisconnectCalendar).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        'Calendar disconnected',
        expect.objectContaining({
          description: 'The calendar sync has been disconnected successfully.',
        })
      );
    });
  });

  it('should update sync direction', async () => {
    render(
      <CalendarSyncSettings
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    // Find sync direction select
    const selects = screen.getAllByTestId('select');
    const syncDirectionSelect = selects.find(select => 
      select.querySelector('option[value="bidirectional"]') ||
      select.querySelector('option[value="outbound-only"]')
    );
    
    if (syncDirectionSelect) {
      fireEvent.change(syncDirectionSelect, { target: { value: 'outbound-only' } });
    }
    
    await waitFor(() => {
      expect(mockUpdateSyncSettings).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        'Settings updated',
        expect.objectContaining({
          description: 'Sync direction has been updated successfully.',
        })
      );
    });
  });

  it('should display last sync time', () => {
    render(
      <CalendarSyncSettings
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    expect(screen.getByText(/Last Sync/i)).toBeInTheDocument();
  });

  it('should display calendar ID', () => {
    render(
      <CalendarSyncSettings
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    expect(screen.getByText(/Calendar ID/i)).toBeInTheDocument();
    expect(screen.getByText('primary')).toBeInTheDocument();
  });

  it('should handle disconnect error', async () => {
    mockDisconnectCalendar.mockRejectedValue(new Error('Disconnect failed'));
    
    render(
      <CalendarSyncSettings
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    const disconnectButtons = screen.getAllByText(/Disconnect/i);
    if (disconnectButtons.length > 0) {
      fireEvent.click(disconnectButtons[0]);
    }
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'Error',
        expect.objectContaining({
          description: 'Disconnect failed',
        })
      );
    });
  });

  it('should handle update sync direction error', async () => {
    mockUpdateSyncSettings.mockRejectedValue(new Error('Update failed'));
    
    render(
      <CalendarSyncSettings
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    const selects = screen.getAllByTestId('select');
    const syncDirectionSelect = selects.find(select => 
      select.querySelector('option[value="outbound-only"]')
    );
    
    if (syncDirectionSelect) {
      fireEvent.change(syncDirectionSelect, { target: { value: 'outbound-only' } });
    }
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'Error',
        expect.objectContaining({
          description: 'Update failed',
        })
      );
    });
  });

  it('should show placeholder for Microsoft and Apple calendars', () => {
    render(
      <CalendarSyncSettings
        providerId={mockProviderId}
        tenantId={mockTenantId}
      />
    );
    
    // Should show Microsoft and Apple calendar cards
    expect(screen.getByText(/Microsoft Outlook/i)).toBeInTheDocument();
    expect(screen.getByText(/Apple Calendar/i)).toBeInTheDocument();
  });
});

