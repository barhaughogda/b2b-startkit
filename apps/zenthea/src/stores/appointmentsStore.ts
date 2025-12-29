import { create } from 'zustand/react';
import { useNotificationsStore } from './notificationsStore';

interface Appointment {
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
}

interface Provider {
  id: string;
  name: string;
  specialty: string;
  availability?: {
    [key: string]: {
      start: string;
      end: string;
      isAvailable: boolean;
    };
  };
}

interface AppointmentsState {
  appointments: Appointment[];
  providers: Provider[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchAppointments: (status?: string) => Promise<void>;
  fetchProviders: () => Promise<void>;
  bookAppointment: (appointmentData: {
    providerId: string;
    date: string;
    time: string;
    type: string;
    reason?: string;
    preferredLocation?: string;
  }) => Promise<void>;
  rescheduleAppointment: (appointmentId: string, newDate: string, newTime: string, reason?: string) => Promise<void>;
  cancelAppointment: (appointmentId: string, reason?: string) => Promise<void>;
  clearError: () => void;
}

export const useAppointmentsStore = create<AppointmentsState>()((set, get) => ({
  appointments: [],
  providers: [],
  isLoading: false,
  error: null,

  fetchAppointments: async (status = 'all') => {
    set({ isLoading: true, error: null });
    try {
      // Try to get session token from NextAuth
      const sessionResponse = await fetch('/api/auth/session');
      let session = null;
      
      if (sessionResponse.ok) {
        session = await sessionResponse.json();
      }

      // If no session or missing required fields, use demo mode
      // Check for both falsy values and empty strings
      const hasValidSession = session?.user && 
        session.user.id && 
        session.user.email && 
        session.user.role &&
        typeof session.user.id === 'string' && session.user.id.trim() !== '' &&
        typeof session.user.email === 'string' && session.user.email.trim() !== '' &&
        typeof session.user.role === 'string' && session.user.role.trim() !== '';
      
      if (!hasValidSession) {
        console.log('No active session or missing required fields, using demo mode', {
          hasSession: !!session,
          hasUser: !!session?.user,
          hasId: !!session?.user?.id,
          hasEmail: !!session?.user?.email,
          hasRole: !!session?.user?.role,
          idValue: session?.user?.id,
          emailValue: session?.user?.email,
          roleValue: session?.user?.role
        });
        
        // Provide mock demo data
        const mockAppointments: Appointment[] = [
          {
            id: 'demo-1',
            date: '2024-01-15',
            time: '10:00 AM',
            provider: {
              id: 'provider-1',
              name: 'Dr. Sarah Johnson',
              specialty: 'Internal Medicine'
            },
            type: 'General Checkup',
            status: 'scheduled',
            location: 'Main Office',
            duration: '30 minutes',
            notes: 'Annual physical examination',
            createdAt: Date.now() - 86400000, // 1 day ago
            updatedAt: Date.now() - 86400000
          },
          {
            id: 'demo-2',
            date: '2024-01-20',
            time: '2:30 PM',
            provider: {
              id: 'provider-2',
              name: 'Dr. Michael Chen',
              specialty: 'Cardiology'
            },
            type: 'Consultation',
            status: 'scheduled',
            location: 'Cardiology Clinic',
            duration: '45 minutes',
            notes: 'Heart health consultation',
            createdAt: Date.now() - 172800000, // 2 days ago
            updatedAt: Date.now() - 172800000
          }
        ];

        set({ appointments: mockAppointments, isLoading: false });
        return;
      }

      // Create a proper JWT token for API authentication
      let token: string | null = null;
      try {
        const requestBody = {
          userId: session.user.id,
          email: session.user.email,
          role: session.user.role,
          tenantId: session.user.tenantId || 'demo-tenant'
        };
        
        const jwtResponse = await fetch('/api/auth/jwt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        // Check if response is JSON before parsing
        const contentType = jwtResponse.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');

        if (jwtResponse.ok && isJson) {
          const jwtData = await jwtResponse.json();
          token = jwtData.token;
        } else {
          // If not JSON or not OK, fall back to demo mode
          let errorDetails = null;
          try {
            if (isJson) {
              const errorData = await jwtResponse.json();
              errorDetails = errorData;
            } else {
              const responseText = await jwtResponse.text();
              errorDetails = { raw: responseText.substring(0, 200) };
            }
          } catch (parseError) {
            errorDetails = { parseError: 'Failed to parse error response' };
          }
          
          console.warn('JWT endpoint error, falling back to demo mode', {
            status: jwtResponse.status,
            contentType,
            errorDetails,
            requestBody
          });
          // Fall back to demo mode if JWT generation fails
          const mockAppointments: Appointment[] = [
            {
              id: 'demo-1',
              date: '2024-01-15',
              time: '10:00 AM',
              provider: {
                id: 'provider-1',
                name: 'Dr. Sarah Johnson',
                specialty: 'Internal Medicine'
              },
              type: 'General Checkup',
              status: 'scheduled',
              location: 'Main Office',
              duration: '30 minutes',
              notes: 'Annual physical examination',
              createdAt: Date.now() - 86400000,
              updatedAt: Date.now() - 86400000
            }
          ];
          set({ appointments: mockAppointments, isLoading: false });
          return;
        }
      } catch (jwtError) {
        console.warn('JWT generation error, falling back to demo mode:', jwtError);
        // Fall back to demo mode if JWT generation fails
        const mockAppointments: Appointment[] = [
          {
            id: 'demo-1',
            date: '2024-01-15',
            time: '10:00 AM',
            provider: {
              id: 'provider-1',
              name: 'Dr. Sarah Johnson',
              specialty: 'Internal Medicine'
            },
            type: 'General Checkup',
            status: 'scheduled',
            location: 'Main Office',
            duration: '30 minutes',
            notes: 'Annual physical examination',
            createdAt: Date.now() - 86400000,
            updatedAt: Date.now() - 86400000
          }
        ];
        set({ appointments: mockAppointments, isLoading: false });
        return;
      }

      if (!token) {
        throw new Error('Failed to generate authentication token');
      }

      const response = await fetch(`/api/patient/appointments?status=${status}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': session.user.tenantId || 'demo-tenant',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch appointments');
      }

      const data = await response.json();
      set({ appointments: data.appointments, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch appointments',
        isLoading: false 
      });
    }
  },

  fetchProviders: async () => {
    set({ isLoading: true, error: null });
    try {
      // Mock providers for now - in real app, this would come from API
      const mockProviders: Provider[] = [
        {
          id: 'provider-1',
          name: 'Dr. Sarah Johnson',
          specialty: 'Internal Medicine',
        },
        {
          id: 'provider-2',
          name: 'Dr. Michael Chen',
          specialty: 'Cardiology',
        },
        {
          id: 'provider-3',
          name: 'Dr. Emily Davis',
          specialty: 'Dermatology',
        },
        {
          id: 'provider-4',
          name: 'Dr. Robert Wilson',
          specialty: 'Orthopedics',
        },
      ];

      set({ providers: mockProviders, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch providers',
        isLoading: false 
      });
    }
  },

  bookAppointment: async (appointmentData) => {
    set({ isLoading: true, error: null });
    try {
      // Try to get session token from NextAuth
      const sessionResponse = await fetch('/api/auth/session');
      let session = null;
      
      if (sessionResponse.ok) {
        session = await sessionResponse.json();
      }

      // If no session or missing required fields, use demo mode
      // Check for both falsy values and empty strings
      const hasValidSession = session?.user && 
        session.user.id && 
        session.user.email && 
        session.user.role &&
        typeof session.user.id === 'string' && session.user.id.trim() !== '' &&
        typeof session.user.email === 'string' && session.user.email.trim() !== '' &&
        typeof session.user.role === 'string' && session.user.role.trim() !== '';
      
      if (!hasValidSession) {
        console.log('No active session or missing required fields, using demo mode for booking', {
          hasSession: !!session,
          hasUser: !!session?.user,
          hasId: !!session?.user?.id,
          hasEmail: !!session?.user?.email,
          hasRole: !!session?.user?.role,
          idValue: session?.user?.id,
          emailValue: session?.user?.email,
          roleValue: session?.user?.role
        });
        
        // Simulate successful booking in demo mode
        const newAppointment: Appointment = {
          id: `demo-${Date.now()}`,
          date: appointmentData.date,
          time: appointmentData.time,
          provider: {
            id: appointmentData.providerId,
            name: 'Dr. Demo Provider',
            specialty: 'General Medicine'
          },
          type: appointmentData.type,
          status: 'scheduled',
          location: appointmentData.preferredLocation || 'Main Office',
          duration: '30 minutes',
          notes: appointmentData.reason,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        // Add to current appointments
        const currentAppointments = get().appointments;
        set({ 
          appointments: [...currentAppointments, newAppointment],
          isLoading: false 
        });
        
        // Add notification for successful booking
        const notificationsStore = useNotificationsStore.getState();
        notificationsStore.addNotification({
          type: 'appointment_confirmed',
          title: 'Appointment Scheduled (Demo)',
          message: `Your appointment has been scheduled for ${appointmentData.date} at ${appointmentData.time}`,
          appointmentId: newAppointment.id,
          isRead: false,
          priority: 'normal'
        });
        
        return;
      }

      // Create a proper JWT token for API authentication
      let token: string | null = null;
      try {
        const requestBody = {
          userId: session.user.id,
          email: session.user.email,
          role: session.user.role,
          tenantId: session.user.tenantId || 'demo-tenant'
        };
        
        const jwtResponse = await fetch('/api/auth/jwt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        // Check if response is JSON before parsing
        const contentType = jwtResponse.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');

        if (jwtResponse.ok && isJson) {
          const jwtData = await jwtResponse.json();
          token = jwtData.token;
        } else {
          // If not JSON or not OK, fall back to demo mode
          let errorDetails = null;
          try {
            if (isJson) {
              const errorData = await jwtResponse.json();
              errorDetails = errorData;
            } else {
              const responseText = await jwtResponse.text();
              errorDetails = { raw: responseText.substring(0, 200) };
            }
          } catch (parseError) {
            errorDetails = { parseError: 'Failed to parse error response' };
          }
          
          console.warn('JWT endpoint error, falling back to demo mode for booking', {
            status: jwtResponse.status,
            contentType,
            errorDetails,
            requestBody
          });
          // Fall back to demo mode if JWT generation fails
          const newAppointment: Appointment = {
            id: `demo-${Date.now()}`,
            date: appointmentData.date,
            time: appointmentData.time,
            provider: {
              id: appointmentData.providerId,
              name: 'Dr. Demo Provider',
              specialty: 'General Medicine'
            },
            type: appointmentData.type,
            status: 'scheduled',
            location: appointmentData.preferredLocation || 'Main Office',
            duration: '30 minutes',
            notes: appointmentData.reason,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          const currentAppointments = get().appointments;
          set({ 
            appointments: [...currentAppointments, newAppointment],
            isLoading: false 
          });
          return;
        }
      } catch (jwtError) {
        console.warn('JWT generation error, falling back to demo mode:', jwtError);
        // Fall back to demo mode if JWT generation fails
        const newAppointment: Appointment = {
          id: `demo-${Date.now()}`,
          date: appointmentData.date,
          time: appointmentData.time,
          provider: {
            id: appointmentData.providerId,
            name: 'Dr. Demo Provider',
            specialty: 'General Medicine'
          },
          type: appointmentData.type,
          status: 'scheduled',
          location: appointmentData.preferredLocation || 'Main Office',
          duration: '30 minutes',
          notes: appointmentData.reason,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        const currentAppointments = get().appointments;
        set({ 
          appointments: [...currentAppointments, newAppointment],
          isLoading: false 
        });
        return;
      }

      if (!token) {
        throw new Error('Failed to generate authentication token');
      }

      const response = await fetch('/api/patient/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': session.user.tenantId || 'demo-tenant',
        },
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to book appointment');
      }

      const data = await response.json();
      
      // Refresh appointments list
      await get().fetchAppointments();
      
      // Add notification for successful booking
      const notificationsStore = useNotificationsStore.getState();
      notificationsStore.addNotification({
        type: 'appointment_confirmed',
        title: 'Appointment Scheduled',
        message: `Your appointment has been scheduled for ${appointmentData.date} at ${appointmentData.time}`,
        appointmentId: data.appointment?.id,
        isRead: false,
        priority: 'normal'
      });
      
      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to book appointment',
        isLoading: false 
      });
    }
  },

  rescheduleAppointment: async (appointmentId, newDate, newTime, reason) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/patient/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': 'demo-tenant',
        },
        body: JSON.stringify({
          action: 'reschedule',
          newDate,
          newTime,
          reason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to reschedule appointment');
      }

      // Refresh appointments list
      await get().fetchAppointments();
      
      // Add notification for successful rescheduling
      const notificationsStore = useNotificationsStore.getState();
      notificationsStore.addNotification({
        type: 'appointment_rescheduled',
        title: 'Appointment Rescheduled',
        message: `Your appointment has been rescheduled to ${newDate} at ${newTime}`,
        appointmentId,
        isRead: false,
        priority: 'normal'
      });
      
      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to reschedule appointment',
        isLoading: false 
      });
    }
  },

  cancelAppointment: async (appointmentId, reason) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/patient/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': 'demo-tenant',
        },
        body: JSON.stringify({
          action: 'cancel',
          reason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to cancel appointment');
      }

      // Refresh appointments list
      await get().fetchAppointments();
      
      // Add notification for successful cancellation
      const notificationsStore = useNotificationsStore.getState();
      notificationsStore.addNotification({
        type: 'appointment_cancelled',
        title: 'Appointment Cancelled',
        message: `Your appointment has been cancelled${reason ? `: ${reason}` : ''}`,
        appointmentId,
        isRead: false,
        priority: 'normal'
      });
      
      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to cancel appointment',
        isLoading: false 
      });
    }
  },

  clearError: () => set({ error: null }),
}));
