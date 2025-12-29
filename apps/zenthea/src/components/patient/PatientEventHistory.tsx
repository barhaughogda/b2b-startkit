'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCardSystem } from '@/components/cards/CardSystemProvider';
import { CardType, Priority, TaskStatus } from '@/components/cards/types';

interface TimelineEvent {
  id: string;
  date: string;
  time: string;
  type: 'visit' | 'hospitalization' | 'procedure' | 'medication' | 'lab' | 'imaging' | 'physician' | 'diagnosis';
  title: string;
  provider?: string;
  description?: string;
  status?: 'completed' | 'pending' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
}

interface PatientEventHistoryProps {
  events?: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
  className?: string;
  patientId?: string;
  patientName?: string;
  patientDateOfBirth?: string;
}

const mockEvents: TimelineEvent[] = [
  // Recent events (2024)
  {
    id: '1',
    date: '2024-01-15',
    time: '10:30',
    type: 'visit',
    title: 'Cardiology Consultation',
    provider: 'Dr. Sarah Johnson',
    description: 'Follow-up for heart condition management',
    status: 'completed',
    priority: 'high'
  },
  {
    id: '2',
    date: '2024-01-12',
    time: '14:00',
    type: 'lab',
    title: 'Cardiac Biomarkers',
    provider: 'Lab Corp',
    description: 'Troponin, CK-MB, and BNP levels',
    status: 'completed',
    priority: 'high'
  },
  {
    id: '3',
    date: '2024-01-10',
    time: '09:15',
    type: 'medication',
    title: '2 New Medications',
    provider: 'Dr. Sarah Johnson',
    description: 'Added Lisinopril and Metoprolol',
    status: 'completed',
    priority: 'high'
  },
  {
    id: '4',
    date: '2024-01-08',
    time: '11:00',
    type: 'imaging',
    title: 'Heart MRI',
    provider: 'Radiology Dept',
    description: 'Cardiac MRI with contrast',
    status: 'completed',
    priority: 'high'
  },
  {
    id: '5',
    date: '2024-01-05',
    time: '16:30',
    type: 'procedure',
    title: 'Heart Surgery',
    provider: 'Dr. Michael Chen',
    description: 'Coronary artery bypass surgery',
    status: 'completed',
    priority: 'high'
  },
  {
    id: '6',
    date: '2024-01-02',
    time: '08:45',
    type: 'hospitalization',
    title: 'Emergency Admission',
    provider: 'Emergency Dept',
    description: 'Acute myocardial infarction',
    status: 'completed',
    priority: 'high'
  },
  
  // 2023 events
  {
    id: '7',
    date: '2023-12-20',
    time: '13:20',
    type: 'visit',
    title: 'Neurology Consultation',
    provider: 'Dr. Emily Rodriguez',
    description: 'Neurological assessment for headaches',
    status: 'completed',
    priority: 'medium'
  },
  {
    id: '8',
    date: '2023-12-15',
    time: '10:00',
    type: 'lab',
    title: 'Neurological Panel',
    provider: 'Lab Corp',
    description: 'Comprehensive neurological blood work',
    status: 'completed',
    priority: 'medium'
  },
  {
    id: '9',
    date: '2023-12-10',
    time: '15:30',
    type: 'imaging',
    title: 'Brain MRI',
    provider: 'Radiology Dept',
    description: 'MRI brain with and without contrast',
    status: 'completed',
    priority: 'medium'
  },
  {
    id: '10',
    date: '2023-11-28',
    time: '09:00',
    type: 'visit',
    title: 'Cardiology Follow-up',
    provider: 'Dr. Sarah Johnson',
    description: 'Post-procedure follow-up visit',
    status: 'completed',
    priority: 'high'
  },
  {
    id: '11',
    date: '2023-11-20',
    time: '14:15',
    type: 'lab',
    title: 'Lipid Panel',
    provider: 'Lab Corp',
    description: 'Cholesterol and triglyceride analysis',
    status: 'completed',
    priority: 'low'
  },
  {
    id: '12',
    date: '2023-11-15',
    time: '11:30',
    type: 'procedure',
    title: 'Cardiac Catheterization',
    provider: 'Dr. Michael Chen',
    description: 'Diagnostic cardiac catheterization',
    status: 'completed',
    priority: 'high'
  },
  {
    id: '13',
    date: '2023-10-30',
    time: '16:00',
    type: 'visit',
    title: 'Primary Care Visit',
    provider: 'Dr. James Wilson',
    description: 'Annual physical examination',
    status: 'completed',
    priority: 'medium'
  },
  {
    id: '14',
    date: '2023-10-25',
    time: '08:30',
    type: 'lab',
    title: 'Complete Blood Count',
    provider: 'Lab Corp',
    description: 'Routine CBC with differential',
    status: 'completed',
    priority: 'low'
  },
  {
    id: '15',
    date: '2023-10-20',
    time: '13:45',
    type: 'imaging',
    title: 'Chest X-Ray',
    provider: 'Radiology Dept',
    description: 'PA and lateral chest imaging',
    status: 'completed',
    priority: 'medium'
  },
  {
    id: '16',
    date: '2023-09-15',
    time: '10:30',
    type: 'visit',
    title: 'Endocrinology Consultation',
    provider: 'Dr. Lisa Park',
    description: 'Diabetes management consultation',
    status: 'completed',
    priority: 'medium'
  },
  {
    id: '17',
    date: '2023-09-10',
    time: '12:00',
    type: 'lab',
    title: 'HbA1c Test',
    provider: 'Lab Corp',
    description: 'Hemoglobin A1c for diabetes monitoring',
    status: 'completed',
    priority: 'medium'
  },
  {
    id: '18',
    date: '2023-08-25',
    time: '15:20',
    type: 'procedure',
    title: 'Colonoscopy',
    provider: 'Dr. Robert Kim',
    description: 'Screening colonoscopy',
    status: 'completed',
    priority: 'medium'
  },
  {
    id: '19',
    date: '2023-08-20',
    time: '09:15',
    type: 'lab',
    title: 'Comprehensive Metabolic Panel',
    provider: 'Lab Corp',
    description: 'CMP including liver and kidney function',
    status: 'completed',
    priority: 'low'
  },
  {
    id: '20',
    date: '2023-07-30',
    time: '14:30',
    type: 'visit',
    title: 'Dermatology Consultation',
    provider: 'Dr. Amanda Foster',
    description: 'Skin lesion evaluation',
    status: 'completed',
    priority: 'low'
  }
];

const eventTypeConfig = {
  visit: { 
    color: 'bg-green-500', 
    label: 'Visits',
    dotColor: 'bg-green-500'
  },
  hospitalization: { 
    color: 'bg-red-500', 
    label: 'Hospitalizations',
    dotColor: 'bg-red-500'
  },
  procedure: { 
    color: 'bg-orange-500', 
    label: 'Procedures',
    dotColor: 'bg-orange-500'
  },
  medication: { 
    color: 'bg-yellow-500', 
    label: 'Medication',
    dotColor: 'bg-yellow-500'
  },
  lab: { 
    color: 'bg-blue-500', 
    label: 'Labs',
    dotColor: 'bg-blue-500'
  },
  imaging: { 
    color: 'bg-purple-500', 
    label: 'Imaging',
    dotColor: 'bg-purple-500'
  },
  physician: { 
    color: 'bg-indigo-500', 
    label: 'Physician',
    dotColor: 'bg-indigo-500'
  },
  diagnosis: { 
    color: 'bg-pink-500', 
    label: 'Diagnosis',
    dotColor: 'bg-pink-500'
  }
};

export function PatientEventHistory({ 
  events = mockEvents, 
  onEventClick,
  className,
  patientId,
  patientName,
  patientDateOfBirth
}: PatientEventHistoryProps) {
  const { openCard } = useCardSystem();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const eventsPerPage = 10;

  // Map event types to card types
  const eventTypeToCardType: Record<string, CardType> = {
    'lab': 'labResult',
    'procedure': 'procedure',
    'diagnosis': 'diagnosis',
    'visit': 'appointment',
    'medication': 'prescription',
    'imaging': 'procedure',
    'hospitalization': 'procedure',
    'physician': 'appointment'
  };

  // Handle event click - open card instead of modal
  const handleEventClick = (event: TimelineEvent) => {
    // Call optional callback for analytics or other side effects
    onEventClick?.(event);

    const cardType = eventTypeToCardType[event.type] || 'appointment';
    const cardPriority: Priority = event.priority === 'high' ? 'high' : 
                                   event.priority === 'medium' ? 'medium' : 'low';
    const cardStatus: TaskStatus = event.status === 'completed' ? 'completed' :
                                   event.status === 'cancelled' ? 'cancelled' :
                                   event.status === 'pending' ? 'inProgress' : 'new';

    // Transform event data to card format based on card type
    let cardData: any = {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      provider: event.provider
    };

    // Add type-specific data
    if (cardType === 'appointment') {
      // Default appointment duration in minutes
      // TODO: Consider deriving duration from actual appointment data when available
      const DEFAULT_APPOINTMENT_DURATION = 30;
      
      cardData = {
        ...cardData,
        patientId: patientId || event.id,
        patientName: patientName || 'Patient',
        duration: DEFAULT_APPOINTMENT_DURATION,
        type: event.title,
        status: event.status === 'completed' ? 'completed' : 
                event.status === 'cancelled' ? 'cancelled' : 'scheduled',
        location: 'Clinic',
        provider: event.provider || 'Provider',
        notes: event.description
      };
    } else if (cardType === 'labResult') {
      cardData = {
        ...cardData,
        patientId: patientId || event.id,
        patientName: patientName || 'Patient',
        patientDateOfBirth: patientDateOfBirth,
        testName: event.title,
        testType: 'routine',
        collectionDate: event.date,
        resultsDate: event.date,
        status: 'reviewed',
        labCategories: [],
        results: [],
        orderingProvider: event.provider || 'Provider',
        laboratory: 'Lab',
        notes: event.description
      };
    } else if (cardType === 'prescription') {
      cardData = {
        ...cardData,
        title: event.title,
        content: event.description,
        date: event.date
      };
    } else if (cardType === 'procedure' || cardType === 'diagnosis') {
      cardData = {
        ...cardData,
        title: event.title,
        content: event.description,
        date: event.date
      };
    }

    // Open the card
    openCard(cardType, cardData, {
      patientId: patientId || event.id,
      patientName: patientName || 'Patient',
      patientDateOfBirth: patientDateOfBirth,
      priority: cardPriority,
      status: cardStatus
    });
  };

  // Filter events based on search and filters
  const filteredEvents = events.filter(event => {
    const matchesSearch = searchTerm === '' || 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.provider?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = selectedFilters.length === 0 || selectedFilters.includes(event.type);
    
    return matchesSearch && matchesFilter;
  });

  // Sort events by date (most recent first)
  const sortedEvents = [...filteredEvents].sort((a, b) => 
    new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime()
  );

  // Pagination
  const totalPages = Math.ceil(sortedEvents.length / eventsPerPage);
  const startIndex = currentPage * eventsPerPage;
  const endIndex = startIndex + eventsPerPage;
  const currentEvents = sortedEvents.slice(startIndex, endIndex);

  const handleFilterToggle = (filterType: string) => {
    setSelectedFilters(prev => 
      prev.includes(filterType) 
        ? prev.filter(f => f !== filterType)
        : [...prev, filterType]
    );
    setCurrentPage(0); // Reset to first page when filters change
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(0, Math.min(newPage, totalPages - 1)));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search events..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Event type filters */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(eventTypeConfig).map(([type, config]) => {
            const isSelected = selectedFilters.includes(type);
            return (
              <Button
                key={type}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterToggle(type)}
                className="h-8 text-xs"
              >
                <div className={cn("w-2 h-2 rounded-full mr-2", config.dotColor)} />
                {config.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Events list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Event History ({sortedEvents.length} events)</span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentPage + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No events found matching your criteria.</p>
              </div>
            ) : (
              currentEvents.map((event) => {
                const eventConfig = eventTypeConfig[event.type];
                
                return (
                  <div 
                    key={event.id}
                    className={cn(
                      "flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted transition-colors",
                      event.priority === 'high' && "border-red-200 bg-red-50/50",
                      event.priority === 'medium' && "border-yellow-200 bg-yellow-50/50"
                    )}
                    onClick={() => handleEventClick(event)}
                  >
                    <div className={cn("w-4 h-4 rounded-full flex items-center justify-center", eventConfig.dotColor)}>
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{event.title}</span>
                        <Badge 
                          variant={event.priority === 'high' ? 'destructive' : event.priority === 'medium' ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {eventConfig.label}
                        </Badge>
                        {event.priority === 'high' && (
                          <Badge variant="destructive" className="text-xs">
                            High Priority
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {event.date} at {event.time} • {event.provider}
                      </p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {event.status}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
