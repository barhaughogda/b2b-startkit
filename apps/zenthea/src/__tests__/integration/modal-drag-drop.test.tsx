import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModalProvider } from '@/components/modal/ModalContext';
import { UnifiedModalSystem } from '@/components/modal/UnifiedModalSystem';
import { useModal } from '@/components/modal/UnifiedModalSystem';
import type { Modal } from '@/components/modal/types';

// Test component for drag and drop functionality
function TestDragDropComponent() {
  const { openModal, modals } = useModal();

  const handleOpenModal = () => {
    openModal({
      taskType: 'soap-note',
      title: 'Draggable Modal',
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
        Open Draggable Modal
      </button>
      <div data-testid="modal-count">{modals.length}</div>
    </div>
  );
}

describe('Modal Drag and Drop Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mouse Drag Events', () => {
    it('should handle mouse drag events on modal header', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestDragDropComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Draggable Modal')).toBeInTheDocument();
      });

      // Find modal header
      const modalHeader = screen.getByText('Draggable Modal').closest('[class*="header"]');
      expect(modalHeader).toBeInTheDocument();

      if (modalHeader) {
        // Test mouse down event
        fireEvent.mouseDown(modalHeader, { clientX: 100, clientY: 100 });
        
        // Test mouse move event
        fireEvent.mouseMove(modalHeader, { clientX: 150, clientY: 150 });
        
        // Test mouse up event
        fireEvent.mouseUp(modalHeader);
      }
    });

    it('should handle drag start and drag end events', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestDragDropComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Draggable Modal')).toBeInTheDocument();
      });

      // Find modal header
      const modalHeader = screen.getByText('Draggable Modal').closest('[class*="header"]');
      expect(modalHeader).toBeInTheDocument();

      if (modalHeader) {
        // Test drag start
        fireEvent.dragStart(modalHeader);
        
        // Test drag end
        fireEvent.dragEnd(modalHeader);
      }
    });
  });

  describe('Touch Drag Events', () => {
    it('should handle touch drag events on modal header', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestDragDropComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Draggable Modal')).toBeInTheDocument();
      });

      // Find modal header
      const modalHeader = screen.getByText('Draggable Modal').closest('[class*="header"]');
      expect(modalHeader).toBeInTheDocument();

      if (modalHeader) {
        // Test touch start event
        fireEvent.touchStart(modalHeader, { 
          touches: [{ clientX: 100, clientY: 100 }] 
        });
        
        // Test touch move event
        fireEvent.touchMove(modalHeader, { 
          touches: [{ clientX: 150, clientY: 150 }] 
        });
        
        // Test touch end event
        fireEvent.touchEnd(modalHeader);
      }
    });
  });

  describe('Modal Resize Events', () => {
    it('should handle resize events on modal', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestDragDropComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Draggable Modal')).toBeInTheDocument();
      });

      // Find modal
      const modal = screen.getByText('Draggable Modal').closest('[class*="modal"]');
      expect(modal).toBeInTheDocument();

      // Test resize event
      if (modal) {
        fireEvent.resize(modal);
      }
    });
  });

  describe('Drag and Drop State Management', () => {
    it('should maintain modal state during drag operations', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestDragDropComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Draggable Modal')).toBeInTheDocument();
      });

      // Verify modal count
      expect(screen.getByTestId('modal-count')).toHaveTextContent('1');

      // Find modal header and perform drag
      const modalHeader = screen.getByText('Draggable Modal').closest('[class*="header"]');
      if (modalHeader) {
        fireEvent.mouseDown(modalHeader, { clientX: 100, clientY: 100 });
        fireEvent.mouseMove(modalHeader, { clientX: 150, clientY: 150 });
        fireEvent.mouseUp(modalHeader);
      }

      // Modal should still be present
      expect(screen.getByTestId('modal-count')).toHaveTextContent('1');
      expect(screen.getByText('Draggable Modal')).toBeInTheDocument();
    });
  });
});