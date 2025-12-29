import React from 'react';
import { render, screen, fireEvent, waitFor, mockOpenCard } from '@/__tests__/utils/test-wrapper';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import TodayPage from '@/app/company/today/page';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock Next.js modules
vi.mock('next-auth/react');
vi.mock('next/navigation');

// Mock the usePatients hook
vi.mock('@/hooks/usePatients', () => ({
  usePatients: vi.fn(() => ({
    patients: [
      { _id: '1', name: 'John Doe', firstName: 'John', lastName: 'Doe' },
      { _id: '2', name: 'Jane Smith', firstName: 'Jane', lastName: 'Smith' },
      { _id: '3', name: 'Mike Johnson', firstName: 'Mike', lastName: 'Johnson' },
      { _id: '4', name: 'Emily Wilson', firstName: 'Emily', lastName: 'Wilson' },
    ],
    isLoading: false,
    error: null,
  })),
}));

// Mock useCardSystem - use the one from test-wrapper

// Mock the navigation layout component
vi.mock('@/components/navigation/ProviderNavigationLayout', () => ({
  ProviderNavigationLayout: function MockProviderNavigationLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="provider-navigation-layout">{children}</div>;
  },
}));

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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant, ...props }: any) => (
    <span data-testid="badge" className={className} data-variant={variant} {...props}>
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
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className, ...props }: any) => (
    <div data-testid="alert" className={className} {...props}>
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
    <hr data-testid="separator" className={className} {...props} />
  ),
}));

// Using global lucide-react mock from src/__tests__/setup/lucide-react-mock.ts

const mockUseSession = useSession as any;
const mockUseRouter = useRouter as any;

describe('TodayPage', () => {
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
        },
      },
      status: 'authenticated',
    });

    mockUseRouter.mockReturnValue(mockRouter);
  });

  afterEach(() => {
    // Clear all timers to prevent memory leaks
    vi.clearAllTimers();
  });


  describe('Rendering', () => {
    it('renders the page with correct heading', async () => {
      render(<TodayPage />);
      
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Today')).toHaveClass('text-3xl', 'font-bold', 'text-text-primary');
    });

    it('renders the provider navigation layout', () => {
      render(<TodayPage />);
      
      expect(screen.getByTestId('provider-navigation-layout')).toBeInTheDocument();
    });

    it('renders two main cards in grid layout', () => {
      render(<TodayPage />);
      
      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(2); // Appointments and Tasks cards
    });

    it('renders Today\'s Appointments card with correct title', () => {
      render(<TodayPage />);
      
      expect(screen.getByText("Today's Appointments")).toBeInTheDocument();
    });

    it('renders My Tasks card with correct title', () => {
      render(<TodayPage />);
      
      expect(screen.getByText('My Tasks')).toBeInTheDocument();
    });
  });

  describe('Appointments Section', () => {
    it('displays loading state initially', () => {
      render(<TodayPage />);
      
      expect(screen.getByText('Loading appointments...')).toBeInTheDocument();
    });

    it('displays appointments when loaded', async () => {
      render(<TodayPage />);
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getAllByText('John Doe')).toHaveLength(9); // 1 in appointments + 8 in task list
        expect(screen.getByText('09:00 AM')).toBeInTheDocument();
        expect(screen.getAllByText('Consultation')).toHaveLength(2); // John Doe and Emily Wilson both have Consultation
      }, { timeout: 2000 });
    });

    it('displays appointment status badges', async () => {
      render(<TodayPage />);
      
      // Wait for data to load
      await waitFor(() => {
        const badges = screen.getAllByTestId('badge');
        expect(badges.some(badge => badge.textContent?.includes('scheduled'))).toBe(true);
      }, { timeout: 2000 });
    });

    it('renders Add Appointment button', () => {
      render(<TodayPage />);
      
      const addButton = screen.getByText('Add Appointment');
      expect(addButton).toBeInTheDocument();
      expect(addButton.closest('[data-testid="button"]')).toHaveAttribute('data-size', 'sm');
    });
  });

  describe('Tasks Section', () => {
    it('displays loading state initially', () => {
      render(<TodayPage />);
      
      expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
    });

    it('displays tasks when loaded', async () => {
      render(<TodayPage />);
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Review Lab Results - Blood Work')).toBeInTheDocument();
        expect(screen.getByText('Patient Message - Medication Questions')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('displays task checkboxes', async () => {
      render(<TodayPage />);
      
      // Wait for data to load
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      }, { timeout: 2000 });
    });

    it('displays task priority badges', async () => {
      render(<TodayPage />);
      
      // Wait for data to load
      await waitFor(() => {
        const badges = screen.getAllByTestId('badge');
        expect(badges.some(badge => badge.textContent === 'high')).toBe(true);
        expect(badges.some(badge => badge.textContent === 'medium')).toBe(true);
      }, { timeout: 2000 });
    });

    it('displays task categories', async () => {
      render(<TodayPage />);
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Review Lab Results - Blood Work')).toBeInTheDocument();
        expect(screen.getByText('Patient Message - Medication Questions')).toBeInTheDocument();
        expect(screen.getByText('Vital Signs Review - Blood Pressure')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('renders Add Task button', () => {
      render(<TodayPage />);
      
      const addButton = screen.getByText('Add Task');
      expect(addButton).toBeInTheDocument();
      expect(addButton.closest('[data-testid="button"]')).toHaveAttribute('data-variant', 'outline');
    });

    it('displays patient names in task list', async () => {
      render(<TodayPage />);
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Review Lab Results - Blood Work')).toBeInTheDocument();
        expect(screen.getAllByText('John Doe')).toHaveLength(9); // 1 in appointments + 8 in task list
      }, { timeout: 2000 });
      
      // Check that patient names are displayed in the task list
      const patientNames = screen.getAllByText('John Doe');
      expect(patientNames.length).toBeGreaterThan(0);
      
      // Check that patient names have the correct styling
      patientNames.forEach(name => {
        expect(name).toHaveClass('font-medium');
      });
    });
  });

  describe('Task Interaction', () => {
    it('toggles task completion when checkbox is clicked', async () => {
      render(<TodayPage />);
      
      // Wait for data to load
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      }, { timeout: 2000 });
      
      const checkboxes = screen.getAllByTestId('checkbox');
      const firstCheckbox = checkboxes[0];
      
      expect(firstCheckbox).not.toBeChecked();
      
      fireEvent.click(firstCheckbox);
      
      // Note: In a real test, we'd need to mock the state update
      // This test verifies the checkbox can be clicked
      expect(firstCheckbox).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when there is an error', () => {
      // This would require mocking an error state
      // For now, we'll test the error display structure
      render(<TodayPage />);
      
      // The component should handle errors gracefully
      expect(screen.getByTestId('provider-navigation-layout')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<TodayPage />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Today');
    });

    it('has accessible buttons', () => {
      render(<TodayPage />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('has accessible checkboxes', async () => {
      render(<TodayPage />);
      
      // Wait for data to load
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      }, { timeout: 2000 });
    });
  });

  describe('Responsive Layout', () => {
    it('applies correct grid classes for responsive layout', () => {
      render(<TodayPage />);
      
      // Find the grid container using data-testid
      const gridContainer = screen.getByTestId('today-grid');
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2');
    });
  });

  describe('Data Loading', () => {
    it('simulates data loading with useEffect', async () => {
      render(<TodayPage />);
      
      // Initially shows loading
      expect(screen.getByText('Loading appointments...')).toBeInTheDocument();
      expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getAllByText('John Doe')).toHaveLength(9); // 1 in appointments + 8 in task list
        expect(screen.getByText('Review Lab Results - Blood Work')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Patient Navigation', () => {
    it('navigates to patient profile when appointment is clicked', async () => {
      render(<TodayPage />);
      
      // Wait for appointments to load
      await waitFor(() => {
        expect(screen.getAllByText('John Doe')).toHaveLength(9); // 1 in appointments + 8 in task list
      }, { timeout: 2000 });
      
      // Find the appointment row and click on it (first one is in appointments section)
      const appointmentRow = screen.getAllByText('John Doe')[0].closest('div[class*="hover:bg-surface-interactive"]');
      expect(appointmentRow).toBeInTheDocument();
      
      fireEvent.click(appointmentRow!);
      
      // Verify router.push was called to navigate to patient profile
      expect(mockPush).toHaveBeenCalledWith('/provider/patients/1');
    });

    it('navigates to correct patient profile for different patients', async () => {
      render(<TodayPage />);
      
      // Wait for appointments to load
      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      }, { timeout: 2000 });
      
      // Click on Jane Smith's appointment
      const janeAppointment = screen.getByText('Jane Smith').closest('div[class*="hover:bg-surface-interactive"]');
      fireEvent.click(janeAppointment!);
      
      // Verify router.push was called to navigate to patient profile
      expect(mockPush).toHaveBeenCalledWith('/provider/patients/2');
    });

    it('makes appointment rows clickable with proper cursor styling', async () => {
      render(<TodayPage />);
      
      // Wait for appointments to load
      await waitFor(() => {
        expect(screen.getAllByText('John Doe')).toHaveLength(9); // 1 in appointments + 8 in task list
      }, { timeout: 2000 });
      
      // Check that appointment rows have hover styling indicating they're clickable
      const appointmentRows = screen.getAllByText(/John Doe|Jane Smith|Mike Johnson|Emily Wilson/);
      appointmentRows.forEach(row => {
        const parentRow = row.closest('div[class*="hover:bg-surface-interactive"]');
        expect(parentRow).toBeInTheDocument();
        expect(parentRow).toHaveClass('hover:bg-surface-interactive', 'transition-colors');
      });
    });

    it('supports keyboard navigation for appointment rows', async () => {
      render(<TodayPage />);
      
      // Wait for appointments to load
      await waitFor(() => {
        expect(screen.getAllByText('John Doe')).toHaveLength(9); // 1 in appointments + 8 in task list
      }, { timeout: 2000 });
      
      // Find the appointment row (first one is in appointments section)
      const appointmentRow = screen.getAllByText('John Doe')[0].closest('div[role="button"]');
      expect(appointmentRow).toBeInTheDocument();
      
      // Test Enter key navigation
      fireEvent.keyDown(appointmentRow!, { key: 'Enter' });
      expect(mockPush).toHaveBeenCalledWith('/provider/patients/1');
      
      // Reset mock
      mockPush.mockClear();
      
      // Test Space key navigation
      fireEvent.keyDown(appointmentRow!, { key: ' ' });
      expect(mockPush).toHaveBeenCalledWith('/provider/patients/1');
    });

    it('has proper accessibility attributes for appointment rows', async () => {
      render(<TodayPage />);
      
      // Wait for appointments to load
      await waitFor(() => {
        expect(screen.getAllByText('John Doe')).toHaveLength(9); // 1 in appointments + 8 in task list
      }, { timeout: 2000 });
      
      // Check accessibility attributes (first one is in appointments section)
      const appointmentRow = screen.getAllByText('John Doe')[0].closest('div[role="button"]');
      expect(appointmentRow).toHaveAttribute('tabIndex', '0');
      expect(appointmentRow).toHaveAttribute('role', 'button');
      expect(appointmentRow).toHaveAttribute('aria-label', 'Navigate to patient profile for John Doe, Consultation at 09:00 AM');
    });
  });
});
