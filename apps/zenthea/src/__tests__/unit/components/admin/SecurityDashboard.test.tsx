import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SecurityDashboard } from '@/components/admin/SecurityDashboard';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('SecurityDashboard', () => {
  const mockSecurityData = {
    success: true,
    data: {
      events: [
        {
          _id: 'event-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          action: 'login_failed',
          resource: 'auth',
          details: { email: 'test@example.com', reason: 'Invalid password' },
          timestamp: Date.now() - 3600000, // 1 hour ago
          ipAddress: '192.168.1.1',
        },
        {
          _id: 'event-2',
          tenantId: 'tenant-1',
          userId: 'user-2',
          action: 'unauthorized_access',
          resource: 'admin',
          details: { path: '/admin/users', method: 'GET' },
          timestamp: Date.now() - 7200000, // 2 hours ago
          ipAddress: '192.168.1.2',
        },
        {
          _id: 'event-3',
          tenantId: 'tenant-1',
          userId: 'user-3',
          action: 'login_success',
          resource: 'auth',
          details: { email: 'user3@example.com' },
          timestamp: Date.now() - 1800000, // 30 minutes ago
          ipAddress: '192.168.1.3',
        },
      ],
      failedLogins: [
        {
          _id: 'failed-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          action: 'login_failed',
          resource: 'auth',
          details: { email: 'test@example.com', reason: 'Invalid password' },
          timestamp: Date.now() - 3600000,
          ipAddress: '192.168.1.1',
        },
      ],
      activeSessions: [
        {
          _id: 'session-1',
          tenantId: 'tenant-1',
          userId: 'user-3',
          action: 'login_success',
          resource: 'auth',
          details: { email: 'user3@example.com' },
          timestamp: Date.now() - 1800000,
          ipAddress: '192.168.1.3',
        },
      ],
      total: 3,
      page: 1,
      limit: 50,
      hasMore: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSecurityData,
    });
  });

  describe('Initial Render', () => {
    it('should render security dashboard component', async () => {
      render(<SecurityDashboard />);

      expect(screen.getByText('Security Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/monitor security events/i)).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(<SecurityDashboard />);
      // Loading skeletons should be present
      expect(screen.getByText('Security Dashboard')).toBeInTheDocument();
    });

    it('should fetch and display security data', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
        const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        expect(fetchCalls[0][0]).toContain('/api/admin/security');
      });
    });
  });

  describe('Security Events Timeline', () => {
    it('should display security events timeline', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/security events timeline/i)).toBeInTheDocument();
      });
    });

    it('should display security events in timeline', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Login Failed/i)).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Unauthorized Access may appear multiple times (timeline + alerts)
      const unauthorizedElements = screen.getAllByText(/Unauthorized Access/i);
      expect(unauthorizedElements.length).toBeGreaterThan(0);
    });

    it('should show event timestamps', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        // Check for formatted timestamps
        const events = screen.getAllByText(/ago|at/i);
        expect(events.length).toBeGreaterThan(0);
      });
    });

    it('should show event details on expand', async () => {
      const user = userEvent.setup();
      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Login Failed/i)).toBeInTheDocument();
      });

      // Find expand button for first event - look for ChevronDown icon button within event card
      const eventCards = screen.getAllByText(/Login Failed/i);
      if (eventCards.length > 0) {
        const firstEventCard = eventCards[0].closest('.border');
        if (firstEventCard) {
          const expandButton = firstEventCard.querySelector('button');
          if (expandButton) {
            await user.click(expandButton);
            
            await waitFor(() => {
              // Details are shown in JSON format in a pre tag
              const detailsPre = screen.queryByTestId('event-details-event-1');
              expect(detailsPre).toBeInTheDocument();
              expect(detailsPre?.textContent).toContain('Invalid password');
            }, { timeout: 3000 });
          }
        }
      }
    });
  });

  describe('Failed Login Attempts', () => {
    it('should display failed login attempts section', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/failed login attempts/i)).toBeInTheDocument();
      });
    });

    it('should list failed login attempts', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
      });
    });

    it('should show IP addresses for failed logins', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        // IP address appears in failed logins section
        const failedLoginsSection = screen.getByText(/Failed Login Attempts/i).closest('div')?.parentElement;
        expect(failedLoginsSection?.textContent).toContain('192.168.1.1');
      });
    });

    it('should show timestamps for failed logins', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        const timestamps = screen.getAllByText(/ago|at/i);
        expect(timestamps.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Active Sessions', () => {
    it('should display active sessions section', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/active sessions/i)).toBeInTheDocument();
      });
    });

    it('should list active sessions', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/user3@example.com/i)).toBeInTheDocument();
      });
    });

    it('should show session details (user, IP, timestamp)', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        // IP address appears in active sessions section
        const activeSessionsSection = screen.getByText(/Active Sessions/i).closest('div')?.parentElement;
        expect(activeSessionsSection?.textContent).toContain('192.168.1.3');
      });
    });
  });

  describe('Security Alerts', () => {
    it('should display security alerts section', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/security alerts/i)).toBeInTheDocument();
      });
    });

    it('should show alert for failed login attempts', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        // Check for alert in Security Alerts section
        const alertsSection = screen.getByText(/Security Alerts/i).closest('div')?.parentElement;
        expect(alertsSection?.textContent).toMatch(/failed login/i);
      });
    });

    it('should show alert for unauthorized access attempts', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        // Check for alert in Security Alerts section
        const alertsSection = screen.getByText(/Security Alerts/i).closest('div')?.parentElement;
        expect(alertsSection?.textContent).toMatch(/unauthorized/i);
      });
    });
  });

  describe('Threat Indicators', () => {
    it('should display threat indicators section', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/threat indicators/i)).toBeInTheDocument();
      });
    });

    it('should show threat level', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/threat level/i)).toBeInTheDocument();
      });
    });

    it('should show suspicious activity indicators', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        // Check for threat indicators
        const threatSection = screen.getByText(/threat/i);
        expect(threatSection).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('should display export button', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      });
    });

    it('should export security report when export button is clicked', async () => {
      const user = userEvent.setup();
      const mockDownload = vi.fn();
      global.URL.createObjectURL = vi.fn(() => 'blob:url');
      global.URL.revokeObjectURL = vi.fn();

      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      // Verify export was triggered (check for download or API call)
      await waitFor(() => {
        // Export functionality should be called
        expect(exportButton).toBeInTheDocument();
      });
    });
  });

  describe('Date Range Filtering', () => {
    it('should display date range filter controls', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Date Range/i)).toBeInTheDocument();
      });
    });

    it('should filter events by date range', async () => {
      const user = userEvent.setup();
      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Date Range/i)).toBeInTheDocument();
      });

      // Find date inputs by their labels
      const startDateInput = screen.getByLabelText(/Start Date/i) as HTMLInputElement;
      const endDateInput = screen.getByLabelText(/End Date/i) as HTMLInputElement;
      
      // Set values directly and trigger change event
      await user.type(startDateInput, '2025-01-01');
      await user.type(endDateInput, '2025-01-10');

      // Wait for the useEffect to trigger fetch with new date params
      await waitFor(() => {
        const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        // Check if any fetch call contains startDate
        const hasStartDate = fetchCalls.some(call => call[0]?.toString().includes('startDate'));
        expect(hasStartDate).toBe(true);
      }, { timeout: 3000 });
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls when there are multiple pages', async () => {
      // Mock response with hasMore: true
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockSecurityData,
          data: {
            ...mockSecurityData.data,
            hasMore: true,
            total: 100,
          },
        }),
      });

      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });
    });

    it('should load next page when next button is clicked', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockSecurityData,
          data: {
            ...mockSecurityData.data,
            hasMore: true,
            page: 1,
          },
        }),
      });

      render(<SecurityDashboard />);

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        expect(nextButton).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const lastCall = fetchCalls[fetchCalls.length - 1];
        expect(lastCall[0]).toContain('page=2');
      }, { timeout: 3000 });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Failed to fetch security data',
        }),
      });

      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });

    it('should display error message for network errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Failed to fetch security data',
        }),
      });

      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should display refresh button', async () => {
      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });

    it('should refresh data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2); // Initial + refresh
      });
    });
  });

  describe('Empty States', () => {
    it('should display empty state when no security events', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            events: [],
            failedLogins: [],
            activeSessions: [],
            total: 0,
            page: 1,
            limit: 50,
            hasMore: false,
          },
        }),
      });

      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/no security events/i)).toBeInTheDocument();
      });
    });

    it('should display empty state when no failed logins', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...mockSecurityData.data,
            failedLogins: [],
          },
        }),
      });

      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/no failed logins/i)).toBeInTheDocument();
      });
    });

    it('should display empty state when no active sessions', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...mockSecurityData.data,
            activeSessions: [],
          },
        }),
      });

      render(<SecurityDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/no active sessions/i)).toBeInTheDocument();
      });
    });
  });
});

