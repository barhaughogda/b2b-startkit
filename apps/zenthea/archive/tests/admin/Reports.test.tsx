import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Reports } from '@/components/admin/Reports';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    FileText: () => <div data-testid="file-text-icon" />,
    Download: () => <div data-testid="download-icon" />,
    Calendar: () => <div data-testid="calendar-icon" />,
    RefreshCw: () => <div data-testid="refresh-icon" />,
    AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
    CheckCircle2: () => <div data-testid="check-circle-icon" />,
  };
});

// Mock date-fns format
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    format: (date: Date, formatStr: string) => {
      if (formatStr === 'PPP') {
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      return actual.format(date, formatStr);
    },
  };
});

// Mock Radix UI Portal to avoid createRoot issues
vi.mock('@radix-ui/react-popover', () => {
  const React = require('react');
  
  return {
    Root: ({ children }: { children: React.ReactNode }) => {
      const [open, setOpen] = React.useState(false);
      
      return (
        <div data-testid="popover-root" data-open={open}>
          {React.Children.map(children, (child: any) => {
            // Handle Trigger
            if (child?.type?.displayName === 'Trigger' || child?.props?.asChild) {
              const triggerChild = child.props?.children || child.props?.children;
              if (React.isValidElement(triggerChild)) {
                return React.cloneElement(triggerChild, {
                  onClick: (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(!open);
                    triggerChild.props?.onClick?.(e);
                  },
                });
              }
              return child;
            }
            
            // Handle Content
            if (child?.type?.displayName === 'Content' || 
                (child?.props?.className && typeof child.props.className === 'string' && child.props.className.includes('w-auto'))) {
              if (!open) return null;
              
              return (
                <div data-testid="popover-content" {...child.props}>
                  {React.Children.map(child.props.children, (content: any) => {
                    if (content?.props?.['data-testid'] === 'calendar') {
                      return React.cloneElement(content, {
                        children: React.Children.map(content.props.children, (btn: any) => {
                          if (btn?.props?.['data-testid']?.startsWith('calendar-date-')) {
                            return React.cloneElement(btn, {
                              onClick: (e: React.MouseEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                btn.props.onClick?.(e);
                                setTimeout(() => setOpen(false), 0);
                              },
                            });
                          }
                          return btn;
                        }),
                      });
                    }
                    return content;
                  })}
                </div>
              );
            }
            
            return child;
          })}
        </div>
      );
    },
    Trigger: ({ children, asChild, ...props }: any) => {
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, { ...props });
      }
      return <button {...props}>{children}</button>;
    },
    Content: ({ children, ...props }: any) => {
      return <div {...props}>{children}</div>;
    },
    Portal: ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    },
    Anchor: ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    },
  };
});

// Mock Popover component wrapper
vi.mock('@/components/ui/popover', async () => {
  const actual = await vi.importActual('@radix-ui/react-popover');
  return {
    Popover: actual.Root,
    PopoverTrigger: actual.Trigger,
    PopoverContent: ({ children, ...props }: any) => {
      const React = require('react');
      return (
        <actual.Portal>
          <actual.Content {...props}>{children}</actual.Content>
        </actual.Portal>
      );
    },
    PopoverAnchor: actual.Anchor,
  };
});

// Mock Calendar component
vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ selected, onSelect, disabled, ...props }: any) => {
    const handleDateClick = (date: Date) => {
      if (disabled && typeof disabled === 'function' && disabled(date)) {
        return;
      }
      onSelect?.(date);
    };

    // Generate test dates
    const testDate1 = new Date('2025-01-01T00:00:00.000Z');
    const testDate2 = new Date('2025-01-31T00:00:00.000Z');
    const testDate3 = new Date('2025-01-15T00:00:00.000Z');

    return (
      <div data-testid="calendar" {...props}>
        <button
          type="button"
          data-testid="calendar-date-2025-01-01"
          onClick={() => handleDateClick(testDate1)}
          disabled={disabled && typeof disabled === 'function' && disabled(testDate1)}
          aria-label="January 1, 2025"
        >
          Jan 1, 2025
        </button>
        <button
          type="button"
          data-testid="calendar-date-2025-01-15"
          onClick={() => handleDateClick(testDate3)}
          disabled={disabled && typeof disabled === 'function' && disabled(testDate3)}
          aria-label="January 15, 2025"
        >
          Jan 15, 2025
        </button>
        <button
          type="button"
          data-testid="calendar-date-2025-01-31"
          onClick={() => handleDateClick(testDate2)}
          disabled={disabled && typeof disabled === 'function' && disabled(testDate2)}
          aria-label="January 31, 2025"
        >
          Jan 31, 2025
        </button>
      </div>
    );
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('Reports Component', () => {
  const mockReportData = {
    success: true,
    data: {
      type: 'csv',
      data: 'report_id,type,description,date\n1,user_activity,User login,2025-01-10',
      filename: 'user-activity-report-2025-01-10.csv',
      generatedAt: Date.now(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
    // Reset fetch mock to return a default response
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: 'Not found' }),
    } as Response);
  });

  describe('Component Rendering', () => {
    it('should render the Reports component with title and description', () => {
      render(<Reports />);
      
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.getByText(/Generate and export reports/i)).toBeInTheDocument();
    });

    it('should render report type selection dropdown', () => {
      render(<Reports />);
      
      const reportTypeSelect = screen.getByRole('combobox', { name: /report type/i });
      expect(reportTypeSelect).toBeInTheDocument();
    });

    it('should render date range inputs', () => {
      render(<Reports />);
      
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    });

    it('should render generate report button', () => {
      render(<Reports />);
      
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      expect(generateButton).toBeInTheDocument();
    });

    it('should render export format selection (PDF/CSV)', () => {
      render(<Reports />);
      
      const exportFormatSelect = screen.getByRole('combobox', { name: /export format/i });
      expect(exportFormatSelect).toBeInTheDocument();
    });
  });

  describe('Report Type Selection', () => {
    it('should display all available report types', async () => {
      const user = userEvent.setup();
      render(<Reports />);
      
      const reportTypeSelect = screen.getByRole('combobox', { name: /report type/i });
      await user.click(reportTypeSelect);
      
      await waitFor(() => {
        // Check for options in the dropdown (not the selected value)
        const options = screen.getAllByText(/User Activity|Compliance|Financial|Security/i);
        expect(options.length).toBeGreaterThan(0);
      });
      
      // Verify all options are present by checking for unique text
      expect(screen.getByText('Compliance')).toBeInTheDocument();
      expect(screen.getByText('Financial')).toBeInTheDocument();
      expect(screen.getByText('Security')).toBeInTheDocument();
    });

    it('should allow selecting a report type', async () => {
      const user = userEvent.setup();
      render(<Reports />);
      
      const reportTypeSelect = screen.getByRole('combobox', { name: /report type/i });
      await user.click(reportTypeSelect);
      
      await waitFor(() => {
        const complianceOption = screen.getByRole('option', { name: /compliance/i });
        expect(complianceOption).toBeInTheDocument();
      });
      
      const complianceOption = screen.getByRole('option', { name: /compliance/i });
      await user.click(complianceOption);
      
      await waitFor(() => {
        expect(reportTypeSelect).toHaveTextContent('Compliance');
      });
    });

    it('should default to first report type', () => {
      render(<Reports />);
      
      const reportTypeSelect = screen.getByRole('combobox', { name: /report type/i });
      expect(reportTypeSelect).toHaveTextContent('User Activity');
    });
  });

  describe('Date Range Selection', () => {
    it('should allow selecting start date', async () => {
      const user = userEvent.setup();
      render(<Reports />);
      
      // Click the start date button to open popover
      const startDateButton = screen.getByLabelText(/start date/i);
      await user.click(startDateButton);
      
      // Wait for calendar to appear and click a date
      await waitFor(() => {
        expect(screen.getByTestId('calendar')).toBeInTheDocument();
      });
      
      const dateButton = screen.getByTestId('calendar-date-2025-01-01');
      await user.click(dateButton);
      
      // Verify the date was selected (button text should change)
      await waitFor(() => {
        expect(startDateButton).not.toHaveTextContent('Pick a start date');
      });
    });

    it('should allow selecting end date', async () => {
      const user = userEvent.setup();
      render(<Reports />);
      
      // Click the end date button to open popover
      const endDateButton = screen.getByLabelText(/end date/i);
      await user.click(endDateButton);
      
      // Wait for calendar to appear and click a date
      await waitFor(() => {
        expect(screen.getByTestId('calendar')).toBeInTheDocument();
      });
      
      const dateButton = screen.getByTestId('calendar-date-2025-01-31');
      await user.click(dateButton);
      
      // Verify the date was selected (button text should change)
      await waitFor(() => {
        expect(endDateButton).not.toHaveTextContent('Pick an end date');
      });
    });

    it('should validate that end date is after start date', async () => {
      const user = userEvent.setup();
      render(<Reports />);
      
      // Select start date (Jan 31)
      const startDateButton = screen.getByLabelText(/start date/i);
      await user.click(startDateButton);
      await waitFor(() => {
        expect(screen.getByTestId('calendar')).toBeInTheDocument();
      });
      const startDate = screen.getByTestId('calendar-date-2025-01-31');
      await user.click(startDate);
      
      // Wait for popover to close and state to update
      await waitFor(() => {
        expect(screen.queryByTestId('calendar')).not.toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Verify start date was set
      await waitFor(() => {
        expect(startDateButton).not.toHaveTextContent('Pick a start date');
      });
      
      // Select end date (Jan 1) - should be invalid
      const endDateButton = screen.getByLabelText(/end date/i);
      await user.click(endDateButton);
      await waitFor(() => {
        expect(screen.getByTestId('calendar')).toBeInTheDocument();
      });
      const endDate = screen.getByTestId('calendar-date-2025-01-01');
      await user.click(endDate);
      
      // Wait for popover to close
      await waitFor(() => {
        expect(screen.queryByTestId('calendar')).not.toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Try to generate report - should show validation error
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Report Generation', () => {
    it('should call API when generate button is clicked', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportData,
      });

      render(<Reports />);
      
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/reports'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });

    it('should send correct request body with report type and date range', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportData,
      });

      render(<Reports />);
      
      // Select report type
      const reportTypeSelect = screen.getByRole('combobox', { name: /report type/i });
      await user.click(reportTypeSelect);
      
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /compliance/i })).toBeInTheDocument();
      });
      
      const complianceOption = screen.getByRole('option', { name: /compliance/i });
      await user.click(complianceOption);
      
      // Set start date
      const startDateButton = screen.getByLabelText(/start date/i);
      await user.click(startDateButton);
      await waitFor(() => {
        expect(screen.getByTestId('calendar')).toBeInTheDocument();
      });
      const startDate = screen.getByTestId('calendar-date-2025-01-01');
      await user.click(startDate);
      await waitFor(() => {
        expect(screen.queryByTestId('calendar')).not.toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Verify start date was set
      await waitFor(() => {
        expect(startDateButton).not.toHaveTextContent('Pick a start date');
      });
      
      // Set end date
      const endDateButton = screen.getByLabelText(/end date/i);
      await user.click(endDateButton);
      await waitFor(() => {
        expect(screen.getByTestId('calendar')).toBeInTheDocument();
      });
      const endDate = screen.getByTestId('calendar-date-2025-01-31');
      await user.click(endDate);
      await waitFor(() => {
        expect(screen.queryByTestId('calendar')).not.toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Verify end date was set
      await waitFor(() => {
        expect(endDateButton).not.toHaveTextContent('Pick an end date');
      });
      
      // Generate report
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              reportType: 'compliance',
              dateRange: {
                startDate: '2025-01-01',
                endDate: '2025-01-31',
              },
              exportFormat: 'csv',
            }),
          })
        );
      });
    });

    it('should show loading state while generating report', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: async () => mockReportData,
        }), 100))
      );

      render(<Reports />);
      
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      expect(screen.getByText(/generating report/i)).toBeInTheDocument();
    });

    it('should display generated report preview', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportData,
      });

      render(<Reports />);
      
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/report generated successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/user-activity-report-2025-01-10.csv/i)).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Failed to generate report',
          message: 'Server error occurred',
        }),
      });

      render(<Reports />);
      
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to generate report/i)).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('should allow selecting PDF export format', async () => {
      const user = userEvent.setup();
      render(<Reports />);
      
      const exportFormatSelect = screen.getByRole('combobox', { name: /export format/i });
      await user.click(exportFormatSelect);
      
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^pdf$/i })).toBeInTheDocument();
      });
      
      const pdfOption = screen.getByRole('option', { name: /^pdf$/i });
      await user.click(pdfOption);
      
      await waitFor(() => {
        expect(exportFormatSelect).toHaveTextContent('PDF');
      });
    });

    it('should allow selecting CSV export format', async () => {
      const user = userEvent.setup();
      render(<Reports />);
      
      const exportFormatSelect = screen.getByRole('combobox', { name: /export format/i });
      await user.click(exportFormatSelect);
      
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^csv$/i })).toBeInTheDocument();
      });
      
      const csvOption = screen.getByRole('option', { name: /^csv$/i });
      await user.click(csvOption);
      
      await waitFor(() => {
        expect(exportFormatSelect).toHaveTextContent('CSV');
      });
    });

    it('should include export format in API request', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportData,
      });

      render(<Reports />);
      
      // Select PDF format
      const exportFormatSelect = screen.getByRole('combobox', { name: /export format/i });
      await user.click(exportFormatSelect);
      
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^pdf$/i })).toBeInTheDocument();
      });
      
      const pdfOption = screen.getByRole('option', { name: /^pdf$/i });
      await user.click(pdfOption);
      
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      await waitFor(() => {
        const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);
        expect(requestBody.exportFormat).toBe('pdf');
      });
    });

    it('should show download button after report generation', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportData,
      });

      render(<Reports />);
      
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      await waitFor(() => {
        const downloadButton = screen.getByRole('button', { name: /download/i });
        expect(downloadButton).toBeInTheDocument();
      });
    });

    it('should trigger download when download button is clicked', async () => {
      const user = userEvent.setup();
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;
      
      // Mock anchor click
      const mockClick = vi.fn();
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
      };
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return mockAnchor as any;
        }
        return originalCreateElement(tagName);
      });
      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
      vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockReportData,
          data: {
            ...mockReportData.data,
            type: 'csv',
            data: btoa('report_id,type,description,date\n1,user_activity,User login,2025-01-10'),
          },
        }),
      });

      render(<Reports />);
      
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      await waitFor(() => {
        const downloadButton = screen.getByRole('button', { name: /download/i });
        expect(downloadButton).toBeInTheDocument();
      });

      const downloadButton = screen.getByRole('button', { name: /download/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(mockClick).toHaveBeenCalled();
      });
    });
  });

  describe('Report Preview', () => {
    it('should display report preview section', () => {
      render(<Reports />);
      
      expect(screen.getByText(/report preview/i)).toBeInTheDocument();
    });

    it('should show empty state when no report is generated', () => {
      render(<Reports />);
      
      expect(screen.getByText(/no report generated yet/i)).toBeInTheDocument();
    });

    it('should display report data in preview after generation', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportData,
      });

      render(<Reports />);
      
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/report preview/i)).toBeInTheDocument();
        expect(screen.queryByText(/no report generated yet/i)).not.toBeInTheDocument();
      });
    });

    it('should display report metadata (filename, generated date)', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportData,
      });

      render(<Reports />);
      
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/user-activity-report-2025-01-10.csv/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API request fails', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<Reports />);
      
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should allow retrying after error', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockReportData,
        });

      render(<Reports />);
      
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/report generated successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on form inputs', () => {
      const { container } = render(<Reports />);
      
      expect(screen.getByRole('combobox', { name: /report type/i })).toHaveAttribute('aria-label');
      expect(screen.getByLabelText(/start date/i)).toHaveAttribute('aria-label');
      expect(screen.getByLabelText(/end date/i)).toHaveAttribute('aria-label');
      expect(screen.getByRole('combobox', { name: /export format/i })).toHaveAttribute('aria-label');
      
      // Ensure container is valid
      expect(container).toBeTruthy();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const { container } = render(<Reports />);
      
      // Ensure container is valid before interacting
      expect(container).toBeTruthy();
      
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      generateButton.focus();
      
      expect(generateButton).toHaveFocus();
    });
  });
});

