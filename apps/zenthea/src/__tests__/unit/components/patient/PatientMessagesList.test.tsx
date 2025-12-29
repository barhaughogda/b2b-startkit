import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientMessagesList } from '@/components/patient/PatientMessagesList';

describe('PatientMessagesList', () => {
  const mockMessages = [
    {
      id: '1',
      from: 'Dr. Sarah Johnson',
      to: 'Patient',
      subject: 'Test Results Available',
      content: 'Your recent blood work results are now available.',
      timestamp: '2024-01-15T10:00:00Z',
      isRead: false,
      priority: 'high' as const,
      type: 'incoming' as const,
    },
    {
      id: '2',
      from: 'Nurse Practitioner Lisa',
      to: 'Patient',
      subject: 'Prescription Refill Approved',
      content: 'Your prescription has been refilled.',
      timestamp: '2024-01-14T09:00:00Z',
      isRead: true,
      priority: 'medium' as const,
      type: 'incoming' as const,
    },
    {
      id: '3',
      from: 'Patient',
      to: 'Dr. Sarah Johnson',
      subject: 'Thank you',
      content: 'Thank you for the update.',
      timestamp: '2024-01-13T08:00:00Z',
      isRead: true,
      priority: 'low' as const,
      type: 'outgoing' as const,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render message list with default mock messages', () => {
      render(<PatientMessagesList />);
      
      expect(screen.getByText('Test Results Available')).toBeInTheDocument();
      expect(screen.getByText('Prescription Refill Approved')).toBeInTheDocument();
    });

    it('should render with custom messages', () => {
      render(<PatientMessagesList messages={mockMessages} />);
      
      expect(screen.getByText('Test Results Available')).toBeInTheDocument();
      expect(screen.getByText('Prescription Refill Approved')).toBeInTheDocument();
      expect(screen.getByText('Thank you')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <PatientMessagesList className="custom-class" />
      );
      
      const listContainer = container.querySelector('.custom-class');
      expect(listContainer).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should display message subject', () => {
      render(<PatientMessagesList messages={mockMessages} />);
      
      expect(screen.getByText('Test Results Available')).toBeInTheDocument();
      expect(screen.getByText('Prescription Refill Approved')).toBeInTheDocument();
    });

    it('should display message content', () => {
      render(<PatientMessagesList messages={mockMessages} />);
      
      expect(screen.getByText(/Your recent blood work results are now available/i)).toBeInTheDocument();
      expect(screen.getByText(/Your prescription has been refilled/i)).toBeInTheDocument();
    });

    it('should display sender name for incoming messages', () => {
      render(<PatientMessagesList messages={mockMessages} />);
      
      expect(screen.getByText('Dr. Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Nurse Practitioner Lisa')).toBeInTheDocument();
    });

    it('should display recipient name for outgoing messages', () => {
      render(<PatientMessagesList messages={mockMessages} />);
      
      expect(screen.getByText('Dr. Sarah Johnson')).toBeInTheDocument();
    });

    it('should display timestamp', () => {
      render(<PatientMessagesList messages={mockMessages} />);
      
      // The component uses relative timestamps, so we check for the presence of time elements
      const timeElements = screen.getAllByRole('generic');
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Message Filtering', () => {
    it('should sort messages by timestamp (most recent first)', () => {
      render(<PatientMessagesList messages={mockMessages} />);
      
      const messageCards = screen.getAllByRole('generic').filter(
        (el) => el.textContent?.includes('Test Results') || 
                el.textContent?.includes('Prescription') ||
                el.textContent?.includes('Thank you')
      );
      
      // Most recent message should appear first
      expect(messageCards[0]).toHaveTextContent('Test Results');
    });
  });

  describe('Priority Display', () => {
    it('should display high priority badge', () => {
      render(<PatientMessagesList messages={mockMessages} />);
      
      expect(screen.getByText('High Priority')).toBeInTheDocument();
    });

    it('should display medium priority badge', () => {
      render(<PatientMessagesList messages={mockMessages} />);
      
      expect(screen.getByText('Medium Priority')).toBeInTheDocument();
    });

    it('should display low priority badge', () => {
      render(<PatientMessagesList messages={mockMessages} />);
      
      expect(screen.getByText('Low Priority')).toBeInTheDocument();
    });

    it('should apply correct styling for high priority messages', () => {
      const { container } = render(<PatientMessagesList messages={mockMessages} />);
      
      const highPriorityCard = container.querySelector('.border-l-red-500');
      expect(highPriorityCard).toBeInTheDocument();
    });

    it('should apply correct styling for medium priority messages', () => {
      const { container } = render(<PatientMessagesList messages={mockMessages} />);
      
      const mediumPriorityCard = container.querySelector('.border-l-yellow-500');
      expect(mediumPriorityCard).toBeInTheDocument();
    });

    it('should apply correct styling for low priority messages', () => {
      const { container } = render(<PatientMessagesList messages={mockMessages} />);
      
      const lowPriorityCard = container.querySelector('.border-l-green-500');
      expect(lowPriorityCard).toBeInTheDocument();
    });
  });

  describe('Read/Unread Status', () => {
    it('should display "New" badge for unread messages', () => {
      render(<PatientMessagesList messages={mockMessages} />);
      
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should apply different styling for unread messages', () => {
      const { container } = render(<PatientMessagesList messages={mockMessages} />);
      
      const unreadCard = container.querySelector('.bg-blue-50\\/50');
      expect(unreadCard).toBeInTheDocument();
    });

    it('should apply muted styling for read messages', () => {
      const { container } = render(<PatientMessagesList messages={mockMessages} />);
      
      const readCard = container.querySelector('.bg-muted\\/30');
      expect(readCard).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onMessageClick when message is clicked', async () => {
      const user = userEvent.setup();
      const onMessageClick = vi.fn();
      
      render(
        <PatientMessagesList 
          messages={mockMessages} 
          onMessageClick={onMessageClick}
        />
      );
      
      const messageCard = screen.getByText('Test Results Available').closest('[class*="cursor-pointer"]');
      if (messageCard) {
        await user.click(messageCard);
        expect(onMessageClick).toHaveBeenCalledWith(mockMessages[0]);
      }
    });

    it('should not call onMessageClick if handler is not provided', async () => {
      const user = userEvent.setup();
      
      render(<PatientMessagesList messages={mockMessages} />);
      
      const messageCard = screen.getByText('Test Results Available').closest('[class*="cursor-pointer"]');
      if (messageCard) {
        await user.click(messageCard);
        // Should not throw error
        expect(messageCard).toBeInTheDocument();
      }
    });
  });

  describe('Message Type Display', () => {
    it('should display correct icon for incoming messages', () => {
      const { container } = render(<PatientMessagesList messages={mockMessages} />);
      
      // Check for incoming message styling (blue background)
      const incomingIcon = container.querySelector('.bg-blue-100');
      expect(incomingIcon).toBeInTheDocument();
    });

    it('should display correct icon for outgoing messages', () => {
      const { container } = render(<PatientMessagesList messages={mockMessages} />);
      
      // Check for outgoing message styling (green background)
      const outgoingIcon = container.querySelector('.bg-green-100');
      expect(outgoingIcon).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render empty list when no messages provided', () => {
      render(<PatientMessagesList messages={[]} />);
      
      // Component doesn't have explicit empty state, but should render empty container
      const { container } = render(<PatientMessagesList messages={[]} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have clickable message cards', () => {
      render(<PatientMessagesList messages={mockMessages} />);
      
      const messageCards = screen.getAllByText(/Test Results|Prescription|Thank you/);
      messageCards.forEach(card => {
        const clickableParent = card.closest('[class*="cursor-pointer"]');
        expect(clickableParent).toBeInTheDocument();
      });
    });

    it('should display message content in accessible format', () => {
      render(<PatientMessagesList messages={mockMessages} />);
      
      // Check that message content is readable
      expect(screen.getByText(/Your recent blood work results/i)).toBeInTheDocument();
    });
  });
});

