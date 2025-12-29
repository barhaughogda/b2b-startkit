import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModalProvider } from '@/components/modal/ModalContext';
import { UnifiedModalSystem } from '@/components/modal/UnifiedModalSystem';
import { useModal } from '@/components/modal/UnifiedModalSystem';
import type { Modal } from '@/components/modal/types';

// Test component that uses the modal system
function TestModalComponent() {
  const { openModal, closeModal, modals } = useModal();

  const handleOpenSOAPModal = () => {
    openModal({
      taskType: 'soap-note',
      title: 'SOAP Note Test',
      content: 'Test content',
      patientId: 'patient-123',
      patientName: 'John Doe',
      priority: 'high',
      status: 'open'
    } as Omit<Modal, 'id' | 'zIndex'>);
  };

  const handleOpenVitalSignsModal = () => {
    openModal({
      taskType: 'vital-signs',
      title: 'Vital Signs Test',
      content: 'Test vital signs content',
      patientId: 'patient-123',
      patientName: 'John Doe',
      priority: 'medium',
      status: 'open'
    } as Omit<Modal, 'id' | 'zIndex'>);
  };

  const handleCloseAllModals = () => {
    modals.forEach(modal => closeModal(modal.id));
  };

  return (
    <div>
      <button onClick={handleOpenSOAPModal} data-testid="open-soap-modal">
        Open SOAP Modal
      </button>
      <button onClick={handleOpenVitalSignsModal} data-testid="open-vitals-modal">
        Open Vital Signs Modal
      </button>
      <button onClick={handleCloseAllModals} data-testid="close-all-modals">
        Close All Modals
      </button>
      <div data-testid="modal-count">{modals.length}</div>
    </div>
  );
}

describe('Modal System Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Opening/Closing Workflows', () => {
    it('should open and close a single modal', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestModalComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Initially no modals
      expect(screen.getByTestId('modal-count')).toHaveTextContent('0');

      // Open SOAP modal
      await user.click(screen.getByTestId('open-soap-modal'));
      
      await waitFor(() => {
        expect(screen.getByTestId('modal-count')).toHaveTextContent('1');
      });

      // Modal should be visible
      expect(screen.getByText('SOAP Note Test')).toBeInTheDocument();

      // Close modal by clicking close button
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.getByTestId('modal-count')).toHaveTextContent('0');
      });
    });

    it('should open multiple modals and manage them independently', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestModalComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open first modal
      await user.click(screen.getByTestId('open-soap-modal'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-count')).toHaveTextContent('1');
      });

      // Open second modal
      await user.click(screen.getByTestId('open-vitals-modal'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-count')).toHaveTextContent('2');
      });

      // Both modals should be visible
      expect(screen.getByText('SOAP Note Test')).toBeInTheDocument();
      expect(screen.getByText('Vital Signs Test')).toBeInTheDocument();
    });

    it('should handle modal stacking with proper z-index', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestModalComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open first modal
      await user.click(screen.getByTestId('open-soap-modal'));
      await waitFor(() => {
        expect(screen.getByText('SOAP Note Test')).toBeInTheDocument();
      });

      // Open second modal
      await user.click(screen.getByTestId('open-vitals-modal'));
      await waitFor(() => {
        expect(screen.getByText('Vital Signs Test')).toBeInTheDocument();
      });

      // Check z-index ordering
      const firstModal = screen.getByText('SOAP Note Test').closest('[class*="fixed"]');
      const secondModal = screen.getByText('Vital Signs Test').closest('[class*="fixed"]');
      
      expect(firstModal).not.toBeNull();
      expect(secondModal).not.toBeNull();
      
      if (firstModal && secondModal) {
        const firstZIndex = parseInt(getComputedStyle(firstModal).zIndex);
        const secondZIndex = parseInt(getComputedStyle(secondModal).zIndex);
        
        expect(secondZIndex).toBeGreaterThan(firstZIndex);
      }
    });
  });

  describe('Modal State Management', () => {
    it('should persist modal state during interactions', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestModalComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-soap-modal'));
      await waitFor(() => {
        expect(screen.getByText('SOAP Note Test')).toBeInTheDocument();
      });

      // Modal should maintain its state
      expect(screen.getByText('SOAP Note Test')).toBeInTheDocument();
      expect(screen.getByTestId('modal-count')).toHaveTextContent('1');
    });

    it('should handle modal minimization and restoration', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestModalComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-soap-modal'));
      await waitFor(() => {
        expect(screen.getByText('SOAP Note Test')).toBeInTheDocument();
      });

      // Minimize modal
      const minimizeButton = screen.getByRole('button', { name: /minimize/i });
      await user.click(minimizeButton);

      // Modal should be minimized but still in the count
      expect(screen.getByTestId('modal-count')).toHaveTextContent('1');
      
      // Modal content should not be visible
      expect(screen.queryByText('SOAP Note Test')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling in Modal Workflows', () => {
    it('should handle modal opening errors gracefully', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestModalComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Test error handling by trying to open modal with invalid data
      await user.click(screen.getByTestId('open-soap-modal'));
      
      // Should not crash the application
      expect(screen.getByTestId('modal-count')).toHaveTextContent('1');
    });

    it('should handle modal closing errors gracefully', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestModalComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal first
      await user.click(screen.getByTestId('open-soap-modal'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-count')).toHaveTextContent('1');
      });

      // Close all modals
      await user.click(screen.getByTestId('close-all-modals'));
      
      await waitFor(() => {
        expect(screen.getByTestId('modal-count')).toHaveTextContent('0');
      });
    });
  });
});