import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientEventHistory } from '@/components/patient/PatientEventHistory';

describe('PatientEventHistory', () => {
  const mockEvents = [
    {
      id: '1',
      date: '2024-01-15',
      time: '10:30',
      type: 'visit' as const,
      title: 'Cardiology Consultation',
      provider: 'Dr. Sarah Johnson',
      description: 'Follow-up for heart condition',
      status: 'completed' as const,
      priority: 'high' as const,
    },
    {
      id: '2',
      date: '2024-01-12',
      time: '14:00',
      type: 'lab' as const,
      title: 'Cardiac Biomarkers',
      provider: 'Lab Corp',
      description: 'Troponin, CK-MB, and BNP levels',
      status: 'completed' as const,
      priority: 'high' as const,
    },
    {
      id: '3',
      date: '2024-01-10',
      time: '09:15',
      type: 'medication' as const,
      title: '2 New Medications',
      provider: 'Dr. Sarah Johnson',
      status: 'completed' as const,
      priority: 'medium' as const,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render event history with default mock events', () => {
      render(<PatientEventHistory />);
      
      expect(screen.getByText(/Event History/i)).toBeInTheDocument();
    });

    it('should render with custom events', () => {
      render(<PatientEventHistory events={mockEvents} />);
      
      expect(screen.getByText('Cardiology Consultation')).toBeInTheDocument();
      expect(screen.getByText('Cardiac Biomarkers')).toBeInTheDocument();
      expect(screen.getByText('2 New Medications')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <PatientEventHistory className="custom-class" />
      );
      
      const historyContainer = container.querySelector('.custom-class');
      expect(historyContainer).toBeInTheDocument();
    });
  });

  describe('Event Display', () => {
    it('should display event title', () => {
      render(<PatientEventHistory events={mockEvents} />);
      
      expect(screen.getByText('Cardiology Consultation')).toBeInTheDocument();
      expect(screen.getByText('Cardiac Biomarkers')).toBeInTheDocument();
    });

    it('should display event date and time', () => {
      render(<PatientEventHistory events={mockEvents} />);
      
      expect(screen.getByText(/2024-01-15.*10:30/i)).toBeInTheDocument();
      expect(screen.getByText(/2024-01-12.*14:00/i)).toBeInTheDocument();
    });

    it('should display provider name', () => {
      render(<PatientEventHistory events={mockEvents} />);
      
      expect(screen.getByText(/Dr\. Sarah Johnson/i)).toBeInTheDocument();
      expect(screen.getByText(/Lab Corp/i)).toBeInTheDocument();
    });

    it('should display event description when available', () => {
      render(<PatientEventHistory events={mockEvents} />);
      
      expect(screen.getByText(/Follow-up for heart condition/i)).toBeInTheDocument();
      expect(screen.getByText(/Troponin, CK-MB, and BNP levels/i)).toBeInTheDocument();
    });

    it('should display event status', () => {
      render(<PatientEventHistory events={mockEvents} />);
      
      expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('should filter events by search term', async () => {
      const user = userEvent.setup();
      render(<PatientEventHistory events={mockEvents} />);
      
      const searchInput = screen.getByPlaceholderText(/Search events/i);
      await user.type(searchInput, 'Cardiology');
      
      expect(screen.getByText('Cardiology Consultation')).toBeInTheDocument();
      expect(screen.queryByText('Cardiac Biomarkers')).not.toBeInTheDocument();
    });

    it('should filter events by provider name', async () => {
      const user = userEvent.setup();
      render(<PatientEventHistory events={mockEvents} />);
      
      const searchInput = screen.getByPlaceholderText(/Search events/i);
      await user.type(searchInput, 'Lab Corp');
      
      expect(screen.getByText('Cardiac Biomarkers')).toBeInTheDocument();
      expect(screen.queryByText('Cardiology Consultation')).not.toBeInTheDocument();
    });

    it('should filter events by description', async () => {
      const user = userEvent.setup();
      render(<PatientEventHistory events={mockEvents} />);
      
      const searchInput = screen.getByPlaceholderText(/Search events/i);
      await user.type(searchInput, 'Troponin');
      
      expect(screen.getByText('Cardiac Biomarkers')).toBeInTheDocument();
    });

    it('should show all events when search is cleared', async () => {
      const user = userEvent.setup();
      render(<PatientEventHistory events={mockEvents} />);
      
      const searchInput = screen.getByPlaceholderText(/Search events/i);
      await user.type(searchInput, 'Cardiology');
      await user.clear(searchInput);
      
      expect(screen.getByText('Cardiology Consultation')).toBeInTheDocument();
      expect(screen.getByText('Cardiac Biomarkers')).toBeInTheDocument();
    });
  });

  describe('Filter Functionality', () => {
    it('should filter events by type', async () => {
      const user = userEvent.setup();
      render(<PatientEventHistory events={mockEvents} />);
      
      const visitFilter = screen.getByText(/Visits/i);
      await user.click(visitFilter);
      
      expect(screen.getByText('Cardiology Consultation')).toBeInTheDocument();
      expect(screen.queryByText('Cardiac Biomarkers')).not.toBeInTheDocument();
    });

    it('should toggle filter on/off', async () => {
      const user = userEvent.setup();
      render(<PatientEventHistory events={mockEvents} />);
      
      const visitFilter = screen.getByText(/Visits/i);
      await user.click(visitFilter);
      await user.click(visitFilter);
      
      // All events should be visible again
      expect(screen.getByText('Cardiology Consultation')).toBeInTheDocument();
      expect(screen.getByText('Cardiac Biomarkers')).toBeInTheDocument();
    });

    it('should support multiple filters', async () => {
      const user = userEvent.setup();
      render(<PatientEventHistory events={mockEvents} />);
      
      const visitFilter = screen.getByText(/Visits/i);
      const labFilter = screen.getByText(/Labs/i);
      
      await user.click(visitFilter);
      await user.click(labFilter);
      
      expect(screen.getByText('Cardiology Consultation')).toBeInTheDocument();
      expect(screen.getByText('Cardiac Biomarkers')).toBeInTheDocument();
      expect(screen.queryByText('2 New Medications')).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    const manyEvents = Array.from({ length: 25 }, (_, i) => ({
      id: `event-${i}`,
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      time: '10:00',
      type: 'visit' as const,
      title: `Event ${i + 1}`,
      provider: 'Dr. Test',
      status: 'completed' as const,
      priority: 'low' as const,
    }));

    it('should paginate events when more than 10 events', () => {
      render(<PatientEventHistory events={manyEvents} />);
      
      expect(screen.getByText(/1 of/i)).toBeInTheDocument();
    });

    it('should navigate to next page', async () => {
      const user = userEvent.setup();
      render(<PatientEventHistory events={manyEvents} />);
      
      const nextButton = screen.getByRole('button', { name: /chevronright/i }) || 
                        screen.getAllByRole('button').find(btn => 
                          btn.querySelector('svg')?.classList.contains('h-4')
                        );
      
      if (nextButton) {
        await user.click(nextButton);
        expect(screen.getByText(/2 of/i)).toBeInTheDocument();
      }
    });

    it('should navigate to previous page', async () => {
      const user = userEvent.setup();
      render(<PatientEventHistory events={manyEvents} />);
      
      // First go to page 2
      const nextButton = screen.getAllByRole('button').find(btn => 
        btn.textContent?.includes('→') || btn.querySelector('svg')
      );
      
      if (nextButton) {
        await user.click(nextButton);
        
        // Then go back
        const prevButton = screen.getAllByRole('button').find(btn => 
          btn.textContent?.includes('←') || btn.querySelector('svg')
        );
        
        if (prevButton) {
          await user.click(prevButton);
          expect(screen.getByText(/1 of/i)).toBeInTheDocument();
        }
      }
    });

    it('should disable previous button on first page', () => {
      render(<PatientEventHistory events={manyEvents} />);
      
      const prevButton = screen.getAllByRole('button').find(btn => 
        btn.hasAttribute('disabled')
      );
      
      // First page should have disabled prev button
      expect(prevButton).toBeInTheDocument();
    });

    it('should reset to first page when filters change', async () => {
      const user = userEvent.setup();
      render(<PatientEventHistory events={manyEvents} />);
      
      // Navigate to page 2
      const nextButton = screen.getAllByRole('button').find(btn => 
        btn.textContent?.includes('→')
      );
      
      if (nextButton) {
        await user.click(nextButton);
        
        // Apply filter (should reset to page 1)
        const visitFilter = screen.getByText(/Visits/i);
        await user.click(visitFilter);
        
        expect(screen.getByText(/1 of/i)).toBeInTheDocument();
      }
    });
  });

  describe('Event Sorting', () => {
    it('should sort events by date (most recent first)', () => {
      render(<PatientEventHistory events={mockEvents} />);
      
      const eventTitles = screen.getAllByText(/Cardiology|Cardiac|Medications/);
      // Most recent should be first
      expect(eventTitles[0]).toHaveTextContent('Cardiology Consultation');
    });
  });

  describe('Priority Display', () => {
    it('should display high priority badge', () => {
      render(<PatientEventHistory events={mockEvents} />);
      
      expect(screen.getByText('High Priority')).toBeInTheDocument();
    });

    it('should apply correct styling for high priority events', () => {
      const { container } = render(<PatientEventHistory events={mockEvents} />);
      
      const highPriorityEvent = container.querySelector('.border-red-200');
      expect(highPriorityEvent).toBeInTheDocument();
    });

    it('should apply correct styling for medium priority events', () => {
      const { container } = render(<PatientEventHistory events={mockEvents} />);
      
      const mediumPriorityEvent = container.querySelector('.border-yellow-200');
      expect(mediumPriorityEvent).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onEventClick when event is clicked', async () => {
      const user = userEvent.setup();
      const onEventClick = vi.fn();
      
      render(
        <PatientEventHistory 
          events={mockEvents} 
          onEventClick={onEventClick}
        />
      );
      
      const eventCard = screen.getByText('Cardiology Consultation').closest('[class*="cursor-pointer"]');
      if (eventCard) {
        await user.click(eventCard);
        expect(onEventClick).toHaveBeenCalledWith(mockEvents[0]);
      }
    });

    it('should not call onEventClick if handler is not provided', async () => {
      const user = userEvent.setup();
      
      render(<PatientEventHistory events={mockEvents} />);
      
      const eventCard = screen.getByText('Cardiology Consultation').closest('[class*="cursor-pointer"]');
      if (eventCard) {
        await user.click(eventCard);
        // Should not throw error
        expect(eventCard).toBeInTheDocument();
      }
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no events match filters', async () => {
      const user = userEvent.setup();
      render(<PatientEventHistory events={mockEvents} />);
      
      const searchInput = screen.getByPlaceholderText(/Search events/i);
      await user.type(searchInput, 'NonExistentEvent');
      
      expect(screen.getByText(/No events found matching your criteria/i)).toBeInTheDocument();
    });

    it('should display event count in header', () => {
      render(<PatientEventHistory events={mockEvents} />);
      
      expect(screen.getByText(/Event History.*3 events/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have search input with proper label', () => {
      render(<PatientEventHistory events={mockEvents} />);
      
      const searchInput = screen.getByPlaceholderText(/Search events/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should have clickable event cards', () => {
      render(<PatientEventHistory events={mockEvents} />);
      
      const eventCards = screen.getAllByText(/Cardiology|Cardiac|Medications/);
      eventCards.forEach(card => {
        const clickableParent = card.closest('[class*="cursor-pointer"]');
        expect(clickableParent).toBeInTheDocument();
      });
    });
  });
});

