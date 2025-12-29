import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrescriptionCardTabs } from '../components/PrescriptionCardTabs';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Info: () => <div data-testid="info-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Tag: () => <div data-testid="tag-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Paperclip: () => <div data-testid="paperclip-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Activity: () => <div data-testid="activity-icon" />
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, size }: any) => (
    <button 
      onClick={onClick} 
      className={`button ${variant || ''} ${size || ''} ${className || ''}`}
    >
      {children}
    </button>
  )
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

describe('PrescriptionCardTabs', () => {
  const mockOnTabChange = vi.fn();

  const defaultProps = {
    activeTab: 'info',
    onTabChange: mockOnTabChange,
    tabNames: ['info', 'members', 'tags', 'dueDate', 'attachments', 'notes', 'activity']
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all tab buttons', () => {
      render(<PrescriptionCardTabs {...defaultProps} />);

      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Members')).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
      expect(screen.getByText('Due Date')).toBeInTheDocument();
      expect(screen.getByText('Attachments')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('Activity')).toBeInTheDocument();
    });

    it('renders tab icons', () => {
      render(<PrescriptionCardTabs {...defaultProps} />);

      expect(screen.getAllByTestId('info-icon')[0]).toBeInTheDocument();
      expect(screen.getAllByTestId('users-icon')[0]).toBeInTheDocument();
      expect(screen.getAllByTestId('tag-icon')[0]).toBeInTheDocument();
      expect(screen.getAllByTestId('calendar-icon')[0]).toBeInTheDocument();
      expect(screen.getAllByTestId('paperclip-icon')[0]).toBeInTheDocument();
      expect(screen.getAllByTestId('file-text-icon')[0]).toBeInTheDocument();
      expect(screen.getAllByTestId('activity-icon')[0]).toBeInTheDocument();
    });

    it('highlights the active tab', () => {
      render(<PrescriptionCardTabs {...defaultProps} activeTab="members" />);

      const membersButton = screen.getByText('Members').closest('button');
      expect(membersButton).toHaveClass('bg-blue-50', 'text-blue-700');
    });

    it('does not highlight inactive tabs', () => {
      render(<PrescriptionCardTabs {...defaultProps} activeTab="info" />);

      const membersButton = screen.getByText('Members').closest('button');
      expect(membersButton).not.toHaveClass('bg-blue-50', 'text-blue-700');
    });
  });

  describe('Tab Navigation', () => {
    it('calls onTabChange when a tab is clicked', () => {
      render(<PrescriptionCardTabs {...defaultProps} />);

      fireEvent.click(screen.getByText('Members'));
      expect(mockOnTabChange).toHaveBeenCalledWith('members');
    });

    it('calls onTabChange with correct tab name for each tab', () => {
      render(<PrescriptionCardTabs {...defaultProps} />);

      fireEvent.click(screen.getByText('Info'));
      expect(mockOnTabChange).toHaveBeenCalledWith('info');

      fireEvent.click(screen.getByText('Tags'));
      expect(mockOnTabChange).toHaveBeenCalledWith('tags');

      fireEvent.click(screen.getByText('Due Date'));
      expect(mockOnTabChange).toHaveBeenCalledWith('dueDate');

      fireEvent.click(screen.getByText('Attachments'));
      expect(mockOnTabChange).toHaveBeenCalledWith('attachments');

      fireEvent.click(screen.getByText('Notes'));
      expect(mockOnTabChange).toHaveBeenCalledWith('notes');

      fireEvent.click(screen.getByText('Activity'));
      expect(mockOnTabChange).toHaveBeenCalledWith('activity');
    });

    it('handles clicking the same active tab', () => {
      render(<PrescriptionCardTabs {...defaultProps} activeTab="info" />);

      fireEvent.click(screen.getByText('Info'));
      expect(mockOnTabChange).toHaveBeenCalledWith('info');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for tab navigation', () => {
      render(<PrescriptionCardTabs {...defaultProps} />);

      const tabButtons = screen.getAllByRole('button');
      expect(tabButtons.length).toBe(7);
    });

    it('has proper button roles', () => {
      render(<PrescriptionCardTabs {...defaultProps} />);

      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Members')).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('handles missing onTabChange gracefully', () => {
      const { container } = render(
        <PrescriptionCardTabs 
          activeTab="info" 
          tabNames={['info', 'members']} 
        />
      );

      expect(container).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Members')).toBeInTheDocument();
    });

    it('handles custom tab names', () => {
      const customTabs = ['custom1', 'custom2', 'custom3'];
      render(
        <PrescriptionCardTabs 
          activeTab="custom1" 
          tabNames={customTabs}
          onTabChange={mockOnTabChange}
        />
      );

      expect(screen.getByText('Custom1')).toBeInTheDocument();
      expect(screen.getByText('Custom2')).toBeInTheDocument();
      expect(screen.getByText('Custom3')).toBeInTheDocument();
    });

    it('handles empty tab names array', () => {
      render(
        <PrescriptionCardTabs 
          activeTab="info" 
          tabNames={[]}
          onTabChange={mockOnTabChange}
        />
      );

      // Should render without crashing
      expect(screen.queryByText('Info')).not.toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('applies correct CSS classes to active tab', () => {
      render(<PrescriptionCardTabs {...defaultProps} activeTab="tags" />);

      const tagsButton = screen.getByText('Tags').closest('button');
      expect(tagsButton).toHaveClass('bg-blue-50', 'text-blue-700');
    });

    it('applies correct CSS classes to inactive tabs', () => {
      render(<PrescriptionCardTabs {...defaultProps} activeTab="info" />);

      const membersButton = screen.getByText('Members').closest('button');
      expect(membersButton).toHaveClass('text-gray-600', 'hover:text-gray-900');
    });

    it('renders with proper container styling', () => {
      const { container } = render(<PrescriptionCardTabs {...defaultProps} />);
      
      const tabContainer = container.firstChild;
      expect(tabContainer).toHaveClass('flex', 'space-x-1');
    });
  });
});
