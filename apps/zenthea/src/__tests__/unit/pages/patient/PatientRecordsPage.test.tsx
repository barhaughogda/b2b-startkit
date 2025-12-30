import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientRecordsPage from '@/app/patient/records/page';

// Mock child components
vi.mock('@/components/patient/PatientHistoryTimeline', () => ({
  PatientHistoryTimeline: ({ onEventClick }: { onEventClick: () => void }) => (
    <div data-testid="patient-history-timeline" onClick={onEventClick}>
      Patient History Timeline
    </div>
  ),
}));

vi.mock('@/components/patient/PatientEventHistory', () => ({
  PatientEventHistory: ({ onEventClick }: { onEventClick: () => void }) => (
    <div data-testid="patient-event-history" onClick={onEventClick}>
      Patient Event History
    </div>
  ),
}));

vi.mock('@/components/patient/InteractiveBodyMap', () => ({
  InteractiveBodyMap: ({ patientId }: { patientId: string }) => (
    <div data-testid="interactive-body-map" data-patient-id={patientId}>
      Interactive Body Map
    </div>
  ),
}));

vi.mock('@/hooks/useZentheaSession', () => ({
  useZentheaSession: () => ({
    data: {
      user: {
        id: 'patient-123',
        email: 'patient@demo.com',
        role: 'patient',
      },
    },
    status: 'authenticated',
  }),
}));

vi.mock('@/components/patient/ModalSystem', () => ({
  ModalProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  usePatientProfileModals: () => ({
    openEventModal: vi.fn(),
  }),
}));

describe('PatientRecordsPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the patient records page', () => {
    render(<PatientRecordsPage />);
    expect(screen.getByText('Medical Records')).toBeInTheDocument();
    expect(screen.getByText(/Patient's comprehensive medical history and timeline/i)).toBeInTheDocument();
  });

  it('should display tab navigation controls', () => {
    render(<PatientRecordsPage />);
    expect(screen.getByRole('tab', { name: /timeline/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /event history/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /bodymap timeline/i })).toBeInTheDocument();
  });

  it('should display tab panels for medical records', () => {
    render(<PatientRecordsPage />);
    expect(screen.getByRole('tabpanel', { name: /timeline/i })).toBeInTheDocument();
  });

  it('should support keyboard navigation', async () => {
    render(<PatientRecordsPage />);

    // Tab to first tab control
    await user.tab();
    const firstTab = screen.getByRole('tab', { name: /timeline/i });
    expect(document.activeElement).toBe(firstTab);

    // Tab to next tab control
    await user.tab();
    const secondTab = screen.getByRole('tab', { name: /event history/i });
    expect(document.activeElement).toBe(secondTab);

    // Tab to third tab control
    await user.tab();
    const thirdTab = screen.getByRole('tab', { name: /bodymap timeline/i });
    expect(document.activeElement).toBe(thirdTab);
  });

  it('should support full ARIA keyboard navigation', async () => {
    render(<PatientRecordsPage />);

    const timelineTab = screen.getByRole('tab', { name: /timeline/i });
    const eventHistoryTab = screen.getByRole('tab', { name: /event history/i });
    const bodymapTab = screen.getByRole('tab', { name: /bodymap timeline/i });

    // Focus first tab
    timelineTab.focus();
    expect(document.activeElement).toBe(timelineTab);
    expect(timelineTab).toHaveAttribute('aria-selected', 'true');

    // Arrow right to next tab
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(eventHistoryTab);

    // Enter to activate
    await user.keyboard('{Enter}');
    expect(eventHistoryTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: /event history/i })).toBeVisible();

    // Arrow right to last tab
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(bodymapTab);

    // Space to activate
    await user.keyboard(' ');
    expect(bodymapTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: /bodymap timeline/i })).toBeVisible();

    // Arrow left to go back
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(eventHistoryTab);

    // Home key to jump to first tab
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(timelineTab);

    // End key to jump to last tab
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(bodymapTab);
  });

  it('should switch tab panels when tabs are activated', async () => {
    render(<PatientRecordsPage />);

    const timelineTab = screen.getByRole('tab', { name: /timeline/i });
    const eventHistoryTab = screen.getByRole('tab', { name: /event history/i });

    // Initially timeline panel should be visible
    expect(screen.getByRole('tabpanel', { name: /timeline/i })).toBeVisible();
    expect(screen.queryByRole('tabpanel', { name: /event history/i })).not.toBeInTheDocument();

    // Click event history tab
    await user.click(eventHistoryTab);

    // Event history panel should now be visible, timeline should be hidden
    expect(screen.getByRole('tabpanel', { name: /event history/i })).toBeVisible();
    expect(screen.queryByRole('tabpanel', { name: /timeline/i })).not.toBeInTheDocument();
  });

  it('should render all three tab panels correctly', async () => {
    render(<PatientRecordsPage />);

    const timelineTab = screen.getByRole('tab', { name: /timeline/i });
    const eventHistoryTab = screen.getByRole('tab', { name: /event history/i });
    const bodymapTab = screen.getByRole('tab', { name: /bodymap timeline/i });

    // Initially timeline panel should be visible
    expect(screen.getByRole('tabpanel', { name: /timeline/i })).toBeVisible();
    expect(screen.getByTestId('patient-history-timeline')).toBeInTheDocument();

    // Switch to event history
    await user.click(eventHistoryTab);
    expect(screen.getByRole('tabpanel', { name: /event history/i })).toBeVisible();
    expect(screen.getByTestId('patient-event-history')).toBeInTheDocument();

    // Switch to bodymap timeline
    await user.click(bodymapTab);
    expect(screen.getByRole('tabpanel', { name: /bodymap timeline/i })).toBeVisible();
    expect(screen.getByTestId('interactive-body-map')).toBeInTheDocument();
  });

  it('should have correct ARIA attributes on tabs', () => {
    render(<PatientRecordsPage />);

    const timelineTab = screen.getByRole('tab', { name: /timeline/i });
    const eventHistoryTab = screen.getByRole('tab', { name: /event history/i });
    const bodymapTab = screen.getByRole('tab', { name: /bodymap timeline/i });

    // Check ARIA attributes
    expect(timelineTab).toHaveAttribute('aria-selected', 'true');
    expect(timelineTab).toHaveAttribute('aria-controls', 'timeline-panel');
    expect(eventHistoryTab).toHaveAttribute('aria-selected', 'false');
    expect(eventHistoryTab).toHaveAttribute('aria-controls', 'event-history-panel');
    expect(bodymapTab).toHaveAttribute('aria-selected', 'false');
    expect(bodymapTab).toHaveAttribute('aria-controls', 'bodymap-timeline-panel');
  });

  it('should have correct ARIA attributes on tab panels', () => {
    render(<PatientRecordsPage />);

    const timelinePanel = screen.getByRole('tabpanel', { name: /timeline/i });
    expect(timelinePanel).toHaveAttribute('id', 'timeline-panel');
    expect(timelinePanel).toHaveAttribute('role', 'tabpanel');
  });

  it('should only show one tab panel at a time', async () => {
    render(<PatientRecordsPage />);

    const timelineTab = screen.getByRole('tab', { name: /timeline/i });
    const eventHistoryTab = screen.getByRole('tab', { name: /event history/i });
    const bodymapTab = screen.getByRole('tab', { name: /bodymap timeline/i });

    // Initially only timeline should be visible
    expect(screen.getByRole('tabpanel', { name: /timeline/i })).toBeVisible();
    expect(screen.queryByRole('tabpanel', { name: /event history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tabpanel', { name: /bodymap timeline/i })).not.toBeInTheDocument();

    // Switch to event history - only event history should be visible
    await user.click(eventHistoryTab);
    expect(screen.queryByRole('tabpanel', { name: /timeline/i })).not.toBeInTheDocument();
    expect(screen.getByRole('tabpanel', { name: /event history/i })).toBeVisible();
    expect(screen.queryByRole('tabpanel', { name: /bodymap timeline/i })).not.toBeInTheDocument();

    // Switch to bodymap - only bodymap should be visible
    await user.click(bodymapTab);
    expect(screen.queryByRole('tabpanel', { name: /timeline/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tabpanel', { name: /event history/i })).not.toBeInTheDocument();
    expect(screen.getByRole('tabpanel', { name: /bodymap timeline/i })).toBeVisible();
  });

  it('should update aria-selected when switching tabs', async () => {
    render(<PatientRecordsPage />);

    const timelineTab = screen.getByRole('tab', { name: /timeline/i });
    const eventHistoryTab = screen.getByRole('tab', { name: /event history/i });
    const bodymapTab = screen.getByRole('tab', { name: /bodymap timeline/i });

    // Initially timeline is selected
    expect(timelineTab).toHaveAttribute('aria-selected', 'true');
    expect(eventHistoryTab).toHaveAttribute('aria-selected', 'false');
    expect(bodymapTab).toHaveAttribute('aria-selected', 'false');

    // Switch to event history
    await user.click(eventHistoryTab);
    expect(timelineTab).toHaveAttribute('aria-selected', 'false');
    expect(eventHistoryTab).toHaveAttribute('aria-selected', 'true');
    expect(bodymapTab).toHaveAttribute('aria-selected', 'false');

    // Switch to bodymap
    await user.click(bodymapTab);
    expect(timelineTab).toHaveAttribute('aria-selected', 'false');
    expect(eventHistoryTab).toHaveAttribute('aria-selected', 'false');
    expect(bodymapTab).toHaveAttribute('aria-selected', 'true');
  });

  it('should render tablist with correct role', () => {
    render(<PatientRecordsPage />);
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();
  });
});