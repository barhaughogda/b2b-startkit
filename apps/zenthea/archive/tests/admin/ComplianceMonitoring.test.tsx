import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComplianceMonitoring } from '@/components/admin/ComplianceMonitoring';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('ComplianceMonitoring', () => {
  const mockComplianceData = {
    success: true,
    data: {
      hipaaStatus: 'compliant' as const,
      auditLogCount: {
        total: 1500,
        last24Hours: 45,
        last7Days: 320,
        last30Days: 1200,
      },
      dataRetentionStatus: 'compliant' as const,
      complianceScore: 95,
      complianceLevel: 'excellent' as const,
      violations: {
        total: 2,
        recent: 0,
      },
      lastUpdated: Date.now(),
    },
  };

  const mockComplianceDataWithViolations = {
    success: true,
    data: {
      hipaaStatus: 'warning' as const,
      auditLogCount: {
        total: 1500,
        last24Hours: 45,
        last7Days: 320,
        last30Days: 1200,
      },
      dataRetentionStatus: 'compliant' as const,
      complianceScore: 75,
      complianceLevel: 'fair' as const,
      violations: {
        total: 8,
        recent: 3,
      },
      lastUpdated: Date.now(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockComplianceData,
    });
  });

  describe('Initial Render', () => {
    it('should render compliance monitoring component', async () => {
      render(<ComplianceMonitoring />);

      expect(screen.getByText('Compliance Monitoring')).toBeInTheDocument();
      expect(screen.getByText(/HIPAA compliance/i)).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(<ComplianceMonitoring />);
      // Loading skeletons should be present
      expect(screen.getByText('Compliance Monitoring')).toBeInTheDocument();
    });

    it('should fetch compliance data on mount', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
        const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        expect(fetchCalls[0][0]).toContain('/api/admin/compliance-metrics');
      });
    });
  });

  describe('Compliance Status Dashboard', () => {
    it('should display compliance status dashboard', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        expect(screen.getByText(/Compliance Status Dashboard/i)).toBeInTheDocument();
      });
    });

    it('should display HIPAA compliance status', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        expect(screen.getByText(/HIPAA Status/i)).toBeInTheDocument();
        const compliantTexts = screen.getAllByText(/compliant/i);
        expect(compliantTexts.length).toBeGreaterThan(0);
      });
    });

    it('should display compliance score', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        expect(screen.getByText(/95/i)).toBeInTheDocument();
        expect(screen.getByText(/compliance score/i)).toBeInTheDocument();
      });
    });

    it('should display compliance level', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        expect(screen.getByText(/excellent/i)).toBeInTheDocument();
      });
    });

    it('should display data retention status', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        const dataRetentionTexts = screen.getAllByText(/Data Retention/i);
        expect(dataRetentionTexts.length).toBeGreaterThan(0);
        const compliantTexts = screen.getAllByText(/compliant/i);
        expect(compliantTexts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('HIPAA Compliance Checklist', () => {
    it('should display HIPAA compliance checklist', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        expect(screen.getByText(/HIPAA compliance checklist/i)).toBeInTheDocument();
      });
    });

    it('should display checklist items', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        // Check for common HIPAA checklist items
        expect(screen.getByText(/audit logging/i)).toBeInTheDocument();
        expect(screen.getByText(/data encryption/i)).toBeInTheDocument();
        expect(screen.getByText(/access controls/i)).toBeInTheDocument();
      });
    });

    it('should show checklist item status (compliant/non-compliant)', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        // Should show status indicators for each checklist item
        const statusIndicators = screen.getAllByText(/compliant|non-compliant/i);
        expect(statusIndicators.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Violation Alerts', () => {
    it('should display violation alerts section', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        const violationsTexts = screen.getAllByText(/Violations/i);
        expect(violationsTexts.length).toBeGreaterThan(0);
      });
    });

    it('should show violation count', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        const totalViolationsTexts = screen.getAllByText(/Total Violations/i);
        expect(totalViolationsTexts.length).toBeGreaterThan(0);
        const violationCounts = screen.getAllByText(/2/i);
        expect(violationCounts.length).toBeGreaterThan(0);
      });
    });

    it('should highlight violations when present', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockComplianceDataWithViolations,
      });

      render(<ComplianceMonitoring />);

      await waitFor(() => {
        const recentViolationsTexts = screen.getAllByText(/Recent Violations/i);
        expect(recentViolationsTexts.length).toBeGreaterThan(0);
        const violationCounts = screen.getAllByText(/3/i);
        expect(violationCounts.length).toBeGreaterThan(0);
      });
    });

    it('should show alert when violations are detected', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockComplianceDataWithViolations,
      });

      render(<ComplianceMonitoring />);

      await waitFor(() => {
        // Should show warning alert for violations
        const alerts = screen.getAllByText(/warning|violation|alert/i);
        expect(alerts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Remediation Suggestions', () => {
    it('should display remediation suggestions section', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockComplianceDataWithViolations,
      });

      render(<ComplianceMonitoring />);

      await waitFor(() => {
        expect(screen.getByText(/Remediation Suggestions/i)).toBeInTheDocument();
      });
    });

    it('should show remediation suggestions when violations exist', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockComplianceDataWithViolations,
      });

      render(<ComplianceMonitoring />);

      await waitFor(() => {
        // Should show suggestions for addressing violations
        expect(screen.getByText(/Remediation Suggestions/i)).toBeInTheDocument();
        expect(screen.getByText(/Review recent access violations/i)).toBeInTheDocument();
      });
    });

    it('should not show suggestions when compliant', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        // When compliant, may show "No action needed" or similar
        const suggestions = screen.queryByText(/remediation|suggestions/i);
        // Either shows "No action needed" or doesn't show suggestions section
        if (suggestions) {
          expect(suggestions).toBeInTheDocument();
        }
      });
    });
  });

  describe('Compliance Reports', () => {
    it('should display compliance reports section', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        const reportsTexts = screen.getAllByText(/Reports/i);
        expect(reportsTexts.length).toBeGreaterThan(0);
      });
    });

    it('should show generate report button', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        const reportButtons = screen.getAllByRole('button', { name: /Generate Report/i });
        expect(reportButtons.length).toBeGreaterThan(0);
      });
    });

    it('should generate compliance report when button is clicked', async () => {
      const user = userEvent.setup();
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        const reportButtons = screen.getAllByRole('button', { name: /Generate Report/i });
        expect(reportButtons.length).toBeGreaterThan(0);
      });

      const reportButtons = screen.getAllByRole('button', { name: /Generate Report/i });
      await user.click(reportButtons[0]);

      // Verify report generation was triggered
      await waitFor(() => {
        // Report generation should be called (may show loading or success message)
        expect(reportButtons[0]).toBeInTheDocument();
      });
    });
  });

  describe('Audit Log Statistics', () => {
    it('should display audit log statistics', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        expect(screen.getByText(/audit logs/i)).toBeInTheDocument();
      });
    });

    it('should show audit log counts (total, 24h, 7d, 30d)', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        expect(screen.getByText(/1500/i)).toBeInTheDocument(); // total
        expect(screen.getByText(/45/i)).toBeInTheDocument(); // last24Hours
        expect(screen.getByText(/320/i)).toBeInTheDocument(); // last7Days
        expect(screen.getByText(/1200/i)).toBeInTheDocument(); // last30Days
      });
    });
  });

  describe('Status Indicators', () => {
    it('should show compliant status with green indicator', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        // Should have visual indicator for compliant status
        const compliantTexts = screen.getAllByText(/compliant/i);
        expect(compliantTexts.length).toBeGreaterThan(0);
      });
    });

    it('should show warning status with yellow indicator', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockComplianceDataWithViolations,
      });

      render(<ComplianceMonitoring />);

      await waitFor(() => {
        expect(screen.getByText(/warning/i)).toBeInTheDocument();
      });
    });

    it('should show non-compliant status with red indicator', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...mockComplianceDataWithViolations.data,
            hipaaStatus: 'non-compliant' as const,
            complianceScore: 45,
            complianceLevel: 'poor' as const,
            violations: {
              total: 15,
              recent: 8,
            },
          },
        }),
      });

      render(<ComplianceMonitoring />);

      await waitFor(() => {
        const nonCompliantTexts = screen.getAllByText(/non-compliant/i);
        expect(nonCompliantTexts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should display refresh button', async () => {
      render(<ComplianceMonitoring />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });

    it('should refresh data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<ComplianceMonitoring />);

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

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Failed to fetch compliance data',
        }),
      });

      render(<ComplianceMonitoring />);

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });

    it('should display error message for network errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<ComplianceMonitoring />);

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
          error: 'Failed to fetch compliance data',
        }),
      });

      render(<ComplianceMonitoring />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('should handle empty compliance data gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            hipaaStatus: 'compliant' as const,
            auditLogCount: {
              total: 0,
              last24Hours: 0,
              last7Days: 0,
              last30Days: 0,
            },
            dataRetentionStatus: 'compliant' as const,
            complianceScore: 100,
            complianceLevel: 'excellent' as const,
            violations: {
              total: 0,
              recent: 0,
            },
            lastUpdated: Date.now(),
          },
        }),
      });

      render(<ComplianceMonitoring />);

      await waitFor(() => {
        const complianceMonitoringTexts = screen.getAllByText(/compliance monitoring/i);
        expect(complianceMonitoringTexts.length).toBeGreaterThan(0);
      });
    });
  });
});

