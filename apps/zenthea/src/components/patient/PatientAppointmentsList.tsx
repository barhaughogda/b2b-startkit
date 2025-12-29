'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCardSystem } from '@/components/cards/CardSystemProvider';
import { CardType, Priority, TaskStatus } from '@/components/cards/types';

// Internal component format
interface FormattedAppointment {
  id: string;
  title: string;
  provider: string;
  date: string; // Formatted date for display
  originalDate: string; // Original date string for sorting
  time: string;
  status: 'scheduled' | 'confirmed' | 'pending' | 'completed' | 'cancelled';
  type: 'upcoming' | 'recent';
  location?: string;
  duration?: string;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
}

// Store format (from appointmentsStore)
interface StoreAppointment {
  id: string;
  date: string;
  time: string;
  provider: {
    id: string;
    name: string;
    specialty: string;
  };
  type: string;
  status: string;
  location: string;
  duration: string;
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
  title?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface ActionButton {
  label: string;
  onClick: (appointment: FormattedAppointment | StoreAppointment) => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  showForStatus?: string[];
}

interface PatientAppointmentsListProps {
  appointments?: FormattedAppointment[] | StoreAppointment[];
  onAppointmentClick?: (appointment: FormattedAppointment | StoreAppointment) => void;
  className?: string;
  showActions?: boolean;
  actionButtons?: ActionButton[];
  patientId?: string;
  patientName?: string;
  patientDateOfBirth?: string;
}

const mockAppointments: FormattedAppointment[] = [
  {
    id: '1',
    title: 'Annual Physical Exam',
    provider: 'Dr. Sarah Johnson',
    date: 'Monday, Jan 15, 2024',
    originalDate: '2024-01-15',
    time: '10:00 AM',
    status: 'confirmed',
    type: 'upcoming',
    location: 'Main Clinic - Room 201',
    duration: '60 minutes',
    notes: 'Comprehensive annual health assessment',
    priority: 'high'
  },
  {
    id: '2',
    title: 'Follow-up Consultation',
    provider: 'Dr. Michael Chen',
    date: 'Friday, Jan 20, 2024',
    originalDate: '2024-01-20',
    time: '2:30 PM',
    status: 'pending',
    type: 'upcoming',
    location: 'Specialist Clinic - Room 105',
    duration: '30 minutes',
    notes: 'Review test results and treatment plan',
    priority: 'medium'
  },
  {
    id: '3',
    title: 'Blood Pressure Check',
    provider: 'Dr. Sarah Johnson',
    date: 'Dec 20, 2023',
    originalDate: '2023-12-20',
    time: '9:00 AM',
    status: 'completed',
    type: 'recent',
    location: 'Main Clinic - Room 201',
    duration: '15 minutes',
    notes: 'Routine blood pressure monitoring',
    priority: 'low'
  },
  {
    id: '4',
    title: 'Lab Results Review',
    provider: 'Dr. Michael Chen',
    date: 'Dec 15, 2023',
    originalDate: '2023-12-15',
    time: '3:15 PM',
    status: 'completed',
    type: 'recent',
    location: 'Specialist Clinic - Room 105',
    duration: '20 minutes',
    notes: 'Discussion of recent lab work results',
    priority: 'medium'
  }
];

/**
 * Validates and normalizes appointment status
 * Returns a valid status or 'pending' as fallback
 */
function validateStatus(status: string | undefined | null): FormattedAppointment['status'] {
  const validStatuses: FormattedAppointment['status'][] = [
    'scheduled',
    'confirmed',
    'pending',
    'completed',
    'cancelled'
  ];
  
  const normalizedStatus = (status || 'pending').toLowerCase();
  
  // Check if normalized status is valid
  if (validStatuses.includes(normalizedStatus as FormattedAppointment['status'])) {
    return normalizedStatus as FormattedAppointment['status'];
  }
  
  // Fallback to 'pending' for invalid statuses
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`Invalid appointment status: "${status}". Defaulting to "pending".`);
  }
  return 'pending';
}

/**
 * Determines priority based on status if not provided
 */
function getDefaultPriority(status: string): 'low' | 'medium' | 'high' {
  switch (status.toLowerCase()) {
    case 'confirmed':
    case 'scheduled':
      return 'high';
    case 'pending':
      return 'medium';
    case 'completed':
    case 'cancelled':
      return 'low';
    default:
      return 'medium';
  }
}

/**
 * Parses time string (12-hour format) to minutes since midnight for comparison
 * Handles formats like "9:00 AM", "10:30 PM", "2:15 PM"
 */
function parseTimeToMinutes(timeString: string): number {
  try {
    // Match patterns like "9:00 AM", "10:30 PM", "2:15 PM"
    const match = timeString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) {
      // Fallback: try to extract just the hour if format is unexpected
      const hourMatch = timeString.match(/(\d{1,2})/);
      if (hourMatch) {
        return parseInt(hourMatch[1]) * 60; // Approximate to minutes
      }
      return 0;
    }
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
  } catch {
    return 0;
  }
}

/**
 * Parses date string to Date object, handling various formats
 */
function parseDate(dateString: string): Date | null {
  try {
    // Try parsing as ISO date first (e.g., "2024-01-15")
    if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Try parsing as regular date
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Determines if appointment is upcoming or recent based on date
 */
function getAppointmentType(date: string, status: string): 'upcoming' | 'recent' {
  // If status is completed or cancelled, it's always recent
  if (status === 'completed' || status === 'cancelled') {
    return 'recent';
  }
  
  const appointmentDate = parseDate(date);
  if (!appointmentDate) {
    // If we can't parse the date, default to upcoming for non-completed appointments
    return 'upcoming';
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  appointmentDate.setHours(0, 0, 0, 0);
  
  // If appointment date is today or in the future, it's upcoming
  if (appointmentDate >= today) {
    return 'upcoming';
  }
  
  // Otherwise, it's recent
  return 'recent';
}

/**
 * Formats date string to a readable format
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // If parsing fails, try to handle formats like "2024-01-15"
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
      }
      return dateString; // Return as-is if can't parse
    }
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

/**
 * Transforms store appointment format to component format
 */
function transformAppointment(appointment: StoreAppointment | FormattedAppointment): FormattedAppointment {
  // If already in the correct format (has originalDate), return as-is
  if ('title' in appointment && 'priority' in appointment && typeof appointment.provider === 'string' && 'originalDate' in appointment) {
    return appointment as FormattedAppointment;
  }
  
  // If it's a FormattedAppointment without originalDate, add it
  if ('title' in appointment && 'priority' in appointment && typeof appointment.provider === 'string') {
    const formatted = appointment as FormattedAppointment;
    return {
      ...formatted,
      originalDate: formatted.date // Use date as originalDate if not present
    };
  }
  
  // Transform from store format
  const storeAppointment = appointment as StoreAppointment;
  const providerName = typeof storeAppointment.provider === 'string' 
    ? storeAppointment.provider 
    : storeAppointment.provider.name;
  
  // Validate and normalize status to prevent runtime errors
  const status = validateStatus(storeAppointment.status);
  const appointmentType = getAppointmentType(storeAppointment.date, status);
  const formattedDate = formatDate(storeAppointment.date);
  
  return {
    id: storeAppointment.id,
    title: storeAppointment.title || storeAppointment.type || 'Appointment',
    provider: providerName,
    date: formattedDate,
    originalDate: storeAppointment.date, // Preserve original for sorting
    time: storeAppointment.time,
    status: status,
    type: appointmentType,
    location: storeAppointment.location,
    duration: storeAppointment.duration,
    notes: storeAppointment.notes,
    priority: storeAppointment.priority || getDefaultPriority(status)
  };
}

const statusConfig = {
  scheduled: { 
    color: 'bg-status-info-bg text-status-info border border-status-info border-opacity-30', 
    dotColor: 'bg-status-info',
    label: 'Scheduled'
  },
  confirmed: { 
    color: 'bg-status-success-bg text-status-success border border-status-success border-opacity-30', 
    dotColor: 'bg-status-success',
    label: 'Confirmed'
  },
  pending: { 
    color: 'bg-status-warning-bg text-status-warning border border-status-warning border-opacity-30', 
    dotColor: 'bg-status-warning',
    label: 'Pending'
  },
  completed: { 
    color: 'bg-surface-elevated text-text-tertiary border border-border-primary', 
    dotColor: 'bg-border-primary',
    label: 'Completed'
  },
  cancelled: { 
    color: 'bg-status-error-bg text-status-error border border-status-error border-opacity-30', 
    dotColor: 'bg-status-error',
    label: 'Cancelled'
  }
};

const priorityConfig = {
  high: { 
    color: 'bg-status-error-bg text-status-error border border-status-error border-opacity-30', 
    dotColor: 'bg-status-error',
    label: 'High Priority'
  },
  medium: { 
    color: 'bg-status-warning-bg text-status-warning border border-status-warning border-opacity-30', 
    dotColor: 'bg-status-warning',
    label: 'Medium Priority'
  },
  low: { 
    color: 'bg-status-success-bg text-status-success border border-status-success border-opacity-30', 
    dotColor: 'bg-status-success',
    label: 'Low Priority'
  }
};

export function PatientAppointmentsList({ 
  appointments = mockAppointments, 
  onAppointmentClick,
  className,
  showActions = false,
  actionButtons = [],
  patientId,
  patientName,
  patientDateOfBirth
}: PatientAppointmentsListProps) {
  const { openCard } = useCardSystem();
  
  // Transform and sort appointments
  const formattedAppointments = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      return [];
    }
    
    return appointments.map(transformAppointment);
  }, [appointments]);

  // Handle appointment click - open card instead of modal
  const handleAppointmentClick = (appointment: FormattedAppointment | StoreAppointment) => {
    // Call optional callback for analytics or other side effects
    onAppointmentClick?.(appointment);

    const formatted = transformAppointment(appointment);
    
    // Validate required fields
    if (!formatted.id) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Appointment missing ID:', appointment);
      }
      return;
    }

    if (!formatted.time) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Appointment missing time:', appointment);
      }
      return;
    }
    
    // Parse duration string to number (e.g., "60 minutes" -> 60)
    const parseDuration = (duration?: string): number => {
      if (!duration) return 30; // Default 30 minutes
      const match = duration.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 30;
    };

    // Extract providerId if available from StoreAppointment format
    const providerId = typeof appointment.provider === 'object' && appointment.provider?.id
      ? appointment.provider.id
      : undefined;

    // Transform appointment to card data format
    const appointmentCardData = {
      id: formatted.id,
      patientId: patientId || formatted.id,
      patientName: patientName || 'Patient',
      time: formatted.time,
      date: formatted.originalDate || formatted.date,
      duration: parseDuration(formatted.duration),
      type: formatted.title,
      status: formatted.status === 'confirmed' ? 'confirmed' : 
              formatted.status === 'scheduled' ? 'scheduled' :
              formatted.status === 'completed' ? 'completed' :
              formatted.status === 'cancelled' ? 'cancelled' : 'scheduled',
      location: formatted.location,
      provider: formatted.provider,
      providerId: providerId, // Pass providerId for reschedule modal if available
      notes: formatted.notes
    };

    // Map priority with type safety
    const cardPriority: Priority = formatted.priority === 'high' ? 'high' : 
                                   formatted.priority === 'medium' ? 'medium' : 'low';
    
    // Map status with type safety
    const cardStatus: TaskStatus = formatted.status === 'completed' ? 'completed' :
                                   formatted.status === 'cancelled' ? 'cancelled' :
                                   formatted.status === 'confirmed' || formatted.status === 'scheduled' ? 'inProgress' : 'new';

    // Open the card
    openCard('appointment' as CardType, appointmentCardData, {
      patientId: patientId || formatted.id,
      patientName: patientName || 'Patient',
      patientDateOfBirth: patientDateOfBirth,
      priority: cardPriority,
      status: cardStatus
    });
  };
  
  // Sort appointments by date (most recent first for recent, upcoming first for upcoming)
  const sortedAppointments = useMemo(() => {
    return [...formattedAppointments].sort((a, b) => {
      if (a.type === 'upcoming' && b.type === 'upcoming') {
        // For upcoming, sort by date ascending (earliest first)
        // Use originalDate for sorting to ensure proper date comparison
        const dateA = parseDate(a.originalDate);
        const dateB = parseDate(b.originalDate);
        if (dateA && dateB) {
          const dateComparison = dateA.getTime() - dateB.getTime();
          // If dates are equal, sort by time (properly parsed for chronological order)
          if (dateComparison === 0) {
            const timeA = parseTimeToMinutes(a.time);
            const timeB = parseTimeToMinutes(b.time);
            return timeA - timeB;
          }
          return dateComparison;
        }
        // Fallback: compare by time if dates can't parse (properly parsed for chronological order)
        const timeA = parseTimeToMinutes(a.time);
        const timeB = parseTimeToMinutes(b.time);
        return timeA - timeB;
      }
      if (a.type === 'recent' && b.type === 'recent') {
        // For recent, sort by date descending (most recent first)
        // Use originalDate for sorting to ensure proper date comparison
        const dateA = parseDate(a.originalDate);
        const dateB = parseDate(b.originalDate);
        if (dateA && dateB) {
          const dateComparison = dateB.getTime() - dateA.getTime();
          // If dates are equal, sort by time (most recent first, properly parsed for chronological order)
          if (dateComparison === 0) {
            const timeA = parseTimeToMinutes(a.time);
            const timeB = parseTimeToMinutes(b.time);
            return timeB - timeA; // Reverse order for recent (descending)
          }
          return dateComparison;
        }
        // Fallback: compare by time if dates can't parse (properly parsed for chronological order)
        const timeA = parseTimeToMinutes(a.time);
        const timeB = parseTimeToMinutes(b.time);
        return timeB - timeA; // Reverse order for recent (descending)
      }
      return a.type === 'upcoming' ? -1 : 1;
    });
  }, [formattedAppointments]);

  const upcomingAppointments = sortedAppointments.filter(appointment => appointment.type === 'upcoming');
  const recentAppointments = sortedAppointments.filter(appointment => appointment.type === 'recent');

  return (
    <div className={cn("space-y-4", className)} data-testid="appointments-list">
      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Upcoming Appointments</h3>
          <div className="space-y-3">
            {upcomingAppointments.map((appointment) => {
              // Safe access with fallback to prevent runtime errors
              const statusStyle = statusConfig[appointment.status] || statusConfig.pending;
              const priorityStyle = priorityConfig[appointment.priority] || priorityConfig.medium;
              
              return (
                <Card 
                  key={appointment.id}
                  data-testid="appointment-card"
                  className={cn(
                    "cursor-pointer hover:shadow-md transition-all duration-200 border-l-4",
                    appointment.status === 'confirmed' && "border-l-status-success bg-status-success-bg",
                    appointment.status === 'pending' && "border-l-status-warning bg-status-warning-bg",
                    appointment.status === 'scheduled' && "border-l-status-info bg-status-info-bg",
                    appointment.priority === 'high' && "border-l-status-error"
                  )}
                  onClick={() => handleAppointmentClick(appointment)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                          appointment.status === 'confirmed' && "bg-status-success-bg",
                          appointment.status === 'pending' && "bg-status-warning-bg",
                          appointment.status === 'scheduled' && "bg-status-info-bg",
                          appointment.status === 'completed' && "bg-surface-elevated"
                        )}>
                          <Calendar className={cn(
                            "h-5 w-5",
                            appointment.status === 'confirmed' && "text-status-success",
                            appointment.status === 'pending' && "text-status-warning",
                            appointment.status === 'scheduled' && "text-status-info",
                            appointment.status === 'completed' && "text-text-tertiary"
                          )} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm" data-testid="appointment-provider">
                              {appointment.provider}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", statusStyle.color)}
                              data-testid="appointment-status"
                            >
                              {statusStyle.label}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", priorityStyle.color)}
                            >
                              {priorityStyle.label}
                            </Badge>
                          </div>
                          
                          <p className="text-sm font-medium text-foreground mb-1" data-testid="appointment-type">
                            {appointment.title}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1" data-testid="appointment-date">
                              <Clock className="h-3 w-3" />
                              {appointment.date}
                            </div>
                            <div className="flex items-center gap-1" data-testid="appointment-time">
                              {appointment.time}
                            </div>
                            {appointment.duration && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {appointment.duration}
                              </div>
                            )}
                          </div>
                          
                          {appointment.location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1" data-testid="appointment-location">
                              <MapPin className="h-3 w-3" />
                              {appointment.location}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {/* Priority indicator dot */}
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          priorityStyle.dotColor
                        )} />
                      </div>
                    </div>
                    {/* Action Buttons */}
                    {showActions && actionButtons.length > 0 && (
                      <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-border-primary/10">
                        {actionButtons
                          .filter(button => 
                            !button.showForStatus || 
                            button.showForStatus.includes(appointment.status)
                          )
                          .map((button, index) => (
                            <Button
                              key={index}
                              variant={button.variant || 'outline'}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                button.onClick(appointment);
                              }}
                            >
                              {button.label}
                            </Button>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Appointments */}
      {recentAppointments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Recent Appointments</h3>
          <div className="space-y-3">
            {recentAppointments.map((appointment) => {
              // Safe access with fallback to prevent runtime errors
              const statusStyle = statusConfig[appointment.status] || statusConfig.completed;
              const priorityStyle = priorityConfig[appointment.priority] || priorityConfig.medium;
              
              return (
                <Card 
                  key={appointment.id}
                  data-testid="appointment-card"
                  className={cn(
                    "cursor-pointer hover:shadow-md transition-all duration-200 border-l-4",
                    appointment.status === 'completed' && "border-l-border-primary bg-surface-elevated",
                    appointment.priority === 'high' && "border-l-status-error"
                  )}
                  onClick={() => handleAppointmentClick(appointment)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="w-10 h-10 bg-surface-elevated rounded-full flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-5 w-5 text-text-tertiary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm" data-testid="appointment-provider">
                              {appointment.provider}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", statusStyle.color)}
                              data-testid="appointment-status"
                            >
                              {statusStyle.label}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", priorityStyle.color)}
                            >
                              {priorityStyle.label}
                            </Badge>
                          </div>
                          
                          <p className="text-sm font-medium text-foreground mb-1" data-testid="appointment-type">
                            {appointment.title}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1" data-testid="appointment-date">
                              <Clock className="h-3 w-3" />
                              {appointment.date}
                            </div>
                            <div className="flex items-center gap-1" data-testid="appointment-time">
                              {appointment.time}
                            </div>
                            {appointment.duration && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {appointment.duration}
                              </div>
                            )}
                          </div>
                          
                          {appointment.location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1" data-testid="appointment-location">
                              <MapPin className="h-3 w-3" />
                              {appointment.location}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {/* Priority indicator dot */}
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          priorityStyle.dotColor
                        )} />
                      </div>
                    </div>
                    {/* Action Buttons */}
                    {showActions && actionButtons.length > 0 && (
                      <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-border-primary/10">
                        {actionButtons
                          .filter(button => 
                            !button.showForStatus || 
                            button.showForStatus.includes(appointment.status)
                          )
                          .map((button, index) => (
                            <Button
                              key={index}
                              variant={button.variant || 'outline'}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                button.onClick(appointment);
                              }}
                            >
                              {button.label}
                            </Button>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {upcomingAppointments.length === 0 && recentAppointments.length === 0 && (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No appointments found</p>
        </div>
      )}
    </div>
  );
}
