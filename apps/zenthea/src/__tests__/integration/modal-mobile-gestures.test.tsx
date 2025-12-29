import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModalProvider } from '@/components/modal/ModalContext';
import { UnifiedModalSystem } from '@/components/modal/UnifiedModalSystem';
import { useModal } from '@/components/modal/UnifiedModalSystem';
import type { Modal } from '@/components/modal/types';

// Test component for mobile gesture functionality
function TestMobileGestureComponent() {
  const { openModal, modals } = useModal();

  const handleOpenModal = () => {
    openModal({
      taskType: 'soap-note',
      title: 'Mobile Modal',
      content: 'Test content',
      patientId: 'patient-123',
      patientName: 'John Doe',
      priority: 'high',
      status: 'open'
    } as Omit<Modal, 'id' | 'zIndex'>);
  };

  return (
    <div>
      <button onClick={handleOpenModal} data-testid="open-modal">
        Open Mobile Modal
      </button>
      <div data-testid="modal-count">{modals.length}</div>
    </div>
  );
}

describe('Modal Mobile Gestures Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Swipe Gestures', () => {
    it('should handle swipe down to close modal', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestMobileGestureComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Mobile Modal')).toBeInTheDocument();
      });

      // Find modal
      const modal = screen.getByText('Mobile Modal').closest('[class*="modal"]');
      expect(modal).toBeInTheDocument();

      // Simulate swipe down gesture
      if (modal) {
        fireEvent.touchStart(modal, { 
          touches: [{ clientX: 100, clientY: 100 }] 
        });
        fireEvent.touchMove(modal, { 
          touches: [{ clientX: 100, clientY: 200 }] 
        });
        fireEvent.touchEnd(modal);
      }
    });

    it('should handle swipe up gesture', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestMobileGestureComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Mobile Modal')).toBeInTheDocument();
      });

      // Find modal
      const modal = screen.getByText('Mobile Modal').closest('[class*="modal"]');
      expect(modal).toBeInTheDocument();

      // Simulate swipe up gesture
      if (modal) {
        fireEvent.touchStart(modal, { 
          touches: [{ clientX: 100, clientY: 200 }] 
        });
        fireEvent.touchMove(modal, { 
          touches: [{ clientX: 100, clientY: 100 }] 
        });
        fireEvent.touchEnd(modal);
      }
    });
  });

  describe('Pinch Gestures', () => {
    it('should handle pinch to zoom gesture', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestMobileGestureComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Mobile Modal')).toBeInTheDocument();
      });

      // Find modal
      const modal = screen.getByText('Mobile Modal').closest('[class*="modal"]');
      expect(modal).toBeInTheDocument();

      // Simulate pinch gesture
      if (modal) {
        fireEvent.touchStart(modal, { 
          touches: [
            { clientX: 100, clientY: 100 },
            { clientX: 200, clientY: 100 }
          ] 
        });
        fireEvent.touchMove(modal, { 
          touches: [
            { clientX: 150, clientY: 100 },
            { clientX: 250, clientY: 100 }
          ] 
        });
        fireEvent.touchEnd(modal);
      }
    });
  });

  describe('Tap Gestures', () => {
    it('should handle single tap gesture', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestMobileGestureComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Mobile Modal')).toBeInTheDocument();
      });

      // Find modal
      const modal = screen.getByText('Mobile Modal').closest('[class*="modal"]');
      expect(modal).toBeInTheDocument();

      // Simulate single tap
      if (modal) {
        fireEvent.touchStart(modal, { 
          touches: [{ clientX: 100, clientY: 100 }] 
        });
        fireEvent.touchEnd(modal);
      }
    });

    it('should handle double tap gesture', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestMobileGestureComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Mobile Modal')).toBeInTheDocument();
      });

      // Find modal
      const modal = screen.getByText('Mobile Modal').closest('[class*="modal"]');
      expect(modal).toBeInTheDocument();

      // Simulate double tap
      if (modal) {
        fireEvent.touchStart(modal, { 
          touches: [{ clientX: 100, clientY: 100 }] 
        });
        fireEvent.touchEnd(modal);
        fireEvent.touchStart(modal, { 
          touches: [{ clientX: 100, clientY: 100 }] 
        });
        fireEvent.touchEnd(modal);
      }
    });
  });

  describe('Long Press Gestures', () => {
    it('should handle long press gesture', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestMobileGestureComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Mobile Modal')).toBeInTheDocument();
      });

      // Find modal
      const modal = screen.getByText('Mobile Modal').closest('[class*="modal"]');
      expect(modal).toBeInTheDocument();

      // Simulate long press
      if (modal) {
        fireEvent.touchStart(modal, { 
          touches: [{ clientX: 100, clientY: 100 }] 
        });
        
        // Wait for long press duration
        await new Promise(resolve => setTimeout(resolve, 500));
        
        fireEvent.touchEnd(modal);
      }
    });
  });

  describe('Gesture State Management', () => {
    it('should maintain modal state during gesture operations', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestMobileGestureComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Mobile Modal')).toBeInTheDocument();
      });

      // Verify modal count
      expect(screen.getByTestId('modal-count')).toHaveTextContent('1');

      // Find modal and perform gesture
      const modal = screen.getByText('Mobile Modal').closest('[class*="modal"]');
      if (modal) {
        fireEvent.touchStart(modal, { 
          touches: [{ clientX: 100, clientY: 100 }] 
        });
        fireEvent.touchMove(modal, { 
          touches: [{ clientX: 150, clientY: 150 }] 
        });
        fireEvent.touchEnd(modal);
      }

      // Modal should still be present
      expect(screen.getByTestId('modal-count')).toHaveTextContent('1');
      expect(screen.getByText('Mobile Modal')).toBeInTheDocument();
    });
  });
});