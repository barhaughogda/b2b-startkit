'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Calendar, 
  Search, 
  Filter, 
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Clock,
  Activity,
  Pill,
  TestTube,
  Scan,
  User,
  FileText,
  Heart
} from 'lucide-react';
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

interface PatientHistoryTimelineProps {
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
    icon: User, 
    label: 'Visits',
    dotColor: 'bg-green-500'
  },
  hospitalization: { 
    color: 'bg-red-500', 
    icon: Activity, 
    label: 'Hospitalizations',
    dotColor: 'bg-red-500'
  },
  procedure: { 
    color: 'bg-orange-500', 
    icon: Heart, 
    label: 'Procedures',
    dotColor: 'bg-orange-500'
  },
  medication: { 
    color: 'bg-yellow-500', 
    icon: Pill, 
    label: 'Medication',
    dotColor: 'bg-yellow-500'
  },
  lab: { 
    color: 'bg-blue-500', 
    icon: TestTube, 
    label: 'Labs',
    dotColor: 'bg-blue-500'
  },
  imaging: { 
    color: 'bg-purple-500', 
    icon: Scan, 
    label: 'Imaging',
    dotColor: 'bg-purple-500'
  },
  physician: { 
    color: 'bg-indigo-500', 
    icon: User, 
    label: 'Physician',
    dotColor: 'bg-indigo-500'
  },
  diagnosis: { 
    color: 'bg-pink-500', 
    icon: FileText, 
    label: 'Diagnosis',
    dotColor: 'bg-pink-500'
  }
};

type TimeScale = 'years' | 'months' | 'weeks' | 'days' | 'hours';

export function PatientHistoryTimeline({ 
  events = mockEvents, 
  onEventClick,
  className,
  patientId,
  patientName,
  patientDateOfBirth
}: PatientHistoryTimelineProps) {
  const { openCard } = useCardSystem();
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const [dragRangeStart, setDragRangeStart] = useState(0);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  // Base pixels per day for consistent scaling
  const BASE_PIXELS_PER_DAY = 10;

  // Calculate date range from events
  const allEventDates = events.map(e => new Date(e.date));
  const minEventDate = allEventDates.length > 0 ? new Date(Math.min(...allEventDates.map(d => d.getTime()))) : new Date();
  const maxEventDate = allEventDates.length > 0 ? new Date(Math.max(...allEventDates.map(d => d.getTime()))) : new Date();

  // Add padding to the date range
  const paddedMinDate = new Date(minEventDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days before
  const paddedMaxDate = new Date(maxEventDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days after

  // Calculate total timeline width
  const totalDaysSpan = Math.ceil((paddedMaxDate.getTime() - paddedMinDate.getTime()) / (1000 * 60 * 60 * 24));
  const timelineTotalWidth = totalDaysSpan * BASE_PIXELS_PER_DAY * zoomLevel;

  // Filter events based on selected filters and search
  const filteredEvents = events.filter(event => {
    const matchesFilter = selectedFilters.length === 0 || selectedFilters.includes(event.type);
    const matchesSearch = searchTerm === '' || 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.provider?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Sort events by date
  const sortedEvents = [...filteredEvents].sort((a, b) => 
    new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime()
  );

  // Handle filter toggle
  const toggleFilter = (filterType: string) => {
    setSelectedFilters(prev => 
      prev.includes(filterType) 
        ? prev.filter(f => f !== filterType)
        : [...prev, filterType]
    );
  };

  // Handle zoom controls
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  // Calculate distance between two touch points
  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  // Handle wheel events for trackpad zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    // Check if it's a pinch gesture (trackpad) or regular scroll
    if (e.ctrlKey || e.metaKey) {
      // Pinch zoom on trackpad
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel(prev => Math.max(0.5, Math.min(3, prev + delta)));
    } else {
      // Horizontal scroll
      if (scrollContainerRef.current) {
        const scrollAmount = e.deltaY * 2;
        scrollContainerRef.current.scrollLeft += scrollAmount;
      }
    }
  }, []);

  // Handle touch events for mobile pinch zoom
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      setLastTouchDistance(getTouchDistance(e.touches));
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      // Pinch zoom
      const currentDistance = getTouchDistance(e.touches);
      if (lastTouchDistance > 0) {
        const scale = currentDistance / lastTouchDistance;
        setZoomLevel(prev => Math.max(0.5, Math.min(3, prev * scale)));
      }
      setLastTouchDistance(currentDistance);
    } else if (e.touches.length === 1 && isDragging) {
      // Drag to scroll
      if (scrollContainerRef.current) {
        const deltaX = e.touches[0].clientX - dragStart.x;
        scrollContainerRef.current.scrollLeft -= deltaX;
        setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }
    }
  }, [isDragging, dragStart, lastTouchDistance]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setLastTouchDistance(0);
  }, []);

  // Handle mouse drag for desktop
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && scrollContainerRef.current) {
      const deltaX = e.clientX - dragStart.x;
      scrollContainerRef.current.scrollLeft -= deltaX;
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle scroll
  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const newScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

  // Initialize selected range to show recent events
  useEffect(() => {
    if (!selectedRange && events.length > 0) {
      const recentEvents = events.slice(0, 5);
      const minDate = new Date(Math.min(...recentEvents.map(e => new Date(e.date).getTime())));
      const maxDate = new Date(Math.max(...recentEvents.map(e => new Date(e.date).getTime())));
      
      const startDays = (minDate.getTime() - paddedMinDate.getTime()) / (1000 * 60 * 60 * 24);
      const endDays = (maxDate.getTime() - paddedMinDate.getTime()) / (1000 * 60 * 60 * 24);
      
      setSelectedRange({
        start: startDays * BASE_PIXELS_PER_DAY * zoomLevel,
        end: endDays * BASE_PIXELS_PER_DAY * zoomLevel
      });
    }
  }, [events, zoomLevel, paddedMinDate]);

  // Add event listeners for gesture support
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Add event listeners
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('mousedown', handleMouseDown);
    
    // Global mouse events for drag
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp]);

  // Handle range dragging
  const handleRangeMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingRange && selectedRange) {
      const deltaX = e.clientX - dragRangeStart;
      const newStart = Math.max(0, Math.min(timelineTotalWidth - (selectedRange.end - selectedRange.start), selectedRange.start + deltaX));
      const newEnd = newStart + (selectedRange.end - selectedRange.start);
      
      setSelectedRange({
        start: newStart,
        end: Math.min(timelineTotalWidth, newEnd)
      });
      setDragRangeStart(e.clientX);
    }
  }, [isDraggingRange, selectedRange, dragRangeStart, timelineTotalWidth]);

  const handleRangeMouseUp = useCallback(() => {
    setIsDraggingRange(false);
  }, []);


  // Add range dragging event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleRangeMouseMove);
    document.addEventListener('mouseup', handleRangeMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleRangeMouseMove);
      document.removeEventListener('mouseup', handleRangeMouseUp);
    };
  }, [handleRangeMouseMove, handleRangeMouseUp]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with search and filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search timeline..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm border-none bg-transparent focus:outline-none"
            />
          </div>
          
          {/* Event type filters */}
          <div className="flex items-center gap-2">
            {Object.entries(eventTypeConfig).map(([type, config]) => {
              const Icon = config.icon;
              const isSelected = selectedFilters.includes(type);
              return (
                <Button
                  key={type}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleFilter(type)}
                  className="h-8 text-xs"
                >
                  <div className={cn("w-2 h-2 rounded-full mr-2", config.dotColor)} />
                  <Icon className="h-3 w-3 mr-1" />
                  {config.label}
                </Button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Timeline container */}
      <div className="relative">
        {/* Timeline area selector */}
        <div className="relative mb-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Timeline Range</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <Minus className="h-3 w-3" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setZoomLevel(1)}
                  className="text-xs px-2"
                >
                  Reset
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Range selector bar */}
            <div 
              className="relative h-8 bg-muted/50 rounded-lg overflow-hidden cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickPercent = clickX / rect.width;
                const clickPosition = clickPercent * timelineTotalWidth;
                
                if (!selectedRange) {
                  // Create initial range
                  setSelectedRange({
                    start: Math.max(0, clickPosition - 100),
                    end: Math.min(timelineTotalWidth, clickPosition + 100)
                  });
                } else {
                  // Update range based on click
                  const rangeWidth = selectedRange.end - selectedRange.start;
                  setSelectedRange({
                    start: Math.max(0, clickPosition - rangeWidth / 2),
                    end: Math.min(timelineTotalWidth, clickPosition + rangeWidth / 2)
                  });
                }
              }}
            >
              {/* Background timeline */}
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-1 bg-border rounded-full" />
              </div>
              
              {/* Year markers */}
              {Array.from({ length: Math.ceil(totalDaysSpan / 365) + 1 }, (_, i) => {
                const year = paddedMinDate.getFullYear() + i;
                const yearStart = new Date(year, 0, 1);
                const daysFromPaddedMin = (yearStart.getTime() - paddedMinDate.getTime()) / (1000 * 60 * 60 * 24);
                const leftPx = Math.max(0, daysFromPaddedMin * BASE_PIXELS_PER_DAY * zoomLevel);
                
                return (
                  <div
                    key={year}
                    className="absolute top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground"
                    style={{ left: `${leftPx}px` }}
                  >
                    {year}
                  </div>
                );
              })}
              
              {/* Selected range */}
              {selectedRange && (
                <div
                  className="absolute top-0 h-full bg-primary/20 border-2 border-primary rounded"
                  style={{
                    left: `${selectedRange.start}px`,
                    width: `${selectedRange.end - selectedRange.start}px`
                  }}
                >
                  {/* Range handles */}
                  <div 
                    className="absolute left-0 top-0 w-2 h-full bg-primary cursor-ew-resize hover:bg-primary/80"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setIsDraggingRange(true);
                      setDragRangeStart(e.clientX);
                    }}
                  />
                  <div 
                    className="absolute right-0 top-0 w-2 h-full bg-primary cursor-ew-resize hover:bg-primary/80"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setIsDraggingRange(true);
                      setDragRangeStart(e.clientX);
                    }}
                  />
                </div>
              )}
            </div>
            
            {/* Range info */}
            {selectedRange && (
              <div className="mt-2 text-xs text-muted-foreground">
                Selected range: {Math.round(selectedRange.start / (BASE_PIXELS_PER_DAY * zoomLevel))} - {Math.round(selectedRange.end / (BASE_PIXELS_PER_DAY * zoomLevel))} days
              </div>
            )}
          </div>
        </div>

        {/* Scrollable timeline */}
        <div className="relative bg-muted/20 rounded-lg p-4">
          {/* Zoom level indicator and instructions */}
          <div className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-muted-foreground">
            Zoom: {Math.round(zoomLevel * 100)}%
          </div>
          
          {/* Gesture instructions */}
          <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Trackpad: Pinch to zoom • Drag to scroll</span>
            <span className="sm:hidden">Touch: Pinch to zoom • Drag to scroll</span>
          </div>
          
          <div 
            ref={scrollContainerRef}
            className={cn(
              "overflow-x-auto scrollbar-hide relative",
              isDragging && "cursor-grabbing",
              "cursor-grab"
            )}
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              userSelect: 'none'
            }}
          >
            <div 
              className="relative h-40 flex items-center"
              style={{ 
                minWidth: `${timelineTotalWidth}px`
              }}
            >
              {/* Timeline line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20 transform -translate-y-1/2 rounded-full" />
              
              {/* Timeline markers - show every 30 days */}
              {Array.from({ length: Math.ceil(totalDaysSpan / 30) }, (_, i) => {
                const daysFromPaddedMin = i * 30;
                const leftPx = daysFromPaddedMin * BASE_PIXELS_PER_DAY * zoomLevel;

                return (
                  <div
                    key={i}
                    className="absolute top-1/2 transform -translate-y-1/2 w-1 h-4 bg-muted-foreground/30 rounded-full"
                    style={{ left: `${leftPx}px` }}
                  />
                );
              })}
              
              {/* Events */}
              {sortedEvents.map((event) => {
                const eventDate = new Date(event.date + ' ' + event.time);
                const eventConfig = eventTypeConfig[event.type];
                const Icon = eventConfig.icon;
                
                // Calculate days from paddedMinDate
                const daysFromPaddedMin = (eventDate.getTime() - paddedMinDate.getTime()) / (1000 * 60 * 60 * 24);
                const leftPx = daysFromPaddedMin * BASE_PIXELS_PER_DAY * zoomLevel;
                
                return (
                  <div
                    key={event.id}
                    className="absolute cursor-pointer group"
                    style={{ 
                      left: `${leftPx}px`,
                      transform: 'translateX(-50%)'
                    }}
                    onClick={() => handleEventClick(event)}
                  >
                    {/* Event dot */}
                    <div className={cn(
                      "w-6 h-6 rounded-full border-3 border-background shadow-lg flex items-center justify-center relative",
                      eventConfig.color,
                      "group-hover:scale-125 transition-all duration-200"
                    )}>
                      <Icon className="h-3 w-3 text-white" />
                      {/* Priority indicator */}
                      {event.priority === 'high' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    
                    {/* Event tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-popover border border-border rounded-lg p-2 shadow-lg min-w-48">
                        <div className="text-sm font-medium">{event.title}</div>
                        <div className="text-xs text-muted-foreground">{event.date} at {event.time}</div>
                        {event.provider && (
                          <div className="text-xs text-muted-foreground">{event.provider}</div>
                        )}
                        {event.description && (
                          <div className="text-xs mt-1">{event.description}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Scroll controls */}
          <div className="flex items-center justify-between mt-2">
            <Button variant="outline" size="sm" onClick={() => handleScroll('left')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xs text-muted-foreground">
              {filteredEvents.length} events
            </div>
            <Button variant="outline" size="sm" onClick={() => handleScroll('right')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}

