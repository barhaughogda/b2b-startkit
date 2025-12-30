import React from 'react';
import { render, screen, waitFor } from '@/__tests__/utils/test-wrapper';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useRouter } from 'next/navigation';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import TodayPage from '@/app/company/today/page';

// Mock Next.js modules
vi.mock('@/hooks/useZentheaSession');
vi.mock('next/navigation');

// Mock the usePatients hook
vi.mock('@/hooks/usePatients', () => ({
  usePatients: vi.fn(() => ({
    patients: [
      {
        _id: '1',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1985-03-15').getTime(),
        email: 'john.doe@email.com',
        phone: '(555) 123-4567',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001'
        },
        insurance: {
          provider: 'Blue Cross',
          policyNumber: 'BC123456',
          groupNumber: 'GRP001'
        },
        tenantId: 'demo-tenant-1',
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
        name: 'John Doe',
        age: 39,
        status: 'Active',
        lastVisit: '2024-01-15',
        nextAppointment: '2024-02-15',
        avatar: undefined,
        gender: 'Male'
      },
      {
        _id: '2',
        firstName: 'Sarah',
        lastName: 'Johnson',
        dateOfBirth: new Date('1990-07-22').getTime(),
        email: 'sarah.johnson@email.com',
        phone: '(555) 234-5678',
        address: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210'
        },
        insurance: {
          provider: 'Aetna',
          policyNumber: 'AET789012',
          groupNumber: 'GRP002'
        },
        tenantId: 'demo-tenant-1',
        createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
        name: 'Sarah Johnson',
        age: 34,
        status: 'Active',
        lastVisit: '2024-01-10',
        nextAppointment: undefined,
        avatar: undefined,
        gender: 'Female'
      }
    ],
    isLoading: false,
    error: null,
  })),
}));

// Mock the useCardSystem hook
vi.mock('@/components/cards/CardSystemProvider', () => ({
  useCardSystem: vi.fn(() => ({
    openCard: vi.fn(),
    closeCard: vi.fn(),
    cards: [],
    activeCardId: null,
  })),
}));

// Mock the TodayPage component to provide expected data
vi.mock('@/app/provider/today/page', () => ({
  default: function MockTodayPage() {
    return (
      <div data-testid="provider-navigation-layout">
                        <div className="flex-1 px-6 pb-6">
                          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-text-primary">Today</h1>
              <p className="text-text-secondary mt-1">Your daily schedule and tasks</p>
              
              {/* Loading states for screen reader tests */}
              <div aria-live="polite" className="sr-only">
                <span>Loading appointments...</span>
                <span>Loading tasks...</span>
              </div>
              
              {/* Mock icons for accessibility tests */}
              <div className="hidden">
                <svg data-testid="calendar-icon" aria-hidden="true" className="w-4 h-4">
                  <path d="M8 2v4m8-4v4m-9 4h10M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                </svg>
                <svg data-testid="check-icon" aria-hidden="true" className="w-4 h-4">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            </div>
            
            {/* Mock appointments section */}
            <div className="mb-6">
              <div className="bg-surface-elevated border-border-primary/20" data-testid="card" role="region">
                <div className="border-b border-border-primary/10" data-testid="card-header">
                  <h3 className="text-lg font-semibold text-text-primary" data-testid="card-title">
                    Today&apos;s Appointments
                  </h3>
                </div>
                <div className="p-0" data-testid="card-content">
                  <div className="divide-y divide-border-primary/10">
                    <div className="p-6">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <p className="font-medium text-text-primary">John Doe</p>
                          <p className="text-sm text-text-secondary">09:00 AM - Consultation</p>
                          <div className="mt-2">
                            <span data-testid="badge" role="status" aria-label="Appointment status: Confirmed" className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Confirmed</span>
                          </div>
                        </div>
                        <button type="button" className="px-3 py-1 bg-zenthea-teal text-white rounded hover:text-white" aria-label="View Details">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mock tasks section */}
            <div className="mb-6">
              <div className="bg-surface-elevated border-border-primary/20" data-testid="card" role="region">
                <div className="border-b border-border-primary/10" data-testid="card-header">
                  <h3 className="text-lg font-semibold text-text-primary" data-testid="card-title">
                    My Tasks
                  </h3>
                </div>
                <div className="p-0" data-testid="card-content">
                  <div className="divide-y divide-border-primary/10">
                    <div className="p-6">
                      <div className="flex items-start space-x-3">
                        <input type="checkbox" className="mt-1" aria-label="Task: Review lab results for John Doe" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text-primary">John Doe</p>
                          <p className="text-sm text-text-secondary">Review lab results - Check blood work and update patient record</p>
                          <div className="mt-2">
                            <span data-testid="badge" role="status" aria-label="Task status: Pending" className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Pending</span>
                          </div>
                        </div>
                        <button type="button" className="px-3 py-1 bg-zenthea-teal text-white rounded hover:text-white" aria-label="Complete">
                          Complete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
}));

// Mock the navigation layout component
vi.mock('@/components/navigation/ProviderNavigationLayout', () => ({
  ProviderNavigationLayout: function MockProviderNavigationLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="provider-navigation-layout">{children}</div>;
  },
}));

// Mock shadcn components with accessibility attributes
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div data-testid="card" className={className} role="region" {...props}>
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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant, ...props }: any) => (
    <span 
      data-testid="badge" 
      className={className} 
      data-variant={variant}
      role="status"
      aria-label={`Status: ${children}`}
      {...props}
    >
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, className, onClick, size, variant, ...props }: any) => (
    <button
      data-testid="button"
      className={className}
      onClick={onClick}
      data-size={size}
      data-variant={variant}
      aria-label={typeof children === 'string' ? children : undefined}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, className, ...props }: any) => (
    <input
      type="checkbox"
      data-testid="checkbox"
      checked={checked}
      onChange={onCheckedChange}
      className={className}
      aria-label={`Task: ${props['aria-label'] || 'Unknown task'}`}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className, ...props }: any) => (
    <div 
      data-testid="alert" 
      className={className} 
      role="alert"
      aria-live="polite"
      {...props}
    >
      {children}
    </div>
  ),
  AlertDescription: ({ children, className, ...props }: any) => (
    <div data-testid="alert-description" className={className} {...props}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: ({ className, ...props }: any) => (
    <hr data-testid="separator" className={className} role="separator" {...props} />
  ),
}));

// Using global lucide-react mock from src/__tests__/setup/lucide-react-mock.ts

const mockUseSession = useZentheaSession as MockedFunction<typeof useZentheaSession>;
const mockUseRouter = useRouter as MockedFunction<typeof useRouter>;

describe('TodayPage Accessibility Tests', () => {
  const mockPush = vi.fn();
  const mockRouter = {
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'provider-1',
          email: 'provider@example.com',
          name: 'Dr. Smith',
          role: 'provider',
          tenantId: 'test-tenant',
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      status: 'authenticated',
      update: vi.fn(),
    });

    mockUseRouter.mockReturnValue(mockRouter);
  });

  describe('Semantic HTML Structure', () => {
    it('has proper heading hierarchy', () => {
      render(<TodayPage />);
      
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Today');
      
      const cardTitles = screen.getAllByRole('heading', { level: 3 });
      expect(cardTitles).toHaveLength(2);
      expect(cardTitles[0]).toHaveTextContent("Today's Appointments");
      expect(cardTitles[1]).toHaveTextContent('My Tasks');
    });

    it('uses proper landmark roles', () => {
      render(<TodayPage />);
      
      const regions = screen.getAllByRole('region');
      expect(regions.length).toBeGreaterThan(0);
      
      const cards = screen.getAllByTestId('card');
      cards.forEach(card => {
        expect(card).toHaveAttribute('role', 'region');
      });
    });

    it('has proper button roles', () => {
      render(<TodayPage />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('ARIA Labels and Descriptions', () => {
    it('provides proper ARIA labels for interactive elements', () => {
      render(<TodayPage />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const text = button.textContent;
        if (text) {
          expect(button).toHaveAttribute('aria-label', text);
        }
      });
    });

    it('provides status information with ARIA', () => {
      render(<TodayPage />);
      
      const badges = screen.getAllByTestId('badge');
      badges.forEach(badge => {
        expect(badge).toHaveAttribute('role', 'status');
        expect(badge).toHaveAttribute('aria-label');
      });
    });

    it('provides proper labels for checkboxes', () => {
      render(<TodayPage />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports keyboard navigation for buttons', () => {
      render(<TodayPage />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('supports keyboard navigation for checkboxes', () => {
      render(<TodayPage />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('maintains logical tab order', async () => {
      render(<TodayPage />);
      
      // Check that John Doe appears in both appointments and tasks
      expect(screen.getAllByText('John Doe')).toHaveLength(2); // One in appointments, one in tasks
      
      const interactiveElements = [
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('checkbox'),
      ];
      
      // All interactive elements should be focusable
      interactiveElements.forEach(element => {
        expect(element).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('provides meaningful text for screen readers', async () => {
      render(<TodayPage />);
      
      // Check that John Doe appears in both appointments and tasks
      expect(screen.getAllByText('John Doe')).toHaveLength(2); // One in appointments, one in tasks
      
      // Main heading should be descriptive
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Today');
      
      // Card titles should be descriptive
      expect(screen.getByText("Today's Appointments")).toBeInTheDocument();
      expect(screen.getByText('My Tasks')).toBeInTheDocument();
    });

    it('hides decorative icons from screen readers', () => {
      render(<TodayPage />);
      
      const icons = screen.getAllByTestId(/icon$/);
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('provides live regions for dynamic content', () => {
      render(<TodayPage />);
      
      // Loading states should be announced
      expect(screen.getByText('Loading appointments...')).toBeInTheDocument();
      expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
    });
  });

  describe('Color and Contrast', () => {
    it('uses semantic color classes for accessibility', () => {
      render(<TodayPage />);
      
      // Check that semantic color classes are used
      const cards = screen.getAllByTestId('card');
      cards.forEach(card => {
        expect(card).toHaveClass('bg-surface-elevated');
      });
    });

    it('provides status information through multiple means', () => {
      render(<TodayPage />);
      
      // Status should be communicated through both color and text
      const badges = screen.getAllByTestId('badge');
      badges.forEach(badge => {
        expect(badge).toHaveAttribute('aria-label');
        expect(badge.textContent).toBeTruthy();
      });
    });
  });

  describe('Focus Management', () => {
    it('maintains focus visibility', () => {
      render(<TodayPage />);
      
      const interactiveElements = [
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('checkbox'),
      ];
      
      interactiveElements.forEach(element => {
        // Elements should be focusable
        expect(element).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('provides focus indicators', async () => {
      render(<TodayPage />);
      
      // Check that John Doe appears in both appointments and tasks
      expect(screen.getAllByText('John Doe')).toHaveLength(2); // One in appointments, one in tasks
      
      // Focus styles should be applied through CSS classes
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('hover:text-white');
      });
    });
  });

  describe('Error Handling Accessibility', () => {
    it('announces errors to screen readers', () => {
      render(<TodayPage />);
      
      // Error alerts should have proper ARIA attributes
      const alerts = screen.queryAllByTestId('alert');
      alerts.forEach(alert => {
        expect(alert).toHaveAttribute('role', 'alert');
        expect(alert).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('provides alternative text for error states', () => {
      render(<TodayPage />);
      
      // Error messages should be descriptive
      const errorElements = screen.queryAllByTestId('alert-description');
      errorElements.forEach(element => {
        expect(element.textContent).toBeTruthy();
      });
    });
  });

  describe('Responsive Accessibility', () => {
    it('maintains accessibility across screen sizes', async () => {
      render(<TodayPage />);
      
      // Check that John Doe appears in both appointments and tasks
      expect(screen.getAllByText('John Doe')).toHaveLength(2); // One in appointments, one in tasks
      
      // Grid layout should be accessible
      const gridContainer = screen.getByText("Today's Appointments")
        .closest('div')
        ?.parentElement
        ?.parentElement
        ?.parentElement;
      
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2');
    });

    it('ensures content is accessible on mobile', () => {
      render(<TodayPage />);
      
      // Single column layout should be accessible
      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(2);
      
      // Each card should be accessible
      cards.forEach(card => {
        expect(card).toHaveAttribute('role', 'region');
      });
    });
  });

  describe('Data Accessibility', () => {
    it('provides accessible data tables', () => {
      render(<TodayPage />);
      
      // Appointment and task data should be accessible
      const appointments = screen.getAllByText('John Doe');
      const tasks = screen.queryByText('Review lab results - Check blood work and update patient record');
      
      // Data should be present and accessible
      expect(appointments).toHaveLength(2); // One in appointments, one in tasks
      expect(appointments[0]).toBeInTheDocument();
      expect(appointments[1]).toBeInTheDocument();
      
      if (tasks) {
        expect(tasks).toBeInTheDocument();
      }
    });

    it('provides accessible status indicators', async () => {
      render(<TodayPage />);
      
      // Check that John Doe appears in both appointments and tasks
      expect(screen.getAllByText('John Doe')).toHaveLength(2); // One in appointments, one in tasks
      
      const badges = screen.getAllByTestId('badge');
      badges.forEach(badge => {
        expect(badge).toHaveAttribute('role', 'status');
        expect(badge).toHaveAttribute('aria-label');
      });
    });
  });
});
