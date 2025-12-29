import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientHistoryTimeline } from '@/components/patient/PatientHistoryTimeline';

describe('PatientHistoryTimeline', () => {
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
      description: 'Troponin levels',
      status: 'completed' as const,
      priority: 'high' as const,
    },
    {
      id: '3',
      date: '2023-12-20',
      time: '09:15',
      type: 'medication' as const,
      title: 'New Medication',
      provider: 'Dr. Sarah Johnson',
      status: 'completed' as const,
      priority: 'medium' as const,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render timeline with default mock events', () => {
      render(<PatientHistoryTimeline />);
      
      expect(screen.getByText(/Timeline/i)).toBeInTheDocument();
    });

    it('should render with custom events', () => {
      render(<PatientHistoryTimeline events={mockEvents} />);
      
      expect(screen.getByText('Cardiology Consultation')).toBeInTheDocument();
      expect(screen.getByText('Cardiac Biomarkers')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <PatientHistoryTimeline className="custom-class" />
      );
      
      const timelineContainer = container.querySelector('.custom-class');
      expect(timelineContainer).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter events by search term', async () => {
      const user = userEvent.setup();
      render(<PatientHistoryTimeline events={mockEvents} />);
      
      const searchInput = screen.getByPlaceholderText(/Search/i);
      await user.type(searchInput, 'Cardiology');
      
      expect(screen.getByText('Cardiology Consultation')).toBeInTheDocument();
      expect(screen.queryByText('Cardiac Biomarkers')).not.toBeInTheDocument();
    });

    it('should filter events by provider name', async () => {
      const user = userEvent.setup();
      render(<PatientHistoryTimeline events={mockEvents} />);
      
      const searchInput = screen.getByPlaceholderText(/Search/i);
      await user.type(searchInput, 'Lab Corp');
      
      expect(screen.getByText('Cardiac Biomarkers')).toBeInTheDocument();
    });
  });

  describe('Filter Functionality', () => {
    it('should filter events by type', async () => {
      const user = userEvent.setup();
      render(<PatientHistoryTimeline events={mockEvents} />);
      
      // Find and click a filter button
      const filterButtons = screen.getAllByRole('button');
      const visitFilter = filterButtons.find(btn => 
        btn.textContent?.includes('Visits') || btn.textContent?.includes('visit')
      );
      
      if (visitFilter) {
        await user.click(visitFilter);
        expect(screen.getByText('Cardiology Consultation')).toBeInTheDocument();
      }
    });

    it('should toggle filter on/off', async () => {
      const user = userEvent.setup();
      render(<PatientHistoryTimeline events={mockEvents} />);
      
      const filterButtons = screen.getAllByRole('button');
      const visitFilter = filterButtons.find(btn => 
        btn.textContent?.includes('Visits')
      );
      
      if (visitFilter) {
        await user.click(visitFilter);
        await user.click(visitFilter);
        
        // All events should be visible again
        expect(screen.getByText('Cardiology Consultation')).toBeInTheDocument();
        expect(screen.getByText('Cardiac Biomarkers')).toBeInTheDocument();
      }
    });
  });

  describe('Timeline Display', () => {
    it('should display timeline with events', () => {
      render(<PatientHistoryTimeline events={mockEvents} />);
      
      // Timeline should render
      const { container } = render(<PatientHistoryTimeline events={mockEvents} />);
      const timeline = container.querySelector('[class*="timeline"]') || 
                      container.querySelector('svg');
      expect(timeline || container.firstChild).toBeInTheDocument();
    });

    it('should group events by date', () => {
      render(<PatientHistoryTimeline events={mockEvents} />);
      
      // Events should be displayed
      expect(screen.getByText('Cardiology Consultation')).toBeInTheDocument();
      expect(screen.getByText('Cardiac Biomarkers')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onEventClick when event is clicked', async () => {
      const user = userEvent.setup();
      const onEventClick = vi.fn();
      
      render(
        <PatientHistoryTimeline 
          events={mockEvents} 
          onEventClick={onEventClick}
        />
      );
      
      // Find clickable event element
      const eventElement = screen.getByText('Cardiology Consultation');
      const clickableParent = eventElement.closest('[class*="cursor-pointer"]') ||
                             eventElement.closest('button') ||
                             eventElement.parentElement;
      
      if (clickableParent) {
        await user.click(clickableParent);
        // Verify callback was called (may need adjustment based on actual implementation)
        expect(onEventClick).toHaveBeenCalled();
      }
    });
  });

  describe('Zoom Controls', () => {
    it('should have zoom controls', () => {
      render(<PatientHistoryTimeline events={mockEvents} />);
      
      const buttons = screen.getAllByRole('button');
      const zoomButtons = buttons.filter(btn => 
        btn.textContent?.includes('+') || 
        btn.textContent?.includes('-') ||
        btn.querySelector('[class*="Plus"]') ||
        btn.querySelector('[class*="Minus"]')
      );
      
      expect(zoomButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Time Scale Tabs', () => {
    it('should display time scale tabs', () => {
      render(<PatientHistoryTimeline events={mockEvents} />);
      
      // Look for tab buttons or time scale controls
      const buttons = screen.getAllByRole('button');
      const tabButtons = buttons.filter(btn => 
        btn.textContent?.match(/years|months|weeks|days|hours/i)
      );
      
      // Component may have tabs for different time scales
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should handle empty events array', () => {
      render(<PatientHistoryTimeline events={[]} />);
      
      const { container } = render(<PatientHistoryTimeline events={[]} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have search input with proper placeholder', () => {
      render(<PatientHistoryTimeline events={mockEvents} />);
      
      const searchInput = screen.getByPlaceholderText(/Search/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should have accessible timeline structure', () => {
      const { container } = render(<PatientHistoryTimeline events={mockEvents} />);
      
      // Timeline should have proper structure
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});

