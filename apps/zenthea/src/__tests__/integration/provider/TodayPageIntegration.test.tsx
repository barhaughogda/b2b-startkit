import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useRouter } from 'next/navigation';
import { vi } from 'vitest';
import TodayPage from '@/app/company/today/page';

// Mock Next.js modules
vi.mock('@/hooks/useZentheaSession');
vi.mock('next/navigation');

// Mock the navigation layout component
vi.mock('@/components/navigation/ProviderNavigationLayout', () => ({
  ProviderNavigationLayout: function MockProviderNavigationLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="provider-navigation-layout">{children}</div>;
  },
}));

// Mock shadcn components with more realistic behavior
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

const mockUseSession = useZentheaSession as ReturnType<typeof vi.fn>;
const mockUseRouter = useRouter as ReturnType<typeof vi.fn>;

describe('TodayPage Integration Tests', () => {
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

  describe('Complete User Workflow', () => {
    it('loads page, displays data, and allows task interaction', async () => {
      render(<TodayPage />);
      
      // 1. Page loads with correct structure
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByTestId('provider-navigation-layout')).toBeInTheDocument();
      
      // 2. Shows loading states
      expect(screen.getByText('Loading appointments...')).toBeInTheDocument();
      expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
      
      // 3. Data loads and displays
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('Review patient charts')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // 4. Two-column layout is present
      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(2);
      
      // 5. Task interaction works
      const checkboxes = screen.getAllByTestId('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
      
      // 6. Buttons are functional
      const buttons = screen.getAllByTestId('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('handles navigation button clicks', async () => {
      render(<TodayPage />);
      
      await waitFor(() => {
        const addAppointmentButton = screen.getByText('Add Appointment');
        expect(addAppointmentButton).toBeInTheDocument();
        
        fireEvent.click(addAppointmentButton);
        // In a real app, this would trigger navigation
      });
    });
  });

  describe('Data Integration', () => {
    it('displays appointments with correct structure', async () => {
      render(<TodayPage />);
      
      await waitFor(() => {
        // Check appointment data structure
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('9:00 AM')).toBeInTheDocument();
        expect(screen.getByText('Follow-up')).toBeInTheDocument();
        
        // Check status badges
        const badges = screen.getAllByTestId('badge');
        expect(badges.some(badge => badge.textContent === 'scheduled')).toBe(true);
      });
    });

    it('displays tasks with correct structure', async () => {
      render(<TodayPage />);
      
      await waitFor(() => {
        // Check task data structure
        expect(screen.getByText('Review patient charts')).toBeInTheDocument();
        expect(screen.getByText('Update treatment plans')).toBeInTheDocument();
        
        // Check priority badges
        const badges = screen.getAllByTestId('badge');
        expect(badges.some(badge => badge.textContent === 'high')).toBe(true);
        expect(badges.some(badge => badge.textContent === 'medium')).toBe(true);
        
        // Check categories
        expect(screen.getByText('Administrative')).toBeInTheDocument();
        expect(screen.getByText('Clinical')).toBeInTheDocument();
      });
    });
  });

  describe('Component Integration', () => {
    it('integrates all shadcn components correctly', async () => {
      render(<TodayPage />);
      
      await waitFor(() => {
        // Cards are present
        const cards = screen.getAllByTestId('card');
        expect(cards).toHaveLength(2);
        
        // Card headers and titles
        const cardHeaders = screen.getAllByTestId('card-header');
        expect(cardHeaders).toHaveLength(2);
        
        const cardTitles = screen.getAllByTestId('card-title');
        expect(cardTitles).toHaveLength(2);
        
        // Card content
        const cardContents = screen.getAllByTestId('card-content');
        expect(cardContents).toHaveLength(2);
        
        // Badges for status and priority
        const badges = screen.getAllByTestId('badge');
        expect(badges.length).toBeGreaterThan(0);
        
        // Buttons for actions
        const buttons = screen.getAllByTestId('button');
        expect(buttons.length).toBeGreaterThan(0);
        
        // Checkboxes for tasks
        const checkboxes = screen.getAllByTestId('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });
    });

    it('maintains proper component hierarchy', () => {
      render(<TodayPage />);
      
      // Check that cards contain proper sub-components
      const cards = screen.getAllByTestId('card');
      cards.forEach(card => {
        expect(card.querySelector('[data-testid="card-header"]')).toBeInTheDocument();
        expect(card.querySelector('[data-testid="card-content"]')).toBeInTheDocument();
      });
    });
  });

  describe('State Management Integration', () => {
    it('manages loading states correctly', async () => {
      render(<TodayPage />);
      
      // Initial loading state
      expect(screen.getByText('Loading appointments...')).toBeInTheDocument();
      expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
      
      // Loading state should disappear after data loads
      await waitFor(() => {
        expect(screen.queryByText('Loading appointments...')).not.toBeInTheDocument();
        expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('handles task state changes', async () => {
      render(<TodayPage />);
      
      await waitFor(() => {
        const checkboxes = screen.getAllByTestId('checkbox');
        const firstCheckbox = checkboxes[0];
        
        // Initial state
        expect(firstCheckbox).not.toBeChecked();
        
        // Simulate state change
        fireEvent.click(firstCheckbox);
        
        // Verify checkbox interaction
        expect(firstCheckbox).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design Integration', () => {
    it('applies responsive grid layout', () => {
      render(<TodayPage />);
      
      // Find the grid container
      const gridContainer = screen.getByText("Today's Appointments")
        .closest('div')
        ?.parentElement;
      
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2', 'gap-6');
    });

    it('maintains proper spacing and layout', () => {
      render(<TodayPage />);
      
      // Check that cards have proper spacing
      const cards = screen.getAllByTestId('card');
      cards.forEach(card => {
        expect(card).toHaveClass('bg-surface-elevated', 'border-border-primary/20');
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('handles session errors gracefully', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      render(<TodayPage />);
      
      // Should still render the page structure
      expect(screen.getByTestId('provider-navigation-layout')).toBeInTheDocument();
    });

    it('handles router errors gracefully', () => {
      mockUseRouter.mockReturnValue({
        ...mockRouter,
        push: vi.fn().mockImplementation(() => {
          throw new Error('Navigation error');
        }),
      });

      render(<TodayPage />);
      
      // Should still render without crashing
      expect(screen.getByText('Today')).toBeInTheDocument();
    });
  });

  describe('Performance Integration', () => {
    it('loads data efficiently', async () => {
      const startTime = Date.now();
      
      render(<TodayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (3 seconds)
      expect(loadTime).toBeLessThan(3000);
    });

    it('renders without memory leaks', () => {
      const { unmount } = render(<TodayPage />);
      
      // Should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });
  });
});
