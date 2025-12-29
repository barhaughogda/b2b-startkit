import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModalProvider, useModal } from '@/components/modal/ModalContext';
import { UnifiedModalSystem, useMedicalModals } from '@/components/modal/UnifiedModalSystem';
import { ModalErrorBoundary } from '@/components/modal/ErrorBoundary';

// Mock the UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  )
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>
}));

// Test component that uses the modal system
function TestComponent() {
  const { openModal, closeModal, modals } = useModal();
  
  const handleOpenModal = () => {
    openModal({
      title: 'Test Modal',
      content: <div>Test Content</div>,
      size: 'md'
    });
  };

  return (
    <div>
      <button onClick={handleOpenModal}>Open Modal</button>
      <button onClick={() => closeModal(modals[0]?.id)}>Close Modal</button>
      <div data-testid="modal-count">{modals.length}</div>
    </div>
  );
}

describe('Modal System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ModalProvider', () => {
    it('should provide modal context', () => {
      render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>
      );

      expect(screen.getByText('Open Modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-count')).toHaveTextContent('0');
    });

    it('should open and close modals', async () => {
      render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>
      );

      // Open modal
      fireEvent.click(screen.getByText('Open Modal'));
      
      await waitFor(() => {
        expect(screen.getByTestId('modal-count')).toHaveTextContent('1');
      });

      // Close modal
      fireEvent.click(screen.getByText('Close Modal'));
      
      await waitFor(() => {
        expect(screen.getByTestId('modal-count')).toHaveTextContent('0');
      });
    });

    it('should handle multiple modals', async () => {
      function MultiModalTest() {
        const { openModal, modals } = useModal();
        
        const handleOpenMultiple = () => {
          openModal({ title: 'Modal 1', content: <div>Content 1</div> });
          openModal({ title: 'Modal 2', content: <div>Content 2</div> });
        };

        return (
          <div>
            <button onClick={handleOpenMultiple}>Open Multiple</button>
            <div data-testid="modal-count">{modals.length}</div>
          </div>
        );
      }

      render(
        <ModalProvider>
          <MultiModalTest />
        </ModalProvider>
      );

      fireEvent.click(screen.getByText('Open Multiple'));
      
      await waitFor(() => {
        expect(screen.getByTestId('modal-count')).toHaveTextContent('2');
      });
    });
  });

  describe('UnifiedModalSystem', () => {
    it('should render modals when they exist', async () => {
      function TestWithModals() {
        const { openModal } = useModal();
        
        React.useEffect(() => {
          openModal({
            title: 'Test Modal',
            content: <div>Test Content</div>
          });
        }, [openModal]);

        return <div>Test</div>;
      }

      render(
        <ModalProvider>
          <TestWithModals />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Modal')).toBeInTheDocument();
        expect(screen.getByText('Test Content')).toBeInTheDocument();
      });
    });

    it('should not render when no modals exist', () => {
      render(
        <ModalProvider>
          <div>Test</div>
          <UnifiedModalSystem />
        </ModalProvider>
      );

      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });
  });

  describe('useMedicalModals', () => {
    it('should open event modal', async () => {
      function MedicalTest() {
        const { openEventModal } = useMedicalModals();
        
        const handleOpenEvent = () => {
          openEventModal({
            type: 'visit',
            title: 'Patient Visit',
            date: '2024-01-01',
            time: '10:00 AM',
            provider: 'Dr. Smith'
          });
        };

        return <button onClick={handleOpenEvent}>Open Event</button>;
      }

      render(
        <ModalProvider>
          <MedicalTest />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      fireEvent.click(screen.getByText('Open Event'));
      
      await waitFor(() => {
        expect(screen.getByText('Patient Visit')).toBeInTheDocument();
        expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      });
    });

    it('should open message modal', async () => {
      function MessageTest() {
        const { openMessageModal } = useMedicalModals();
        
        const handleOpenMessage = () => {
          openMessageModal({
            subject: 'Test Message',
            from: 'Dr. Smith',
            to: 'Patient',
            content: 'Test message content',
            timestamp: '2024-01-01 10:00 AM',
            priority: 'high'
          });
        };

        return <button onClick={handleOpenMessage}>Open Message</button>;
      }

      render(
        <ModalProvider>
          <MessageTest />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      fireEvent.click(screen.getByText('Open Message'));
      
      await waitFor(() => {
        expect(screen.getByText('Test Message')).toBeInTheDocument();
        expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      });
    });
  });

  describe('ModalErrorBoundary', () => {
    it('should catch errors and display fallback UI', () => {
      function ErrorComponent(): React.ReactElement {
        throw new Error('Test error');
      }

      render(
        <ModalErrorBoundary>
          <ErrorComponent />
        </ModalErrorBoundary>
      );

      expect(screen.getByText('Modal Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong with this modal. Your data has been automatically saved.')).toBeInTheDocument();
    });

    it('should allow retry on error', () => {
      let shouldThrow = true;
      
      function ConditionalErrorComponent() {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>Success</div>;
      }

      function TestWithRetry() {
        const [key, setKey] = React.useState(0);
        
        const handleRetry = () => {
          shouldThrow = false;
          setKey(prev => prev + 1);
        };

        return (
          <div>
            <button onClick={handleRetry}>Retry</button>
            <ModalErrorBoundary key={key}>
              <ConditionalErrorComponent />
            </ModalErrorBoundary>
          </div>
        );
      }

      render(<TestWithRetry />);

      expect(screen.getByText('Modal Error')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Retry'));
      
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    it('should handle minimize and maximize', async () => {
      function InteractiveTest() {
        const { openModal } = useModal();
        
        React.useEffect(() => {
          openModal({
            title: 'Interactive Modal',
            content: <div>Content</div>
          });
        }, [openModal]);

        return <div>Test</div>;
      }

      render(
        <ModalProvider>
          <InteractiveTest />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Interactive Modal')).toBeInTheDocument();
      });

      // Test minimize button
      const minimizeButton = screen.getByTitle('Minimize');
      fireEvent.click(minimizeButton);

      // Test maximize button
      const maximizeButton = screen.getByTitle('Maximize');
      fireEvent.click(maximizeButton);

      // Test close button
      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);
    });

    it('should handle drag and resize interactions', async () => {
      function DragTest() {
        const { openModal } = useModal();
        
        React.useEffect(() => {
          openModal({
            title: 'Drag Test Modal',
            content: <div>Content</div>
          });
        }, [openModal]);

        return <div>Test</div>;
      }

      render(
        <ModalProvider>
          <DragTest />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      await waitFor(() => {
        const modal = screen.getByText('Drag Test Modal').closest('div');
        expect(modal).toBeInTheDocument();
      });

      // Test drag handle
      const dragHandle = screen.getByText('Drag Test Modal').closest('[data-drag-handle]');
      expect(dragHandle).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      function A11yTest() {
        const { openModal } = useModal();
        
        React.useEffect(() => {
          openModal({
            title: 'Accessible Modal',
            content: <div>Content</div>
          });
        }, [openModal]);

        return <div>Test</div>;
      }

      render(
        <ModalProvider>
          <A11yTest />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Accessible Modal')).toBeInTheDocument();
      });

      // Check for screen reader text
      expect(screen.getByText('Minimize')).toBeInTheDocument();
      expect(screen.getByText('Maximize')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      function KeyboardTest() {
        const { openModal } = useModal();
        
        React.useEffect(() => {
          openModal({
            title: 'Keyboard Modal',
            content: <div>Content</div>
          });
        }, [openModal]);

        return <div>Test</div>;
      }

      render(
        <ModalProvider>
          <KeyboardTest />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Keyboard Modal')).toBeInTheDocument();
      });

      // Test keyboard interactions
      const modal = screen.getByText('Keyboard Modal').closest('div');
      fireEvent.keyDown(modal!, { key: 'Escape' });
    });
  });
});
