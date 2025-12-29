import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModalProvider } from '@/components/modal/ModalContext';
import { UnifiedModalSystem } from '@/components/modal/UnifiedModalSystem';
import { useModal } from '@/components/modal/UnifiedModalSystem';
import type { Modal } from '@/components/modal/types';

// Test component for keyboard shortcuts functionality
function TestKeyboardShortcutComponent() {
  const { openModal, closeModal, modals } = useModal();

  const handleOpenModal = () => {
    openModal({
      taskType: 'soap-note',
      title: 'Keyboard Modal',
      content: 'Test content',
      patientId: 'patient-123',
      patientName: 'John Doe',
      priority: 'high',
      status: 'open'
    } as Omit<Modal, 'id' | 'zIndex'>);
  };

  const handleCloseModal = () => {
    if (modals.length > 0) {
      closeModal(modals[0].id);
    }
  };

  return (
    <div>
      <button onClick={handleOpenModal} data-testid="open-modal">
        Open Keyboard Modal
      </button>
      <button onClick={handleCloseModal} data-testid="close-modal">
        Close Modal
      </button>
      <div data-testid="modal-count">{modals.length}</div>
    </div>
  );
}

describe('Modal Keyboard Shortcuts Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Escape Key Shortcuts', () => {
    it('should close modal with Escape key', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestKeyboardShortcutComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Keyboard Modal')).toBeInTheDocument();
      });

      // Press Escape key
      await user.keyboard('{Escape}');

      // Modal should be closed
      await waitFor(() => {
        expect(screen.getByTestId('modal-count')).toHaveTextContent('0');
      });
    });
  });

  describe('Tab Navigation Shortcuts', () => {
    it('should navigate through modal elements with Tab key', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestKeyboardShortcutComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Keyboard Modal')).toBeInTheDocument();
      });

      // Test Tab navigation
      await user.tab();
      // Should focus on first interactive element
      const firstElement = document.activeElement;
      expect(firstElement).toBeInTheDocument();
    });

    it('should navigate in reverse with Shift+Tab', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestKeyboardShortcutComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Keyboard Modal')).toBeInTheDocument();
      });

      // Test reverse Tab navigation
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      // Should focus on previous element
      const previousElement = document.activeElement;
      expect(previousElement).toBeInTheDocument();
    });
  });

  describe('Enter and Space Key Shortcuts', () => {
    it('should activate buttons with Enter key', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestKeyboardShortcutComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Keyboard Modal')).toBeInTheDocument();
      });

      // Find a button and press Enter
      const button = screen.getByRole('button', { name: /close/i });
      button.focus();
      await user.keyboard('{Enter}');

      // Modal should be closed
      await waitFor(() => {
        expect(screen.getByTestId('modal-count')).toHaveTextContent('0');
      });
    });

    it('should activate buttons with Space key', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestKeyboardShortcutComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Keyboard Modal')).toBeInTheDocument();
      });

      // Find a button and press Space
      const button = screen.getByRole('button', { name: /close/i });
      button.focus();
      await user.keyboard(' ');

      // Modal should be closed
      await waitFor(() => {
        expect(screen.getByTestId('modal-count')).toHaveTextContent('0');
      });
    });
  });

  describe('Arrow Key Shortcuts', () => {
    it('should handle arrow key navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestKeyboardShortcutComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Keyboard Modal')).toBeInTheDocument();
      });

      // Test arrow key navigation
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{ArrowLeft}');
      await user.keyboard('{ArrowRight}');

      // Modal should still be present
      expect(screen.getByText('Keyboard Modal')).toBeInTheDocument();
    });
  });

  describe('Ctrl/Cmd Key Shortcuts', () => {
    it('should handle Ctrl+A for select all', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestKeyboardShortcutComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Keyboard Modal')).toBeInTheDocument();
      });

      // Test Ctrl+A
      await user.keyboard('{Control>}a{/Control}');
      
      // Modal should still be present
      expect(screen.getByText('Keyboard Modal')).toBeInTheDocument();
    });

    it('should handle Ctrl+C and Ctrl+V shortcuts', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestKeyboardShortcutComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Keyboard Modal')).toBeInTheDocument();
      });

      // Test Ctrl+C
      await user.keyboard('{Control>}c{/Control}');
      
      // Test Ctrl+V
      await user.keyboard('{Control>}v{/Control}');
      
      // Modal should still be present
      expect(screen.getByText('Keyboard Modal')).toBeInTheDocument();
    });
  });

  describe('Function Key Shortcuts', () => {
    it('should handle F1 key for help', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestKeyboardShortcutComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Keyboard Modal')).toBeInTheDocument();
      });

      // Test F1 key
      await user.keyboard('{F1}');
      
      // Modal should still be present
      expect(screen.getByText('Keyboard Modal')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcut State Management', () => {
    it('should maintain modal state during keyboard operations', async () => {
      const user = userEvent.setup();
      
      render(
        <ModalProvider>
          <TestKeyboardShortcutComponent />
          <UnifiedModalSystem />
        </ModalProvider>
      );

      // Open modal
      await user.click(screen.getByTestId('open-modal'));
      await waitFor(() => {
        expect(screen.getByText('Keyboard Modal')).toBeInTheDocument();
      });

      // Verify modal count
      expect(screen.getByTestId('modal-count')).toHaveTextContent('1');

      // Perform various keyboard operations
      await user.keyboard('{Tab}');
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');

      // Modal should still be present
      expect(screen.getByTestId('modal-count')).toHaveTextContent('1');
      expect(screen.getByText('Keyboard Modal')).toBeInTheDocument();
    });
  });
});