import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PatientRecordsPage from '@/app/patient/records/page';

// Mock the FileAttachmentViewer component
vi.mock('@/components/patient/FileAttachmentViewer', () => ({
  FileAttachmentViewer: ({ attachments }: { attachments: { name: string; [key: string]: unknown }[] }) => (
    <div data-testid="file-attachment-viewer">
      {attachments.map((attachment, index) => (
        <div key={index} data-testid={`attachment-${index}`}>
          {attachment.name}
        </div>
      ))}
    </div>
  ),
}));

describe('Medical Records Tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tab Navigation', () => {
    it('should render three tabs: Timeline, Event History, and Bodymap Timeline', () => {
      render(<PatientRecordsPage />);
      
      // Check that all three tabs are present
      expect(screen.getByRole('tab', { name: 'Timeline' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Event History' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Bodymap Timeline' })).toBeInTheDocument();
    });

    it('should have Timeline tab as the default active tab', () => {
      render(<PatientRecordsPage />);
      
      const timelineTab = screen.getByRole('tab', { name: 'Timeline' });
      expect(timelineTab).toHaveAttribute('data-state', 'active');
    });

            it('should switch to Event History tab when clicked', async () => {
              const user = userEvent.setup();
              render(<PatientRecordsPage />);

              const eventHistoryTab = screen.getByRole('tab', { name: 'Event History' });
              await user.click(eventHistoryTab);

              expect(eventHistoryTab).toHaveAttribute('data-state', 'active');
            });

    it('should switch to Bodymap Timeline tab when clicked', async () => {
      const user = userEvent.setup();
      render(<PatientRecordsPage />);
      
      const bodymapTab = screen.getByRole('tab', { name: 'Bodymap Timeline' });
      await user.click(bodymapTab);

      expect(bodymapTab).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Timeline View (Default)', () => {
    it('should display the current medical records list when Timeline tab is active', () => {
      render(<PatientRecordsPage />);
      
      // Should show the existing medical records
      expect(screen.getByText('Annual Physical Exam')).toBeInTheDocument();
      expect(screen.getByText('Blood Test Results')).toBeInTheDocument();
      expect(screen.getByText('X-Ray - Chest')).toBeInTheDocument();
    });

    it('should show search and filter functionality in Timeline view', () => {
      render(<PatientRecordsPage />);
      
      expect(screen.getByPlaceholderText('Search records...')).toBeInTheDocument();
      expect(screen.getByText('Filter')).toBeInTheDocument();
    });
  });

  describe('Event History View', () => {
    it('should display event history content when Event History tab is active', async () => {
      const user = userEvent.setup();
      render(<PatientRecordsPage />);

      const eventHistoryTab = screen.getByRole('tab', { name: 'Event History' });
      await user.click(eventHistoryTab);

      // Should show event history specific content
      expect(screen.getByTestId('event-history-view')).toBeInTheDocument();
    });

    it('should show chronological list of medical events', async () => {
      const user = userEvent.setup();
      render(<PatientRecordsPage />);
      
      const eventHistoryTab = screen.getByRole('tab', { name: 'Event History' });
      await user.click(eventHistoryTab);

      // Should show events in chronological order
      expect(screen.getByTestId('chronological-events-list')).toBeInTheDocument();
    });
  });

  describe('Bodymap Timeline View', () => {
    it('should display bodymap timeline content when Bodymap Timeline tab is active', async () => {
      const user = userEvent.setup();
      render(<PatientRecordsPage />);
      
      const bodymapTab = screen.getByRole('tab', { name: 'Bodymap Timeline' });
      await user.click(bodymapTab);
      
      // Should show bodymap timeline specific content
      expect(screen.getByTestId('bodymap-timeline-view')).toBeInTheDocument();
    });

    it('should show interactive bodymap for symptom tracking', async () => {
      const user = userEvent.setup();
      render(<PatientRecordsPage />);
      
      const bodymapTab = screen.getByRole('tab', { name: 'Bodymap Timeline' });
      await user.click(bodymapTab);
      
      // Should show interactive bodymap
      expect(screen.getByTestId('interactive-bodymap')).toBeInTheDocument();
    });

    it('should show symptoms over time visualization', async () => {
      const user = userEvent.setup();
      render(<PatientRecordsPage />);
      
      const bodymapTab = screen.getByRole('tab', { name: 'Bodymap Timeline' });
      await user.click(bodymapTab);
      
      // Should show symptoms timeline
      expect(screen.getByTestId('symptoms-timeline')).toBeInTheDocument();
    });
  });

  describe('Tab State Management', () => {
    it('should maintain tab state when switching between tabs', async () => {
      const user = userEvent.setup();
      render(<PatientRecordsPage />);
      
      // Start with Timeline tab
      const timelineTab = screen.getByRole('tab', { name: 'Timeline' });
      expect(timelineTab).toHaveAttribute('data-state', 'active');
      
      // Switch to Event History
      const eventHistoryTab = screen.getByRole('tab', { name: 'Event History' });
      await user.click(eventHistoryTab);
      expect(eventHistoryTab).toHaveAttribute('data-state', 'active');
      expect(timelineTab).toHaveAttribute('data-state', 'inactive');
      
      // Switch to Bodymap Timeline
      const bodymapTab = screen.getByRole('tab', { name: 'Bodymap Timeline' });
      await user.click(bodymapTab);
      expect(bodymapTab).toHaveAttribute('data-state', 'active');
      expect(eventHistoryTab).toHaveAttribute('data-state', 'inactive');
    });

    it('should preserve search and filter state across tab switches', async () => {
      const user = userEvent.setup();
      render(<PatientRecordsPage />);
      
      // Set search term
      const searchInput = screen.getByPlaceholderText('Search records...');
      await user.type(searchInput, 'blood test');
      
      // Switch to Event History tab
      const eventHistoryTab = screen.getByRole('tab', { name: 'Event History' });
      await user.click(eventHistoryTab);
      
      // Switch back to Timeline tab
      const timelineTab = screen.getByRole('tab', { name: 'Timeline' });
      await user.click(timelineTab);
      
      // Search term should be preserved
      expect(searchInput).toHaveValue('blood test');
    });
  });
});
