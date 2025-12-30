'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Calendar, Clock, User, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { navigationHelpers } from '@/utils/navigation';
import { usePatients } from '@/hooks/usePatients';
import { useCardSystem } from '@/components/cards/CardSystemProvider';
import { CardType, Priority, TaskStatus } from '@/components/cards/types';
import { loadDateTimePreferences, formatTimeWithPrefs, type DateTimePreferences } from '@/lib/datetime/formatting';

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  type: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueTime?: string;
  category: string;
}

export function TodayContent() {
  const router = useRouter();
  const { patients, isLoading: patientsLoading, error: patientsError } = usePatients();
  const { openCard } = useCardSystem();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateTimePrefs, setDateTimePrefs] = useState<DateTimePreferences>(() => loadDateTimePreferences());

  // Listen for time format changes
  useEffect(() => {
    const handleTimeFormatChange = (e: CustomEvent<{ timeFormat: '12h' | '24h' }>) => {
      const updatedPrefs = loadDateTimePreferences();
      setDateTimePrefs(updatedPrefs);
    };

    const handleDateFormatChange = (e: CustomEvent<{ dateFormat: string }>) => {
      const updatedPrefs = loadDateTimePreferences();
      setDateTimePrefs(updatedPrefs);
    };

    // Listen for storage changes (cross-tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'zenthea-time-format' || e.key === 'zenthea-date-format') {
        const updatedPrefs = loadDateTimePreferences();
        setDateTimePrefs(updatedPrefs);
      }
    };

    window.addEventListener('zenthea-time-format-changed', handleTimeFormatChange as EventListener);
    window.addEventListener('zenthea-date-format-changed', handleDateFormatChange as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('zenthea-time-format-changed', handleTimeFormatChange as EventListener);
      window.removeEventListener('zenthea-date-format-changed', handleDateFormatChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Helper function to parse time string (e.g., "09:00 AM" or "14:30") and format according to preferences
  const parseAndFormatTime = useCallback((timeString: string): string => {
    try {
      // Parse time string - handle both 12h and 24h formats
      let hours = 0;
      let minutes = 0;
      
      // Check if it's 12-hour format (contains AM/PM)
      const amPmMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (amPmMatch && amPmMatch[1] && amPmMatch[2] && amPmMatch[3]) {
        hours = parseInt(amPmMatch[1], 10);
        minutes = parseInt(amPmMatch[2], 10);
        const amPm = amPmMatch[3].toUpperCase();
        
        // Convert to 24-hour format
        if (amPm === 'PM' && hours !== 12) {
          hours += 12;
        } else if (amPm === 'AM' && hours === 12) {
          hours = 0;
        }
      } else {
        // Assume 24-hour format (HH:mm)
        const timeMatch = timeString.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch && timeMatch[1] && timeMatch[2]) {
          hours = parseInt(timeMatch[1], 10);
          minutes = parseInt(timeMatch[2], 10);
        } else {
          return timeString; // Return original if can't parse
        }
      }
      
      // Create a Date object with today's date and the parsed time
      const today = new Date();
      today.setHours(hours, minutes, 0, 0);
      
      // Format according to user preferences
      return formatTimeWithPrefs(today, dateTimePrefs);
    } catch (error) {
      // If parsing fails, return original string
      return timeString;
    }
  }, [dateTimePrefs]);

  // Format appointments and tasks times according to user preferences
  const formattedAppointments = useMemo(() => {
    return appointments.map(apt => ({
      ...apt,
      time: parseAndFormatTime(apt.time),
    }));
  }, [appointments, parseAndFormatTime]);

  const formattedTasks = useMemo(() => {
    return tasks.map(task => ({
      ...task,
      dueTime: task.dueTime ? parseAndFormatTime(task.dueTime) : undefined,
    }));
  }, [tasks, parseAndFormatTime]);

  useEffect(() => {
    // Create appointments using real patient data
    if (patients && patients.length > 0) {
      const mockAppointments: Appointment[] = [
        {
          id: '1',
          patientId: patients[0]?._id || '', // Use real patient ID
          patientName: patients[0]?.name || '', // Use real patient name
          time: '09:00 AM',
          status: 'scheduled',
          type: 'Consultation',
        },
        {
          id: '2',
          patientId: patients[1]?._id || '2', // Use real patient ID or fallback
          patientName: patients[1]?.name || 'Sarah Johnson',
          time: '10:30 AM',
          status: 'scheduled',
          type: 'Follow-up',
        },
        {
          id: '3',
          patientId: patients[2]?._id || '3', // Use real patient ID or fallback
          patientName: patients[2]?.name || 'Mike Davis',
          time: '02:00 PM',
          status: 'completed',
          type: 'Check-up',
        },
        {
          id: '4',
          patientId: patients[3]?._id || '4', // Use real patient ID or fallback
          patientName: patients[3]?.name || 'Emily Wilson',
          time: '03:30 PM',
          status: 'cancelled',
          type: 'Consultation',
        },
      ];

    const mockTasks: Task[] = [
      {
        id: '1',
        title: 'Review Lab Results - Blood Work',
        description: 'Check comprehensive metabolic panel and lipid profile',
        completed: false,
        priority: 'high',
        dueTime: '10:00 AM',
        category: 'lab result',
      },
      {
        id: '2',
        title: 'Patient Message - Medication Questions',
        description: 'Patient has questions about new prescription side effects',
        completed: false,
        priority: 'high',
        dueTime: '11:00 AM',
        category: 'message',
      },
      {
        id: '3',
        title: 'Vital Signs Review - Blood Pressure',
        description: 'Monitor elevated blood pressure readings from home monitoring',
        completed: false,
        priority: 'medium',
        dueTime: '2:00 PM',
        category: 'vital signs',
      },
      {
        id: '4',
        title: 'SOAP Note - Follow-up Visit',
        description: 'Document patient progress and treatment plan updates',
        completed: false,
        priority: 'medium',
        dueTime: '3:00 PM',
        category: 'soap note',
      },
      {
        id: '5',
        title: 'Appointment - Annual Check-up',
        description: 'Comprehensive physical examination and health assessment',
        completed: false,
        priority: 'high',
        dueTime: '4:00 PM',
        category: 'appointment',
      },
      {
        id: '6',
        title: 'Prescription - Medication Refill',
        description: 'Review and approve medication refill request',
        completed: false,
        priority: 'medium',
        dueTime: '5:00 PM',
        category: 'prescription',
      },
      {
        id: '7',
        title: 'Procedure - Blood Draw',
        description: 'Schedule and prepare for routine blood collection',
        completed: false,
        priority: 'low',
        dueTime: '6:00 PM',
        category: 'procedure',
      },
      {
        id: '8',
        title: 'Diagnosis - Hypertension Review',
        description: 'Review and update hypertension diagnosis and treatment plan',
        completed: false,
        priority: 'high',
        dueTime: '7:00 PM',
        category: 'diagnosis',
      },
    ];

      setTimeout(() => {
        setAppointments(mockAppointments);
        setTasks(mockTasks);
        setLoading(false);
      }, 1000);
    } else {
      // If no patients available, still show loading
      setLoading(true);
    }
  }, [patients]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-status-info/10 text-status-info border-status-info/20';
      case 'completed':
        return 'bg-status-success/10 text-status-success border-status-success/20';
      case 'cancelled':
        return 'bg-status-error/10 text-status-error border-status-error/20';
      default:
        return 'bg-status-warning/10 text-status-warning border-status-warning/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4" />;
      case 'completed':
        return <Calendar className="w-4 h-4" />;
      case 'cancelled':
        return <User className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-status-error/10 text-status-error border-status-error/20';
      case 'medium':
        return 'bg-status-warning/10 text-status-warning border-status-warning/20';
      case 'low':
        return 'bg-status-info/10 text-status-info border-status-info/20';
      default:
        return 'bg-status-info/10 text-status-info border-status-info/20';
    }
  };

  const toggleTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  // Handle opening cards based on task type
  const handleTaskClick = (task: Task) => {
    // Get patient data - use first patient as demo for now
    const patient = patients?.[0];
    const patientDateOfBirth = patient?.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0]! : undefined;
    
    const baseProps = {
      patientId: patient?._id || task.id,
      patientName: patient?.name || 'Patient',
      patientDateOfBirth: patientDateOfBirth,
      priority: task.priority as Priority,
      status: task.completed ? 'completed' : 'new' as TaskStatus
    };

    // Determine card type based on task category
    let cardType: CardType = 'appointment'; // Default
    let cardData: any = {
      title: task.title,
      description: task.description
    };

    switch (task.category.toLowerCase()) {
      case 'appointment':
        cardType = 'appointment';
        cardData = {
          id: task.id,
          patientId: patient?._id || task.id,
          patientName: patient?.name || 'Patient',
          patientDateOfBirth: patientDateOfBirth,
          time: task.dueTime || '10:00 AM',
          date: new Date().toISOString().split('T')[0]!,
          duration: 30,
          type: 'Consultation',
          status: 'scheduled',
          location: 'Room 101',
          provider: 'Dr. Smith',
          notes: task.description
        };
        break;
      case 'message':
        cardType = 'message';
        cardData = {
          title: task.title,
          content: task.description,
          from: patient?.name || 'Patient',
          patientId: patient?._id || task.id,
          patientName: patient?.name || 'Patient',
          patientDateOfBirth: patientDateOfBirth,
          timestamp: new Date().toISOString()
        };
        break;
      case 'lab result':
        cardType = 'labResult';
        cardData = {
          id: task.id,
          patientId: patient?._id || task.id,
          patientName: patient?.name || 'John Doe',
          patientDateOfBirth: patientDateOfBirth,
          patientAge: patient?.age || 45,
          patientGender: patient?.gender || 'Male',
          testName: 'Comprehensive Metabolic Panel',
          testType: 'routine',
          collectionDate: new Date().toISOString(),
          resultsDate: new Date().toISOString(),
          status: 'reviewed',
          labCategories: [
            {
              id: 'chemistry',
              name: 'Chemistry Panel',
              isActive: true,
              tests: ['Glucose', 'BUN', 'Creatinine', 'Sodium', 'Potassium']
            }
          ],
          results: [
            {
              id: 'glucose',
              name: 'Glucose',
              value: 95,
              unit: 'mg/dL',
              referenceRange: '70-100',
              status: 'normal',
              category: 'chemistry'
            },
            {
              id: 'bun',
              name: 'BUN',
              value: 18,
              unit: 'mg/dL',
              referenceRange: '7-20',
              status: 'normal',
              category: 'chemistry'
            }
          ],
          orderingProvider: 'Dr. Sarah Johnson',
          laboratory: 'Central Lab Services',
          notes: task.description
        };
        break;
      case 'vital signs':
        cardType = 'vitalSigns';
        cardData = {
          id: task.id,
          patientId: patient?._id || task.id,
          patientName: patient?.name || 'John Smith',
          patientDateOfBirth: patientDateOfBirth,
          date: new Date().toISOString().split('T')[0]!,
          time: new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }),
          readings: {
            bloodPressure: {
              systolic: 135,
              diastolic: 85,
              unit: 'mmHg',
              status: 'elevated'
            },
            heartRate: {
              value: 78,
              unit: 'bpm',
              status: 'normal'
            },
            temperature: {
              value: 98.4,
              unit: '°F',
              status: 'normal'
            },
            weight: {
              value: 152,
              unit: 'lbs',
              status: 'normal'
            },
            height: {
              value: 68,
              unit: 'in',
              status: 'normal'
            }
          },
          trends: {
            bloodPressure: 'declining',
            heartRate: 'stable',
            temperature: 'stable',
            weight: 'stable'
          },
          historicalData: {
            bloodPressure: [
              { date: '2024-01-01', systolic: 140, diastolic: 90, flag: 'high' },
              { date: '2024-01-15', systolic: 138, diastolic: 88, flag: 'high' },
              { date: '2024-02-01', systolic: 135, diastolic: 85, flag: 'elevated' },
              { date: '2024-02-15', systolic: 132, diastolic: 82, flag: 'elevated' },
              { date: '2024-03-01', systolic: 130, diastolic: 80, flag: 'normal' }
            ],
            heartRate: [
              { date: '2024-01-01', value: 85, flag: 'normal' },
              { date: '2024-01-15', value: 82, flag: 'normal' },
              { date: '2024-02-01', value: 80, flag: 'normal' },
              { date: '2024-02-15', value: 78, flag: 'normal' },
              { date: '2024-03-01', value: 76, flag: 'normal' }
            ],
            temperature: [
              { date: '2024-01-01', value: 98.6, flag: 'normal' },
              { date: '2024-01-15', value: 98.4, flag: 'normal' },
              { date: '2024-02-01', value: 98.2, flag: 'normal' },
              { date: '2024-02-15', value: 98.3, flag: 'normal' },
              { date: '2024-03-01', value: 98.4, flag: 'normal' }
            ],
            weight: [
              { date: '2024-01-01', value: 155, flag: 'normal' },
              { date: '2024-01-15', value: 154, flag: 'normal' },
              { date: '2024-02-01', value: 153, flag: 'normal' },
              { date: '2024-02-15', value: 152, flag: 'normal' },
              { date: '2024-03-01', value: 151, flag: 'normal' }
            ]
          },
          notes: task.description,
          careTeam: [
            {
              id: 'provider-1',
              name: 'Dr. Smith',
              role: 'Primary Care Physician',
              initials: 'DS',
              avatar: '/avatars/dr-smith.jpg',
              isActive: true
            }
          ],
          tags: [
            { id: 'tag-1', name: 'Blood Pressure', color: 'red', category: 'medical' },
            { id: 'tag-2', name: 'Home Monitoring', color: 'blue', category: 'medical' }
          ],
          documents: [],
          comments: [],
          activity: [
            {
              id: 'activity-1',
              action: 'Vital Signs Recorded',
              description: 'Home blood pressure monitoring readings recorded',
              user: 'John Smith',
              role: 'Patient',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              icon: 'Activity',
              type: 'measurement'
            }
          ]
        };
        break;
      case 'soap note':
        cardType = 'soapNote';
        cardData = {
          title: task.title,
          content: task.description,
          date: new Date().toISOString().split('T')[0]!
        };
        break;
      case 'prescription':
        cardType = 'prescription';
        cardData = {
          title: task.title,
          content: task.description,
          date: new Date().toISOString().split('T')[0]!
        };
        break;
      case 'procedure':
        cardType = 'procedure';
        cardData = {
          title: task.title,
          content: task.description,
          date: new Date().toISOString().split('T')[0]!
        };
        break;
      case 'diagnosis':
        cardType = 'diagnosis';
        cardData = {
          title: task.title,
          content: task.description,
          date: new Date().toISOString().split('T')[0]!
        };
        break;
      default:
        cardType = 'appointment';
    }

    openCard(cardType, cardData, baseProps);
  };

  const handlePatientClick = (patientId: string) => {
    try {
      navigationHelpers.goToPatientProfile(router, patientId);
    } catch (error) {
      console.error('Failed to navigate to patient profile:', error);
      setError('Unable to navigate to patient profile. Please try again.');
    }
  };

  // Handle appointment click - opens AppointmentCard in view mode
  const handleAppointmentClick = (appointment: Appointment) => {
    // Find patient data for DOB
    const patient = patients?.find(p => p._id === appointment.patientId);
    const patientDateOfBirth = patient?.dateOfBirth 
      ? new Date(patient.dateOfBirth).toISOString().split('T')[0]! 
      : undefined;
    
    const baseProps = {
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      patientDateOfBirth: patientDateOfBirth,
      priority: 'medium' as Priority,
      status: appointment.status === 'completed' ? 'completed' : 'new' as TaskStatus,
    };

    const appointmentCardData = {
      id: appointment.id,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      time: appointment.time,
      date: new Date().toISOString().split('T')[0]!,
      duration: 30,
      type: appointment.type,
      status: appointment.status,
      location: 'Room 101',
      provider: 'Dr. Smith',
    };

    openCard('appointment', {
      ...appointmentCardData,
      mode: 'view',
    }, baseProps);
  };

  // Handle creating a new appointment - opens AppointmentCard in create mode
  const handleAddAppointment = () => {
    const baseProps = {
      patientId: '',
      patientName: 'New Appointment',
      priority: 'medium' as Priority,
      status: 'new' as TaskStatus,
    };

    openCard('appointment', {
      id: 'new',
      patientId: '',
      patientName: '',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      date: new Date().toISOString().split('T')[0]!,
      duration: 30,
      type: 'consultation',
      status: 'scheduled',
      mode: 'create',
      prefilledDate: new Date(),
    }, baseProps);
  };

  // Show loading if patients are still loading or appointments are loading
  const isLoading = patientsLoading || loading;

  return (
    <div className="flex-1 pb-6">
      <div className="max-w-4xl mx-auto">
        {(error || patientsError) && (
          <Alert className="mb-6 border-status-error/20 bg-status-error/10">
            <AlertDescription className="text-status-error">
              {error || (patientsError ? String(patientsError) : 'Failed to load patient data')}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="today-grid">
          {/* Today's Appointments */}
          <Card className="bg-surface-elevated border-border-primary/20">
            <CardHeader className="border-b border-border-primary/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-text-primary">Today&apos;s Appointments</CardTitle>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="hover:text-white"
                  onClick={handleAddAppointment}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Appointment
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 text-center text-text-secondary">
                  Loading appointments...
                </div>
              ) : appointments.length === 0 ? (
                <div className="p-6 text-center text-text-secondary">
                  No appointments scheduled for today
                </div>
              ) : (
                <div className="divide-y divide-border-primary/10">
                  {formattedAppointments.map((appointment) => (
                    <div 
                      key={appointment.id} 
                      className="p-6 hover:bg-surface-interactive transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-zenthea-teal focus:ring-offset-2"
                      onClick={() => handleAppointmentClick(appointment)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleAppointmentClick(appointment);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open appointment details for ${appointment.patientName}, ${appointment.type} at ${appointment.time}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-zenthea-teal/10 rounded-lg flex items-center justify-center">
                            <User className="w-5 h-5 text-zenthea-teal" />
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">{appointment.patientName}</p>
                            <p className="text-sm text-text-secondary">{appointment.type}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="font-semibold text-text-primary">{appointment.time}</p>
                            <Badge 
                              variant="outline" 
                              className={`${getStatusColor(appointment.status)} inline-flex items-center`}
                            >
                              {getStatusIcon(appointment.status)}
                              <span className="ml-1 capitalize">{appointment.status}</span>
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Tasks */}
          <Card className="bg-surface-elevated border-border-primary/20">
            <CardHeader className="border-b border-border-primary/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-text-primary">My Tasks</CardTitle>
                <Button size="sm" variant="outline" className="hover:text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 text-center text-text-secondary">
                  Loading tasks...
                </div>
              ) : tasks.length === 0 ? (
                <div className="p-6 text-center text-text-secondary">
                  No tasks for today
                </div>
              ) : (
                <div className="divide-y divide-border-primary/10">
                  {formattedTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="p-6 hover:bg-surface-interactive transition-colors cursor-pointer"
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => toggleTask(task.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium ${task.completed ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                                {task.title}
                              </p>
                              <p className="text-sm text-zenthea-teal font-medium mt-0.5">
                                {patients?.[0]?.name || 'Patient'}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {task.dueTime && (
                                <span className="text-xs text-text-secondary">{task.dueTime}</span>
                              )}
                              <Badge 
                                variant="outline" 
                                className={`${getPriorityColor(task.priority)} text-xs`}
                              >
                                {task.priority}
                              </Badge>
                            </div>
                          </div>
                          {task.description && (
                            <p className="text-sm text-text-secondary mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {task.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

