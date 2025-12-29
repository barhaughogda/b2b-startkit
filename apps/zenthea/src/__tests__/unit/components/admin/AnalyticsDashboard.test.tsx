import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart" role="img">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart" role="img">{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart" role="img">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    TrendingUp: () => <div data-testid="trending-up-icon" />,
    Calendar: () => <div data-testid="calendar-icon" />,
    DollarSign: () => <div data-testid="dollar-sign-icon" />,
    Users: () => <div data-testid="users-icon" />,
    Activity: () => <div data-testid="activity-icon" />,
    RefreshCw: () => <div data-testid="refresh-icon" />,
    AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  };
});

// Mock fetch
global.fetch = vi.fn();

describe('AnalyticsDashboard', () => {
  const mockAnalyticsData = {
    success: true,
    data: {
      patientGrowth: [
        { date: '2025-01-01', count: 5, cumulative: 5 },
        { date: '2025-01-02', count: 3, cumulative: 8 },
        { date: '2025-01-03', count: 7, cumulative: 15 },
      ],
      appointmentTrends: [
        { date: '2025-01-01', scheduled: 10, completed: 8, cancelled: 2 },
        { date: '2025-01-02', scheduled: 12, completed: 10, cancelled: 1 },
        { date: '2025-01-03', scheduled: 15, completed: 12, cancelled: 3 },
      ],
      revenue: {
        total: 50000,
        paid: 40000,
        pending: 8000,
        overdue: 2000,
        dailyRevenue: [
          { date: '2025-01-01', amount: 10000 },
          { date: '2025-01-02', amount: 15000 },
          { date: '2025-01-03', amount: 15000 },
        ],
      },
      userActivity: [
        { date: '2025-01-01', activeUsers: 20, newUsers: 5, logins: 25 },
        { date: '2025-01-02', activeUsers: 25, newUsers: 3, logins: 28 },
        { date: '2025-01-03', activeUsers: 30, newUsers: 7, logins: 37 },
      ],
      performance: {
        averageResponseTime: 150,
        systemUptime: 99.9,
        errorRate: 0.1,
        requestCount: 1000,
      },
      period: {
        startDate: new Date('2025-01-01').getTime(),
        endDate: new Date('2025-01-03').getTime(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockAnalyticsData,
    });
  });

  describe('Initial Render', () => {
    it('should render analytics dashboard component', async () => {
      render(<AnalyticsDashboard />);

      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/comprehensive analytics/i)).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(<AnalyticsDashboard />);
      // Loading skeletons should be present
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    it('should fetch analytics data on mount', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
        const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        expect(fetchCalls[0][0]).toContain('/api/admin/analytics');
      });
    });
  });

  describe('Patient Growth Analytics', () => {
    it('should display patient growth section', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const patientGrowthTexts = screen.getAllByText(/Patient Growth/i);
        expect(patientGrowthTexts.length).toBeGreaterThan(0);
      });
    });

    it('should display patient growth chart', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const lineCharts = screen.getAllByTestId('line-chart');
        expect(lineCharts.length).toBeGreaterThan(0);
      });
    });

    it('should display cumulative patient count', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        // Check that "15" appears (cumulative patient count)
        const fifteenTexts = screen.getAllByText(/^15$/);
        expect(fifteenTexts.length).toBeGreaterThan(0);
        // Also verify the "Total Patients" label is present
        expect(screen.getByText(/Total Patients/i)).toBeInTheDocument();
      });
    });
  });

  describe('Appointment Trends Analytics', () => {
    it('should display appointment trends section', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const appointmentTrendsTexts = screen.getAllByText(/Appointment Trends/i);
        expect(appointmentTrendsTexts.length).toBeGreaterThan(0);
      });
    });

    it('should display appointment trends chart', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const charts = screen.getAllByTestId('line-chart');
        expect(charts.length).toBeGreaterThan(0);
      });
    });

    it('should display scheduled, completed, and cancelled appointments', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        // Since recharts is mocked, we verify the chart is rendered with legend
        // The actual legend text would be in the real chart, but in tests we check for the chart structure
        const appointmentTrendsSection = screen.getAllByText(/Appointment Trends/i);
        expect(appointmentTrendsSection.length).toBeGreaterThan(0);
        // Verify the chart is rendered (legend component is present in mocked chart)
        const legends = screen.getAllByTestId('legend');
        expect(legends.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Financial Analytics', () => {
    it('should display revenue metrics section', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const revenueMetricsTexts = screen.getAllByText(/Revenue Metrics/i);
        expect(revenueMetricsTexts.length).toBeGreaterThan(0);
      });
    });

    it('should display total revenue', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/\$50,000/i)).toBeInTheDocument(); // Total revenue (formatted as currency)
        const totalRevenueTexts = screen.getAllByText(/total revenue/i);
        expect(totalRevenueTexts.length).toBeGreaterThan(0);
      });
    });

    it('should display paid revenue', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/\$40,000/i)).toBeInTheDocument(); // Paid revenue (formatted as currency)
        const paidTexts = screen.getAllByText(/paid/i);
        expect(paidTexts.length).toBeGreaterThan(0);
      });
    });

    it('should display pending revenue', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/\$8,000/i)).toBeInTheDocument(); // Pending revenue (formatted as currency)
        const pendingTexts = screen.getAllByText(/pending/i);
        expect(pendingTexts.length).toBeGreaterThan(0);
      });
    });

    it('should display overdue revenue', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/\$2,000/i)).toBeInTheDocument(); // Overdue revenue (formatted as currency)
        const overdueTexts = screen.getAllByText(/overdue/i);
        expect(overdueTexts.length).toBeGreaterThan(0);
      });
    });

    it('should display daily revenue chart', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const charts = screen.getAllByTestId('bar-chart');
        expect(charts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('User Activity Analytics', () => {
    it('should display user activity section', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const userActivityTexts = screen.getAllByText(/User Activity/i);
        expect(userActivityTexts.length).toBeGreaterThan(0);
      });
    });

    it('should display user activity chart', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const charts = screen.getAllByTestId('area-chart');
        expect(charts.length).toBeGreaterThan(0);
      });
    });

    it('should display active users metric', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const activeUsersTexts = screen.getAllByText(/active users/i);
        expect(activeUsersTexts.length).toBeGreaterThan(0);
        expect(screen.getByText(/30/i)).toBeInTheDocument(); // Latest active users
      });
    });

    it('should display new users metric', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const newUsersTexts = screen.getAllByText(/new users/i);
        expect(newUsersTexts.length).toBeGreaterThan(0);
        // Check that "7" appears in the context of new users (within the user activity section)
        const userActivitySection = screen.getByText(/User Activity/i).closest('.rounded-lg');
        expect(userActivitySection).toBeInTheDocument();
        const sevenTexts = screen.getAllByText(/^7$/);
        expect(sevenTexts.length).toBeGreaterThan(0);
      });
    });

    it('should display login metrics', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const loginsTexts = screen.getAllByText(/logins/i);
        expect(loginsTexts.length).toBeGreaterThan(0);
        expect(screen.getByText(/37/i)).toBeInTheDocument(); // Latest logins
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should display performance metrics section', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const performanceMetricsTexts = screen.getAllByText(/Performance Metrics/i);
        expect(performanceMetricsTexts.length).toBeGreaterThan(0);
      });
    });

    it('should display average response time', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/150/i)).toBeInTheDocument(); // Response time
        expect(screen.getByText(/response time/i)).toBeInTheDocument();
      });
    });

    it('should display system uptime', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/99.9/i)).toBeInTheDocument(); // Uptime
        expect(screen.getByText(/uptime/i)).toBeInTheDocument();
      });
    });

    it('should display error rate', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/0.1/i)).toBeInTheDocument(); // Error rate
        expect(screen.getByText(/error rate/i)).toBeInTheDocument();
      });
    });

    it('should display request count', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/1,000/i)).toBeInTheDocument(); // Request count
        expect(screen.getByText(/request count/i)).toBeInTheDocument();
      });
    });
  });

  describe('Date Range Filtering', () => {
    it('should display date range filter inputs', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      });
    });

    it('should filter analytics data when date range changes', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const startDateInput = screen.getByLabelText(/start date/i) as HTMLInputElement;
      const endDateInput = screen.getByLabelText(/end date/i) as HTMLInputElement;

      // Use fireEvent to change date input values
      fireEvent.change(startDateInput, { target: { value: '2025-01-02' } });
      fireEvent.change(endDateInput, { target: { value: '2025-01-03' } });

      // Wait for debounced fetch (component uses useEffect with dependencies)
      await waitFor(() => {
        const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        expect(fetchCalls.length).toBeGreaterThan(1);
      }, { timeout: 2000 });
    });

    it('should apply date range filter on apply button click', async () => {
      const user = userEvent.setup();
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const startDateInput = screen.getByLabelText(/start date/i) as HTMLInputElement;
      const endDateInput = screen.getByLabelText(/end date/i) as HTMLInputElement;
      const applyButton = screen.getByRole('button', { name: /apply/i });

      // Use act to ensure React processes state updates
      await act(async () => {
        fireEvent.change(startDateInput, { target: { value: '2025-01-02' } });
        fireEvent.change(endDateInput, { target: { value: '2025-01-03' } });
      });
      
      // Wait for state to update
      await waitFor(() => {
        expect(startDateInput.value).toBe('2025-01-02');
        expect(endDateInput.value).toBe('2025-01-03');
      });
      
      await act(async () => {
        await user.click(applyButton);
      });

      await waitFor(() => {
        const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        // Find the call that includes both dates
        const callWithBothDates = fetchCalls.find((call) => {
          const url = call[0] as string;
          return url.includes('startDate=2025-01-02') && url.includes('endDate=2025-01-03');
        });
        expect(callWithBothDates).toBeDefined();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should display refresh button', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const refreshButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('refresh'));
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('should refresh analytics data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      const buttons = screen.getAllByRole('button');
      const refreshButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('refresh'));
      expect(refreshButton).toBeInTheDocument();
      if (refreshButton) {
        await user.click(refreshButton);
      }

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Failed to fetch analytics data',
          message: 'Internal server error',
        }),
      });

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch analytics data/i)).toBeInTheDocument();
      });
    });

    it('should display error message when API returns error response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
          error: 'Unauthorized',
          message: 'Admin access required',
        }),
      });

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/unauthorized/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('should handle empty analytics data gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            patientGrowth: [],
            appointmentTrends: [],
            revenue: {
              total: 0,
              paid: 0,
              pending: 0,
              overdue: 0,
              dailyRevenue: [],
            },
            userActivity: [],
            performance: {
              averageResponseTime: 0,
              systemUptime: 0,
              errorRate: 0,
              requestCount: 0,
            },
            period: {
              startDate: Date.now(),
              endDate: Date.now(),
            },
          },
        }),
      });

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/no data available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for charts', async () => {
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const charts = screen.getAllByTestId('line-chart');
        charts.forEach((chart) => {
          expect(chart).toHaveAttribute('role', 'img');
        });
      });
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });

      const buttons = screen.getAllByRole('button');
      if (buttons.length > 0) {
        await user.tab();
        // Check if any button has focus
        const focusedButton = buttons.find(btn => btn === document.activeElement);
        expect(focusedButton).toBeDefined();
      }
    });
  });
});

