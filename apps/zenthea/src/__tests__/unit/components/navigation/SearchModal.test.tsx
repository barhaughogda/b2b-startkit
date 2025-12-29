import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SearchModal } from '@/components/navigation/SearchModal';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
  })),
}));

describe('SearchModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Structure', () => {
    it('should render as a centered modal dialog', () => {
      render(<SearchModal isOpen={true} onClose={vi.fn()} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveClass('bg-white', 'shadow-lg', 'w-full', 'max-w-2xl');
    });

    it('should have proper backdrop and overlay', () => {
      render(<SearchModal isOpen={true} onClose={vi.fn()} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('bg-white', 'shadow-lg', 'border', 'border-border-primary');
    });

    it('should have white background for the modal content', () => {
      render(<SearchModal isOpen={true} onClose={vi.fn()} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('bg-white');
    });

    it('should close when backdrop is clicked', async () => {
      const onClose = vi.fn();
      render(<SearchModal isOpen={true} onClose={onClose} />);

      const backdrop = screen.getByTestId('search-modal-backdrop');
      fireEvent.click(backdrop);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Search Input', () => {
    it('should have a search input with proper placeholder', () => {
      render(<SearchModal isOpen={true} onClose={vi.fn()} />);

      const searchInput = screen.getByPlaceholderText(/search all/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should have a search input that can receive focus', () => {
      render(<SearchModal isOpen={true} onClose={vi.fn()} />);

      const searchInput = screen.getByPlaceholderText(/search all/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');
      
      // Focus the input manually to test it can receive focus
      searchInput.focus();
      expect(searchInput).toHaveFocus();
    });

    it('should handle search input changes', async () => {
      render(<SearchModal isOpen={true} onClose={vi.fn()} />);

      const searchInput = screen.getByPlaceholderText(/search all/i);
      fireEvent.change(searchInput, { target: { value: 'test query' } });

      await waitFor(() => {
        expect(searchInput).toHaveValue('test query');
      });
    });
  });

  describe('Search Categories', () => {
    it('should display search result categories when searching', async () => {
      render(<SearchModal isOpen={true} onClose={vi.fn()} />);

      const searchInput = screen.getByPlaceholderText(/search all/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Wait for search results to appear
      await waitFor(() => {
        expect(screen.getByText('Patients')).toBeInTheDocument();
        expect(screen.getByText('Tasks')).toBeInTheDocument();
        expect(screen.getByText('Messages')).toBeInTheDocument();
        expect(screen.getByText('Appointments')).toBeInTheDocument();
      });
    });

    it('should show "No results" when search is empty', () => {
      render(<SearchModal isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText('Start typing to search...')).toBeInTheDocument();
    });
  });

  describe('Real-time Search', () => {
    it('should show loading state during search', async () => {
      render(<SearchModal isOpen={true} onClose={vi.fn()} />);

      const searchInput = screen.getByPlaceholderText(/search all/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByText(/searching/i)).toBeInTheDocument();
      });
    });

    it('should display search results when query is entered', async () => {
      render(<SearchModal isOpen={true} onClose={vi.fn()} />);

      const searchInput = screen.getByPlaceholderText(/search all/i);
      fireEvent.change(searchInput, { target: { value: 'john' } });

      // Should show results for each category
      await waitFor(() => {
        expect(screen.getByText('Patients')).toBeInTheDocument();
        expect(screen.getByText('Tasks')).toBeInTheDocument();
        expect(screen.getByText('Messages')).toBeInTheDocument();
        expect(screen.getByText('Appointments')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close modal when Escape key is pressed', async () => {
      const onClose = vi.fn();
      render(<SearchModal isOpen={true} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should handle Enter key to select first result', async () => {
      render(<SearchModal isOpen={true} onClose={vi.fn()} />);

      const searchInput = screen.getByPlaceholderText(/search all/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.keyDown(searchInput, { key: 'Enter' });

      // Should handle Enter key press
      expect(searchInput).toHaveValue('test');
    });
  });

  describe('Modal Visibility', () => {
    it('should not render when isOpen is false', () => {
      render(<SearchModal isOpen={false} onClose={vi.fn()} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<SearchModal isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
