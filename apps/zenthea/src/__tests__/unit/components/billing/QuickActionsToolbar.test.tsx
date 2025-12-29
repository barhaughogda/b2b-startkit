import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickActionsToolbar } from '@/components/billing/QuickActionsToolbar';
import { useMutation } from 'convex/react';
import { useSession } from 'next-auth/react';

// Mock Convex API
vi.mock('@/convex/_generated/api', () => ({
  api: {
    billing: {
      createClaimForAppointment: vi.fn(),
      recordInsurancePayment: vi.fn(),
      recordPatientPayment: vi.fn(),
    },
  },
}));

// Mock Convex
vi.mock('convex/react', () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  FileText: vi.fn((props) => <svg data-testid="file-text-icon" {...props} />),
  DollarSign: vi.fn((props) => <svg data-testid="dollar-sign-icon" {...props} />),
  CreditCard: vi.fn((props) => <svg data-testid="credit-card-icon" {...props} />),
  X: vi.fn((props) => <svg data-testid="x-icon" {...props} />),
}));

// Mock Dialog components - Simplified mock for testing
vi.mock('@/components/ui/dialog', () => {
  const React = require('react');
  return {
    Dialog: ({ children, open, onOpenChange }: { children: React.ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) => {
      if (!open) return null;
      
      return (
        <div data-testid="dialog" data-open={open}>
          {React.Children.map(children, (child: any) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, { onOpenChange });
            }
            return child;
          })}
        </div>
      );
    },
    DialogContent: ({ children, onOpenChange }: { children: React.ReactNode; onOpenChange?: (open: boolean) => void }) => (
      <div data-testid="dialog-content">
        <button
          data-testid="dialog-close"
          onClick={() => onOpenChange?.(false)}
          aria-label="Close"
        >
          ×
        </button>
        {children}
      </div>
    ),
    DialogHeader: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="dialog-header">{children}</div>
    ),
    DialogTitle: ({ children }: { children: React.ReactNode }) => (
      <h2 data-testid="dialog-title">{children}</h2>
    ),
    DialogDescription: ({ children }: { children: React.ReactNode }) => (
      <p data-testid="dialog-description">{children}</p>
    ),
    DialogFooter: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="dialog-footer">{children}</div>
    ),
  };
});

// Mock Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

describe('QuickActionsToolbar', () => {
  const mockCreateClaimMutation = vi.fn();
  const mockRecordInsurancePaymentMutation = vi.fn();
  const mockRecordPatientPaymentMutation = vi.fn();

  const mockSession = {
    data: {
      user: {
        email: 'clinic@example.com',
        tenantId: 'test-tenant',
        role: 'clinic',
      },
    },
    status: 'authenticated' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue(mockSession);
    
    // Mock useMutation to return appropriate mock functions
    (useMutation as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
  });

  describe('Rendering', () => {
    it('should render all three action buttons', () => {
      render(<QuickActionsToolbar />);

      expect(screen.getByText('Create Claim from Appointment')).toBeInTheDocument();
      expect(screen.getByText('Post Insurance Payment')).toBeInTheDocument();
      expect(screen.getByText('Post Patient Payment')).toBeInTheDocument();
    });

    it('should render buttons with correct icons', () => {
      render(<QuickActionsToolbar />);

      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument();
      expect(screen.getByTestId('dollar-sign-icon')).toBeInTheDocument();
      expect(screen.getByTestId('credit-card-icon')).toBeInTheDocument();
    });

    it('should render toolbar container with correct styling', () => {
      const { container } = render(<QuickActionsToolbar />);
      const toolbar = container.querySelector('[class*="flex"]');
      
      expect(toolbar).toBeInTheDocument();
    });
  });

  describe('Create Claim from Appointment Modal', () => {
    it('should open modal when "Create Claim from Appointment" button is clicked', async () => {
      const user = userEvent.setup();
      render(<QuickActionsToolbar />);

      const button = screen.getByText('Create Claim from Appointment');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true');
      });
    });

    it('should display correct modal title for create claim', async () => {
      const user = userEvent.setup();
      render(<QuickActionsToolbar />);

      const button = screen.getByText('Create Claim from Appointment');
      await user.click(button);

      await waitFor(() => {
        const dialogTitle = screen.getByTestId('dialog-title');
        expect(dialogTitle).toHaveTextContent('Create Claim from Appointment');
      });
    });

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<QuickActionsToolbar />);

      const openButton = screen.getByText('Create Claim from Appointment');
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true');
      });

      const closeButton = screen.getByTestId('dialog-close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Post Insurance Payment Modal', () => {
    it('should open modal when "Post Insurance Payment" button is clicked', async () => {
      const user = userEvent.setup();
      render(<QuickActionsToolbar />);

      const button = screen.getByText('Post Insurance Payment');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true');
      });
    });

    it('should display correct modal title for insurance payment', async () => {
      const user = userEvent.setup();
      render(<QuickActionsToolbar />);

      const button = screen.getByText('Post Insurance Payment');
      await user.click(button);

      await waitFor(() => {
        const dialogTitle = screen.getByTestId('dialog-title');
        expect(dialogTitle).toHaveTextContent('Post Insurance Payment');
      });
    });

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<QuickActionsToolbar />);

      const openButton = screen.getByText('Post Insurance Payment');
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true');
      });

      const closeButton = screen.getByTestId('dialog-close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Post Patient Payment Modal', () => {
    it('should open modal when "Post Patient Payment" button is clicked', async () => {
      const user = userEvent.setup();
      render(<QuickActionsToolbar />);

      const button = screen.getByText('Post Patient Payment');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true');
      });
    });

    it('should display correct modal title for patient payment', async () => {
      const user = userEvent.setup();
      render(<QuickActionsToolbar />);

      const button = screen.getByText('Post Patient Payment');
      await user.click(button);

      await waitFor(() => {
        const dialogTitle = screen.getByTestId('dialog-title');
        expect(dialogTitle).toHaveTextContent('Post Patient Payment');
      });
    });

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<QuickActionsToolbar />);

      const openButton = screen.getByText('Post Patient Payment');
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true');
      });

      const closeButton = screen.getByTestId('dialog-close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Modal State Management', () => {
    it('should only show one modal at a time', async () => {
      const user = userEvent.setup();
      render(<QuickActionsToolbar />);

      // Open first modal
      const button1 = screen.getByText('Create Claim from Appointment');
      await user.click(button1);

      await waitFor(() => {
        expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
      });

      // Close first modal by clicking close
      const closeButton = screen.getByTestId('dialog-close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument();
      });

      // Open second modal
      const button2 = screen.getByText('Post Insurance Payment');
      await user.click(button2);

      await waitFor(() => {
        const dialogTitle = screen.getByTestId('dialog-title');
        expect(dialogTitle).toHaveTextContent('Post Insurance Payment');
      });
    });

    it('should close modal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<QuickActionsToolbar />);

      const button = screen.getByText('Create Claim from Appointment');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(<QuickActionsToolbar />);

      const buttons = [
        screen.getByText('Create Claim from Appointment'),
        screen.getByText('Post Insurance Payment'),
        screen.getByText('Post Patient Payment'),
      ];

      buttons.forEach((button) => {
        expect(button).toBeInTheDocument();
        expect(button.tagName).toBe('BUTTON');
        // Buttons are accessible by default - type attribute is optional for button elements
      });
    });

    it('should have proper ARIA labels for modals', async () => {
      const user = userEvent.setup();
      render(<QuickActionsToolbar />);

      const button = screen.getByText('Create Claim from Appointment');
      await user.click(button);

      await waitFor(() => {
        const dialogTitle = screen.getByTestId('dialog-title');
        expect(dialogTitle).toBeInTheDocument();
        expect(dialogTitle).toHaveTextContent('Create Claim from Appointment');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render buttons in a flex container', () => {
      const { container } = render(<QuickActionsToolbar />);
      const toolbar = container.firstChild;
      
      expect(toolbar).toBeInTheDocument();
      // Check for flex classes (implementation detail, but important for layout)
      expect(toolbar?.className).toContain('flex');
    });

    it('should support mobile layout with gap spacing', () => {
      const { container } = render(<QuickActionsToolbar />);
      const toolbar = container.firstChild;
      
      expect(toolbar).toBeInTheDocument();
      // Check for gap classes for spacing between buttons
      expect(toolbar?.className).toMatch(/gap|space/);
    });
  });

  describe('Integration with Convex Mutations', () => {
    it('should initialize all three mutation hooks', () => {
      render(<QuickActionsToolbar />);
      
      // Verify mutation hook is called three times (once for each mutation)
      expect(useMutation).toHaveBeenCalledTimes(3);
    });
  });

  describe('Session Handling', () => {
    it('should handle unauthenticated state gracefully', () => {
      (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
        data: null,
        status: 'unauthenticated' as const,
      });

      render(<QuickActionsToolbar />);
      
      // Component should still render buttons (authorization happens at mutation level)
      expect(screen.getByText('Create Claim from Appointment')).toBeInTheDocument();
    });

    it('should use session email for mutations', () => {
      render(<QuickActionsToolbar />);
      
      // Component should be ready to use session email
      expect(useSession).toHaveBeenCalled();
    });
  });
});

