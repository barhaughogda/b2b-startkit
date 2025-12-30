'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PatientHistoryTimeline } from '@/components/patient/PatientHistoryTimeline';
import { PatientEventHistory } from '@/components/patient/PatientEventHistory';
import { InteractiveBodyMap } from '@/components/patient/InteractiveBodyMap';
import { CardSystemProvider } from '@/components/cards/CardSystemProvider';
import { useZentheaSession } from '@/hooks/useZentheaSession';

function PatientRecordsContent() {
  const { data: session } = useZentheaSession();
  const [activeMedicalTab, setActiveMedicalTab] = useState('timeline');
  
  // Get patient ID from session or use a default
  const patientId = session?.user?.id || 'patient-1';

  // Tab configuration
  const tabs = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'event-history', label: 'Event History' },
    { id: 'bodymap-timeline', label: 'Bodymap Timeline' },
  ];

  // Refs for tab buttons to manage focus
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const shouldFocusAfterChange = useRef(false);

  // Focus management after tab change (only for keyboard navigation)
  useEffect(() => {
    if (shouldFocusAfterChange.current) {
      const activeTabRef = tabRefs.current[activeMedicalTab];
      if (activeTabRef) {
        activeTabRef.focus();
        shouldFocusAfterChange.current = false;
      }
    }
  }, [activeMedicalTab]);

  // Handle keyboard navigation for tabs
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, tabId: string) => {
    const currentIndex = tabs.findIndex(tab => tab.id === tabId);
    
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        shouldFocusAfterChange.current = true;
        const nextIndex = (currentIndex + 1) % tabs.length;
        const nextTab = tabs[nextIndex];
        if (nextTab) setActiveMedicalTab(nextTab.id);
        break;
      
      case 'ArrowLeft':
        e.preventDefault();
        shouldFocusAfterChange.current = true;
        const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        const prevTab = tabs[prevIndex];
        if (prevTab) setActiveMedicalTab(prevTab.id);
        break;
      
      case 'Home':
        e.preventDefault();
        shouldFocusAfterChange.current = true;
        const firstTab = tabs[0];
        if (firstTab) setActiveMedicalTab(firstTab.id);
        break;
      
      case 'End':
        e.preventDefault();
        shouldFocusAfterChange.current = true;
        const lastTab = tabs[tabs.length - 1];
        if (lastTab) setActiveMedicalTab(lastTab.id);
        break;
      
      case 'Enter':
      case ' ':
        e.preventDefault();
        setActiveMedicalTab(tabId);
        break;
      
      default:
        // Allow other keys to propagate
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-text-primary">Medical Records</h1>
          <p className="text-text-secondary">
            Your comprehensive medical history and timeline
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-end justify-center border-b relative min-h-[42px]" role="tablist" aria-label="Medical records navigation">
        <div className="flex gap-2">
          <Button
            ref={(el) => { tabRefs.current['timeline'] = el; }}
            variant={activeMedicalTab === 'timeline' ? 'default' : 'ghost'}
            onClick={() => setActiveMedicalTab('timeline')}
            onKeyDown={(e) => handleTabKeyDown(e, 'timeline')}
            className="rounded-b-none"
            role="tab"
            aria-selected={activeMedicalTab === 'timeline'}
            aria-controls="timeline-panel"
            data-tab-id="timeline"
            tabIndex={activeMedicalTab === 'timeline' ? 0 : -1}
          >
            Timeline
          </Button>
          <Button
            ref={(el) => { tabRefs.current['event-history'] = el; }}
            variant={activeMedicalTab === 'event-history' ? 'default' : 'ghost'}
            onClick={() => setActiveMedicalTab('event-history')}
            onKeyDown={(e) => handleTabKeyDown(e, 'event-history')}
            className="rounded-b-none"
            role="tab"
            aria-selected={activeMedicalTab === 'event-history'}
            aria-controls="event-history-panel"
            data-tab-id="event-history"
            tabIndex={activeMedicalTab === 'event-history' ? 0 : -1}
          >
            Event History
          </Button>
          <Button
            ref={(el) => { tabRefs.current['bodymap-timeline'] = el; }}
            variant={activeMedicalTab === 'bodymap-timeline' ? 'default' : 'ghost'}
            onClick={() => setActiveMedicalTab('bodymap-timeline')}
            onKeyDown={(e) => handleTabKeyDown(e, 'bodymap-timeline')}
            className="rounded-b-none"
            role="tab"
            aria-selected={activeMedicalTab === 'bodymap-timeline'}
            aria-controls="bodymap-timeline-panel"
            data-tab-id="bodymap-timeline"
            tabIndex={activeMedicalTab === 'bodymap-timeline' ? 0 : -1}
          >
            Bodymap Timeline
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Timeline View */}
          {activeMedicalTab === 'timeline' && (
            <div id="timeline-panel" role="tabpanel" className="space-y-6">
              <PatientHistoryTimeline />
            </div>
          )}

          {/* Event History View */}
          {activeMedicalTab === 'event-history' && (
            <div id="event-history-panel" role="tabpanel" data-testid="event-history-view" className="space-y-6">
              <PatientEventHistory />
            </div>
          )}

          {/* Bodymap Timeline View */}
          {activeMedicalTab === 'bodymap-timeline' && (
            <div id="bodymap-timeline-panel" role="tabpanel" data-testid="bodymap-timeline-view" className="space-y-6">
              <InteractiveBodyMap 
                patientId={patientId}
                selectedDiagnoses={[]}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PatientRecordsPage() {
  return (
    <CardSystemProvider>
      <PatientRecordsContent />
    </CardSystemProvider>
  );
}