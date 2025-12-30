'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Phone,
  Mail,
  Stethoscope,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Paperclip,
  MessageSquare,
  Users,
  Tag,
  Calendar as CalendarIcon,
  FileText,
  Activity,
  Save,
  Loader2,
  CheckCircle,
  Video,
  Search,
  Copy,
  CalendarPlus,
  Navigation,
  CalendarClock,
  XCircle,
} from 'lucide-react';
import { BaseCardComponent } from './BaseCard';
import { BaseCardProps, CardEventHandlers, CardComment, TeamMember, Tag as CardTag, Document, TaskStatus, Priority } from './types';
import { cn } from '@/lib/utils';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { LocationSelector } from '@/components/provider/LocationSelector';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AppointmentBookingWizard, PatientAppointmentFormData } from '@/components/scheduling/AppointmentBookingWizard';
import { RescheduleAppointmentModal } from '@/components/patient/RescheduleAppointmentModal';
import { CancelAppointmentModal } from '@/components/patient/CancelAppointmentModal';
import { useCareTeam } from '@/hooks/useCareTeam';

// Appointment form data interface
interface AppointmentFormData {
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  duration: number;
  type: 'consultation' | 'follow-up' | 'procedure' | 'emergency';
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  locationId?: string;
  notes?: string;
  calendarOwnerId?: string; // For creating on shared calendars
}

interface AppointmentCardProps extends BaseCardProps {
  appointmentData: {
    id: string;
    patientId: string;
    patientName: string;
    time: string;
    date: string;
    duration: number;
    type: string;
    status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
    location?: string;
    locationId?: string;
    provider?: string;
    providerId?: string; // Provider ID needed for reschedule modal availability loading
    notes?: string;
    reminders?: string[];
    careTeam?: TeamMember[];
    tags?: CardTag[];
    documents?: Document[];
    comments?: CardComment[];
    mode?: 'view' | 'edit' | 'create'; // Mode property for calendar visualization
  };
  // New props for create/edit mode
  mode?: 'view' | 'edit' | 'create';
  prefilledDate?: Date;
  prefilledTime?: string;
  onSave?: (data: AppointmentFormData) => Promise<void>;
  onCancel?: () => void;
}

export function AppointmentCard({ 
  appointmentData, 
  handlers,
  activeTab = 'info',
  onTabChange,
  mode = 'view',
  prefilledDate,
  prefilledTime,
  onSave,
  onCancel,
  ...props 
}: AppointmentCardProps & { handlers: CardEventHandlers; activeTab?: 'info' | 'members' | 'tags' | 'dueDate' | 'attachments' | 'notes' | 'activity'; onTabChange?: (tab: 'info' | 'members' | 'tags' | 'dueDate' | 'attachments' | 'notes' | 'activity') => void }) {
  const { data: session } = useZentheaSession();
  const tenantId = session?.user?.tenantId || 'demo-tenant';
  const currentUserId = session?.user?.id;
  
  const { 
    patientName, 
    time, 
    date, 
    duration, 
    type, 
    status, 
    location,
    locationId,
    provider,
    providerId,
    notes,
    careTeam = [],
    tags = [],
    documents = [],
    comments = []
  } = appointmentData;

  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(mode === 'create' || mode === 'edit');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [primaryProviderDefaulted, setPrimaryProviderDefaulted] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  
  // Patient wizard form data (for patient users creating appointments)
  const [patientWizardData, setPatientWizardData] = useState<PatientAppointmentFormData>({
    providerId: '',
    providerName: '',
    scheduledAt: 0,
    duration: duration || 30,
    type: 'consultation',
    locationId: locationId || '',
    notes: notes || '',
  });
  
  // Check if user is a patient
  const isPatient = session?.user?.role === 'patient';

  // Get care team for auto-selecting primary provider (patient users only)
  const { careTeam: patientCareTeam } = useCareTeam();
  
  // Track if auto-select has been performed (prevents overwriting user selection)
  const hasAutoSelectedProvider = useRef(false);

  // Sync isEditing state with mode prop
  useEffect(() => {
    setIsEditing(mode === 'create' || mode === 'edit');
  }, [mode]);

  // Auto-select primary provider for patient wizard (patient users only)
  // Only runs ONCE when care team loads - will not overwrite user selections
  useEffect(() => {
    if (
      isPatient &&
      mode === 'create' &&
      !hasAutoSelectedProvider.current && // Only run once
      patientCareTeam &&
      patientCareTeam.length > 0
    ) {
      // Find the primary provider from the care team
      const primaryMember = patientCareTeam.find(member => member.isPrimaryProvider);
      if (primaryMember) {
        hasAutoSelectedProvider.current = true; // Mark as auto-selected
        setPatientWizardData(prev => ({
          ...prev,
          providerId: primaryMember.providerId,
          providerName: primaryMember.name,
        }));
      }
    }
  }, [isPatient, mode, patientCareTeam]);

  // Fetch primary provider for the patient (for defaulting in create mode)
  const primaryProviderResult = useQuery(
    api.careTeam.getPrimaryProvider,
    mode === 'create' && appointmentData.patientId && tenantId
      ? { patientId: appointmentData.patientId as Id<'patients'>, tenantId }
      : 'skip'
  );
  
  // Form state
  const [formData, setFormData] = useState<AppointmentFormData>({
    patientId: appointmentData.patientId || '',
    patientName: patientName || '',
    date: prefilledDate ? prefilledDate.toISOString().split('T')[0]!! : date || new Date().toISOString().split('T')[0]!!,
    time: prefilledTime || time || '09:00',
    duration: duration || 30,
    type: (type as AppointmentFormData['type']) || 'consultation',
    status: status || 'scheduled',
    locationId: locationId || '',
    notes: notes || '',
    calendarOwnerId: currentUserId || '',
  });
  
  // Default to primary provider when creating a new appointment
  useEffect(() => {
    if (
      mode === 'create' && 
      !primaryProviderDefaulted &&
      primaryProviderResult?.hasProvider && 
      primaryProviderResult.primaryProvider?._id
    ) {
      setFormData(prev => ({
        ...prev,
        calendarOwnerId: primaryProviderResult.primaryProvider!._id,
      }));
      setPrimaryProviderDefaulted(true);
    }
  }, [mode, primaryProviderResult, primaryProviderDefaulted]);

  // Convex mutations
  const createAppointmentMutation = useMutation(api.appointments.createAppointment);
  const updateAppointmentMutation = useMutation(api.appointments.updateAppointment);
  
  // Appointment members queries and mutations
  const appointmentMembers = useQuery(
    api.appointmentMembers.getAppointmentMembers,
    mode !== 'create' && appointmentData.id && appointmentData.id !== 'new' && tenantId
      ? { appointmentId: appointmentData.id as Id<'appointments'>, tenantId }
      : 'skip'
  );
  const addMemberMutation = useMutation(api.appointmentMembers.addAppointmentMember);
  const removeMemberMutation = useMutation(api.appointmentMembers.removeAppointmentMember);
  const updateMemberStatusMutation = useMutation(api.appointmentMembers.updateAppointmentMemberStatus);
  
  // Fetch users for member selection (providers/staff in tenant)
  const availableUsers = useQuery(
    api.users.getUsersByTenant,
    tenantId ? { tenantId } : 'skip'
  );
  
  // State for member selection
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string | null>(null);
  
  // Fetch patients for selector
  const patientsResult = useQuery(
    api.patients.getPatientsByTenant,
    tenantId ? { tenantId, limit: 100 } : 'skip'
  );
  // Extract patients array from pagination result
  const patients = patientsResult?.page || [];
  
  // Get patient record for patient users (for creating appointments)
  const patientEmail = session?.user?.email;
  const patientRecord = useQuery(
    api.patients.getPatientByEmail,
    isPatient && patientEmail && tenantId
      ? { email: patientEmail, tenantId }
      : 'skip'
  );
  
  // Patient search state
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  
  // Filter patients based on search query
  const filteredPatients = useMemo(() => {
    if (!patientSearchQuery.trim()) {
      return patients;
    }
    const query = patientSearchQuery.toLowerCase().trim();
    return patients.filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      return fullName.includes(query) || 
             patient.firstName?.toLowerCase().includes(query) ||
             patient.lastName?.toLowerCase().includes(query);
    });
  }, [patients, patientSearchQuery]);
  
  // Fetch shared calendars for calendar owner selector
  const sharedCalendars = useQuery(
    api.calendarShares.getSharedCalendars,
    currentUserId && tenantId
      ? { userId: currentUserId as Id<'users'>, tenantId }
      : 'skip'
  );
  
  // Filter to only calendars with edit permission
  const editableCalendars = sharedCalendars?.filter((cal: { permission: 'view' | 'edit' }) => cal.permission === 'edit') || [];

  // Update form field helper
  const updateField = (field: keyof AppointmentFormData, value: string | number) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Sync formData changes back to card's appointmentData for calendar visualization
      if (handlers.onAppointmentDataChange && (mode === 'create' || mode === 'edit')) {
        handlers.onAppointmentDataChange(props.id, {
          ...appointmentData,
          date: updated.date,
          time: updated.time,
          duration: updated.duration,
          mode: mode,
        });
      }
      return updated;
    });
    setSaveError(null);
  };

  // Handle patient wizard save (converts PatientAppointmentFormData to AppointmentFormData)
  const handlePatientWizardSave = async () => {
    if (!patientWizardData.providerId) {
      setSaveError('Please select a provider');
      return;
    }
    if (!patientWizardData.scheduledAt) {
      setSaveError('Please select a date and time');
      return;
    }
    if (!patientRecord?._id) {
      setSaveError('Patient record not found');
      toast.error('Patient record not found', {
        description: 'Unable to find your patient record. Please contact support.'
      });
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Map appointment type (telehealth -> consultation)
      const appointmentType = patientWizardData.type === 'telehealth' 
        ? 'consultation' 
        : patientWizardData.type === 'follow-up' 
        ? 'follow-up' 
        : patientWizardData.type === 'procedure'
        ? 'procedure'
        : 'consultation';

      // IMPORTANT: userId must be the PROVIDER's user ID for conflict checking
      // The appointments.userId field represents who owns the appointment slot (the provider)
      // The patient's ID is tracked via patientId, not userId
      const providerUserId = patientWizardData.userId;
      if (!providerUserId) {
        throw new Error('Provider user ID is required for appointment creation');
      }

      await createAppointmentMutation({
        patientId: patientRecord._id as Id<'patients'>,
        userId: providerUserId as Id<'users'>, // Provider's user ID for conflict checking
        providerId: patientWizardData.providerId as Id<'providers'>, // Provider ID for provider profiles
        scheduledAt: patientWizardData.scheduledAt,
        duration: patientWizardData.duration,
        type: appointmentType,
        notes: patientWizardData.notes,
        locationId: patientWizardData.locationId 
          ? (patientWizardData.locationId as Id<'locations'>) 
          : undefined,
        clinicId: patientWizardData.clinicId
          ? (patientWizardData.clinicId as Id<'clinics'>)
          : undefined,
        createdBy: currentUserId as Id<'users'>, // createdBy is the patient who initiated
        tenantId,
      });

      setIsEditing(false);
      
      // Show success message
      toast.success('Appointment scheduled successfully!', {
        description: `Appointment scheduled for ${format(new Date(patientWizardData.scheduledAt), 'EEEE, MMMM d, yyyy')} at ${format(new Date(patientWizardData.scheduledAt), 'h:mm a')}`,
      });
      
      // Close the card after successful save
      handlers.onClose?.(props.id);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to save appointment:', error);
      }
      setSaveError(error instanceof Error ? error.message : 'Failed to save appointment');
      toast.error('Failed to schedule appointment', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle save (for provider/staff form)
  const handleSave = async () => {
    if (!formData.patientId) {
      setSaveError('Please select a patient');
      return;
    }
    if (!formData.date || !formData.time) {
      setSaveError('Please select a date and time');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Convert date and time to timestamp
      const scheduledAt = new Date(`${formData.date}T${formData.time}`).getTime();
      
      if (mode === 'create') {
        await createAppointmentMutation({
          patientId: formData.patientId as Id<'patients'>,
          userId: (formData.calendarOwnerId || currentUserId) as Id<'users'>,
          scheduledAt,
          duration: formData.duration,
          type: formData.type,
          notes: formData.notes,
          locationId: formData.locationId ? formData.locationId as Id<'locations'> : undefined,
          createdBy: currentUserId as Id<'users'>,
          tenantId,
        });
      } else {
        await updateAppointmentMutation({
          id: appointmentData.id as Id<'appointments'>,
          scheduledAt,
          duration: formData.duration,
          type: formData.type,
          status: formData.status,
          notes: formData.notes,
          locationId: formData.locationId ? formData.locationId as Id<'locations'> : undefined,
          lastModifiedBy: currentUserId as Id<'users'>,
        });
      }

      setIsEditing(false);
      onSave?.(formData);
      
      // Reset mode to 'view' to hide calendar selection block
      if (handlers.onAppointmentDataChange) {
        handlers.onAppointmentDataChange(props.id, {
          ...appointmentData,
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          mode: 'view',
        });
      }
      
      // Show success message
      if (mode === 'create') {
        toast.success('Appointment created', {
          description: `Appointment scheduled for ${formData.date} at ${formData.time}`,
        });
        // Close the card after successful save
        handlers.onClose?.(props.id);
      } else {
        toast.success('Appointment updated', {
          description: 'The appointment has been successfully updated.',
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to save appointment:', error);
      }
      setSaveError(error instanceof Error ? error.message : 'Failed to save appointment');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (mode === 'create') {
      handlers.onClose?.(props.id);
    } else {
      setIsEditing(false);
      // Reset form to original values
      setFormData({
        patientId: appointmentData.patientId || '',
        patientName: patientName || '',
        date: date || new Date().toISOString().split('T')[0]!!,
        time: time || '09:00',
        duration: duration || 30,
        type: (type as AppointmentFormData['type']) || 'consultation',
        status: status || 'scheduled',
        locationId: locationId || '',
        notes: notes || '',
        calendarOwnerId: currentUserId || '',
      });
      // Reset mode back to 'view' to hide calendar selection block
      if (handlers.onAppointmentDataChange) {
        handlers.onAppointmentDataChange(props.id, {
          ...appointmentData,
          mode: 'view',
        });
      }
    }
    onCancel?.();
  };

  // Appointment type options
  const appointmentTypes = [
    { value: 'consultation', label: 'Consultation', icon: User },
    { value: 'follow-up', label: 'Follow-up', icon: CheckCircle },
    { value: 'procedure', label: 'Procedure', icon: AlertCircle },
    { value: 'emergency', label: 'Emergency', icon: AlertCircle }
  ];

  // Duration options
  const durationOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
  ];

  // Use the task status config from BaseCard
  const taskStatusConfig = {
    new: { color: 'bg-blue-100 text-blue-800', label: 'New' },
    inProgress: { color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
    deferred: { color: 'bg-gray-100 text-gray-800', label: 'Deferred' },
    waitingFor: { color: 'bg-purple-100 text-purple-800', label: 'Waiting For' },
    cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
    completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
  };

  const statusInfo = taskStatusConfig[props.status] || taskStatusConfig.new;

  // Patient Info Section (no duplicate controls)

  // ============================================
  // Calendly-Inspired Quick Actions
  // ============================================

  // Helper function to parse time string (handles both 12-hour and 24-hour formats)
  const parseTimeTo24Hour = useCallback((timeStr: string): string => {
    if (!timeStr) return '';
    
    // Check if it's already in 24-hour format (HH:mm or HH:mm:ss)
    const time24Regex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
    const match24 = timeStr.match(time24Regex);
    if (match24 && match24[1] && match24[2]) {
      // Already in 24-hour format
      const hours = parseInt(match24[1], 10);
      const minutes = match24[2];
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    
    // Parse 12-hour format (e.g., "9:00 AM", "2:30 PM")
    const time12Regex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
    const match12 = timeStr.match(time12Regex);
    if (match12 && match12[1] && match12[2] && match12[3]) {
      let hours = parseInt(match12[1], 10);
      const minutes = match12[2];
      const ampm = match12[3].toUpperCase();
      
      if (ampm === 'PM' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    
    // If we can't parse it, return empty string
    console.warn('Unable to parse time format:', timeStr);
    return '';
  }, []);

  // Generate Google Calendar URL
  const generateGoogleCalendarUrl = useCallback(() => {
    if (!date || !time) return '';
    
    // Convert time to 24-hour format if needed
    const time24Hour = parseTimeTo24Hour(time);
    if (!time24Hour) {
      console.error('Unable to parse time:', { date, time });
      toast.error('Invalid time format', {
        description: 'Please check that the appointment time is valid.'
      });
      return '';
    }
    
    // Create date string in ISO format (YYYY-MM-DDTHH:mm)
    const dateTimeString = `${date}T${time24Hour}`;
    const startDate = new Date(dateTimeString);
    
    // Validate that the date is valid before proceeding
    if (isNaN(startDate.getTime())) {
      console.error('Invalid date/time combination:', { date, time, time24Hour, dateTimeString });
      toast.error('Invalid date or time', {
        description: 'Please check that the appointment date and time are valid.'
      });
      return '';
    }
    
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    // Validate end date as well
    if (isNaN(endDate.getTime())) {
      console.error('Invalid end date calculated:', { startDate, duration });
      toast.error('Invalid date calculation', {
        description: 'Unable to calculate end time for the appointment.'
      });
      return '';
    }
    
    const formatGoogleDate = (d: Date) => {
      // Double-check date validity before formatting
      if (isNaN(d.getTime())) {
        throw new Error('Invalid date passed to formatGoogleDate');
      }
      return d.toISOString().replace(/-|:|\.\d{3}/g, '');
    };
    
    try {
      const title = encodeURIComponent(`${type} - ${patientName}`);
      const locationStr = encodeURIComponent(location || '');
      const details = encodeURIComponent(notes || `Appointment at Zenthea Healthcare`);
      
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${details}&location=${locationStr}`;
    } catch (error) {
      console.error('Error generating Google Calendar URL:', error);
      toast.error('Unable to generate calendar link', {
        description: 'Please check that the appointment date and time are valid.'
      });
      return '';
    }
  }, [date, time, duration, type, patientName, location, notes, parseTimeTo24Hour]);

  // Generate iCal file content and download
  const generateICalFile = useCallback(() => {
    if (!date || !time) return;
    
    // Convert time to 24-hour format if needed
    const time24Hour = parseTimeTo24Hour(time);
    if (!time24Hour) {
      console.error('Unable to parse time:', { date, time });
      toast.error('Invalid time format', {
        description: 'Please check that the appointment time is valid.'
      });
      return;
    }
    
    // Create date string in ISO format (YYYY-MM-DDTHH:mm)
    const dateTimeString = `${date}T${time24Hour}`;
    const startDate = new Date(dateTimeString);
    
    // Validate that the date is valid before proceeding
    if (isNaN(startDate.getTime())) {
      console.error('Invalid date/time combination:', { date, time, time24Hour, dateTimeString });
      toast.error('Invalid date or time', {
        description: 'Please check that the appointment date and time are valid.'
      });
      return;
    }
    
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    // Validate end date as well
    if (isNaN(endDate.getTime())) {
      console.error('Invalid end date calculated:', { startDate, duration });
      toast.error('Invalid date calculation', {
        description: 'Unable to calculate end time for the appointment.'
      });
      return;
    }
    
    const formatICalDate = (d: Date) => {
      // Double-check date validity before formatting
      if (isNaN(d.getTime())) {
        throw new Error('Invalid date passed to formatICalDate');
      }
      return d.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, 15) + 'Z';
    };
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Zenthea Healthcare//Appointment//EN',
      'BEGIN:VEVENT',
      `UID:${appointmentData.id}@zenthea.com`,
      `DTSTAMP:${formatICalDate(new Date())}`,
      `DTSTART:${formatICalDate(startDate)}`,
      `DTEND:${formatICalDate(endDate)}`,
      `SUMMARY:${type} - ${patientName}`,
      `DESCRIPTION:${notes || 'Appointment at Zenthea Healthcare'}`,
      location ? `LOCATION:${location}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appointment-${appointmentData.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Calendar file downloaded');
  }, [date, time, duration, type, patientName, location, notes, appointmentData.id, parseTimeTo24Hour]);

  // Copy appointment details to clipboard
  const copyAppointmentDetails = useCallback(async () => {
    const details = [
      `📅 ${type} Appointment`,
      ``,
      `👤 Patient: ${patientName}`,
      `🗓️ Date: ${date}`,
      `⏰ Time: ${time}`,
      `⏱️ Duration: ${duration} minutes`,
      provider ? `👨‍⚕️ Provider: ${provider}` : '',
      location ? `📍 Location: ${location}` : '',
      notes ? `📝 Notes: ${notes}` : '',
      ``,
      `Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    ].filter(Boolean).join('\n');
    
    try {
      await navigator.clipboard.writeText(details);
      toast.success('Appointment details copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  }, [type, patientName, date, time, duration, provider, location, notes, status]);

  // Generate directions URL (Google Maps)
  const getDirectionsUrl = useCallback(() => {
    if (!location) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  }, [location]);

  // Info Tab - Card-specific content (View Mode)
  const renderInfoView = () => (
    <div className="p-4">
      <div className="space-y-4">
        {/* Appointment Details */}
        <div className="bg-surface-elevated p-4 rounded-lg">
          <h4 className="text-sm font-medium text-text-primary mb-3">Appointment Details</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-zenthea-teal-600" />
              <span className="text-sm">{date}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zenthea-teal-600" />
              <span className="text-sm">{time}</span>
              <span className="text-xs text-text-secondary">({duration} min)</span>
            </div>

            {location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-zenthea-teal-600" />
                <span className="text-sm">{location}</span>
              </div>
            )}

            {provider && (
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-zenthea-teal-600" />
                <span className="text-sm">{provider}</span>
              </div>
            )}
          </div>
        </div>

        {/* Type */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {type}
          </Badge>
        </div>

        {/* Quick Actions - Calendly-inspired */}
        <div className="bg-surface-elevated p-3 rounded-lg">
          <h4 className="text-xs font-medium text-text-secondary mb-2">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            {/* Add to Google Calendar */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const url = generateGoogleCalendarUrl();
                if (url) {
                  window.open(url, '_blank');
                }
              }}
              className="h-8 text-xs gap-1.5"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Add to Google Calendar
            </Button>

            {/* Download iCal */}
            <Button
              size="sm"
              variant="outline"
              onClick={generateICalFile}
              className="h-8 text-xs gap-1.5"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Download .ics
            </Button>

            {/* Copy Details */}
            <Button
              size="sm"
              variant="outline"
              onClick={copyAppointmentDetails}
              className="h-8 text-xs gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Details
            </Button>

            {/* Directions (only if location exists) */}
            {location && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(getDirectionsUrl(), '_blank')}
                className="h-8 text-xs gap-1.5"
              >
                <Navigation className="h-3.5 w-3.5" />
                Directions
              </Button>
            )}
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <div className="bg-surface-elevated p-3 rounded-md">
            <h4 className="text-xs font-medium text-text-secondary mb-1">Notes</h4>
            <p className="text-sm text-text-primary">{notes}</p>
          </div>
        )}

        {/* Reminders */}
        {appointmentData.reminders && appointmentData.reminders.length > 0 && (
          <div className="bg-yellow-50 p-3 rounded-md">
            <h4 className="text-xs font-medium text-yellow-800 mb-1">Reminders</h4>
            <ul className="text-xs text-yellow-700 space-y-1">
              {appointmentData.reminders.map((reminder, index) => (
                <li key={index} className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {reminder}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons - Only show Reschedule/Cancel for upcoming appointments */}
        {mode === 'view' && status !== 'completed' && status !== 'cancelled' && (
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                setIsRescheduleModalOpen(true);
              }}
            >
              <CalendarClock className="h-3 w-3 mr-1" />
              Reschedule
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                setIsCancelModalOpen(true);
              }}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Info Tab - Edit/Create Form
  const renderInfoForm = () => {
    // Show wizard for patients creating appointments
    if (isPatient && mode === 'create') {
      return (
        <div className="p-4">
          <AppointmentBookingWizard
            tenantId={tenantId}
            formData={patientWizardData}
            onFormDataChange={setPatientWizardData}
            onSave={handlePatientWizardSave}
            onCancel={handleCancel}
            isSaving={isSaving}
            saveError={saveError}
          />
        </div>
      );
    }
    
    // Show regular form for providers/staff or edit mode
    return (
      <div className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
        {/* Error Message */}
        {saveError && (
          <div className="bg-status-error/10 border border-status-error/20 text-status-error p-3 rounded-md text-sm">
            {saveError}
          </div>
        )}

        {/* Patient Selector (only for create mode) */}
        {mode === 'create' && (
          <div>
            <Label htmlFor="patient-select">Patient *</Label>
            <Select 
              value={formData.patientId} 
              onValueChange={(value) => {
                const patient = patients?.find(p => p._id === value);
                updateField('patientId', value);
                if (patient) {
                  updateField('patientName', `${patient.firstName} ${patient.lastName}`);
                }
                // Clear search when patient is selected
                setPatientSearchQuery('');
              }}
              onOpenChange={(open) => {
                // Clear search when dropdown closes without selection
                if (!open) {
                  setPatientSearchQuery('');
                }
              }}
            >
              <SelectTrigger id="patient-select">
                <SelectValue placeholder="Select a patient" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {/* Search Input */}
                <div className="sticky top-0 z-10 bg-surface-elevated border-b border-border-primary px-2 py-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                    <Input
                      type="text"
                      placeholder="Search patients..."
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-sm"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      aria-label="Search patients"
                    />
                  </div>
                </div>
                {/* Filtered Patient List */}
                <div className="max-h-[240px] overflow-y-auto">
                  {filteredPatients.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-text-secondary text-center">
                      {patientSearchQuery ? 'No patients found' : 'No patients available'}
                    </div>
                  ) : (
                    filteredPatients.map((patient) => (
                      <SelectItem key={patient._id} value={patient._id}>
                        {patient.firstName} {patient.lastName}
                      </SelectItem>
                    ))
                  )}
                </div>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Patient Display (read-only in edit mode) */}
        {mode === 'edit' && patientName && (
          <div>
            <Label>Patient</Label>
            <div className="flex items-center gap-2 p-2 bg-surface-elevated rounded-md text-sm">
              <User className="h-4 w-4 text-text-secondary" />
              <span>{patientName}</span>
            </div>
          </div>
        )}

        {/* Calendar Owner Selector (for shared calendars) */}
        {mode === 'create' && editableCalendars.length > 0 && (
          <div>
            <Label htmlFor="calendar-owner">Create on Calendar</Label>
            <Select 
              value={formData.calendarOwnerId || currentUserId || ''} 
              onValueChange={(value) => updateField('calendarOwnerId', value)}
            >
              <SelectTrigger id="calendar-owner">
                <SelectValue placeholder="Select calendar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={currentUserId || ''}>My Calendar</SelectItem>
                {editableCalendars.map((cal: { ownerUserId: Id<'users'>; owner?: { firstName?: string; lastName?: string; name?: string } | null }) => {
                  const ownerName = cal.owner 
                    ? `${cal.owner.firstName || ''} ${cal.owner.lastName || ''}`.trim() || cal.owner.name
                    : 'Unknown';
                  return (
                    <SelectItem key={cal.ownerUserId} value={cal.ownerUserId}>
                      {ownerName}&apos;s Calendar
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date">Date *</Label>
            <div className="relative flex">
              <div className="relative flex-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary hover:text-text-primary cursor-pointer z-10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                      aria-label="Open date picker"
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.date ? (() => {
                        try {
                          const date = new Date(formData.date);
                          return isNaN(date.getTime()) ? undefined : date;
                        } catch {
                          return undefined;
                        }
                      })() : undefined}
                      onSelect={(date) => {
                        if (date) {
                          updateField('date', format(date, 'yyyy-MM-dd'));
                        }
                      }}
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  className="pl-10 pr-10"
                  required
                  aria-label="Enter or select appointment date"
                />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="time">Time *</Label>
            <div className="relative flex">
              <div className="relative flex-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary hover:text-text-primary cursor-pointer z-10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                      aria-label="Open time picker"
                    >
                      <Clock className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="end">
                    <div className="p-2">
                      <div className="max-h-[300px] overflow-y-auto">
                        {(() => {
                          // Generate time slots every 30 minutes from 8:00 AM to 6:00 PM
                          const timeSlots: string[] = [];
                          for (let hour = 8; hour <= 18; hour++) {
                            for (let minute = 0; minute < 60; minute += 30) {
                              const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                              timeSlots.push(timeString);
                            }
                          }
                          return timeSlots.map((time) => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => {
                                updateField('time', time);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                                formData.time === time && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => updateField('time', e.target.value)}
                  className="pl-10 pr-10"
                  required
                  aria-label="Enter or select appointment time"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Duration */}
        <div>
          <Label htmlFor="duration">Duration</Label>
          <Select 
            value={formData.duration.toString()} 
            onValueChange={(value) => updateField('duration', parseInt(value))}
          >
            <SelectTrigger id="duration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {durationOptions.map(option => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Selector (only in edit mode) */}
        {mode === 'edit' && (
          <div>
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => updateField('status', value)}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-status-info" />
                    Scheduled
                  </div>
                </SelectItem>
                <SelectItem value="confirmed">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-status-success" />
                    Confirmed
                  </div>
                </SelectItem>
                <SelectItem value="in-progress">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-status-warning" />
                    In Progress
                  </div>
                </SelectItem>
                <SelectItem value="completed">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-zenthea-teal" />
                    Completed
                  </div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-status-error" />
                    Cancelled
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Appointment Type */}
        <div>
          <Label>Appointment Type</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {appointmentTypes.map(apptType => {
              const Icon = apptType.icon;
              return (
                <Button
                  key={apptType.value}
                  type="button"
                  variant={formData.type === apptType.value ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => updateField('type', apptType.value)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {apptType.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Location */}
        <LocationSelector
          value={formData.locationId}
          onValueChange={(value) => updateField('locationId', value)}
          tenantId={tenantId}
          label="Location"
          placeholder="Select a location"
        />

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Appointment notes, preparation instructions..."
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-primary">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {mode === 'create' ? 'Create Appointment' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
    );
  };

  // Info Tab - Render based on mode
  const renderInfo = () => {
    if (isEditing) {
      return renderInfoForm();
    }
    return renderInfoView();
  };

  // Handle adding a member
  const handleAddMember = async (userId: string, role: 'organizer' | 'attendee' | 'optional') => {
    if (!appointmentData.id || appointmentData.id === 'new' || !currentUserId) {
      toast.error('Cannot add members', { description: 'Please save the appointment first.' });
      return;
    }
    
    try {
      await addMemberMutation({
        appointmentId: appointmentData.id as Id<'appointments'>,
        userId: userId as Id<'users'>,
        role,
        addedBy: currentUserId as Id<'users'>,
        tenantId,
      });
      toast.success('Member added', { description: 'Team member has been added to the appointment.' });
      setIsAddingMember(false);
      setSelectedUserToAdd(null);
    } catch (error) {
      toast.error('Failed to add member', { 
        description: error instanceof Error ? error.message : 'An error occurred' 
      });
    }
  };
  
  // Handle removing a member
  const handleRemoveMember = async (userId: string) => {
    if (!appointmentData.id || appointmentData.id === 'new') return;
    
    try {
      await removeMemberMutation({
        appointmentId: appointmentData.id as Id<'appointments'>,
        userId: userId as Id<'users'>,
        tenantId,
      });
      toast.success('Member removed', { description: 'Team member has been removed from the appointment.' });
    } catch (error) {
      toast.error('Failed to remove member', { 
        description: error instanceof Error ? error.message : 'An error occurred' 
      });
    }
  };

  // Members Tab - Appointment team management
  const renderCareTeam = () => {
    const isNewAppointment = mode === 'create' || appointmentData.id === 'new';
    const members = appointmentMembers || [];
    const existingMemberIds = new Set(members.map((m: any) => m.userId));
    const availableToAdd = (availableUsers || []).filter(
      (user: any) => !existingMemberIds.has(user._id) && user._id !== currentUserId
    );
    
    const getRoleColor = (role: string) => {
      switch (role) {
        case 'organizer': return 'bg-zenthea-purple/10 text-zenthea-purple border-zenthea-purple/20';
        case 'attendee': return 'bg-zenthea-teal/10 text-zenthea-teal border-zenthea-teal/20';
        case 'optional': return 'bg-text-secondary/10 text-text-secondary border-text-secondary/20';
        default: return 'bg-text-secondary/10 text-text-secondary border-text-secondary/20';
      }
    };
    
    const getStatusBadge = (status: string) => {
      switch (status) {
        case 'accepted': return <Badge variant="outline" className="bg-status-success/10 text-status-success text-[10px] py-0">Accepted</Badge>;
        case 'declined': return <Badge variant="outline" className="bg-status-error/10 text-status-error text-[10px] py-0">Declined</Badge>;
        case 'tentative': return <Badge variant="outline" className="bg-status-warning/10 text-status-warning text-[10px] py-0">Tentative</Badge>;
        default: return <Badge variant="outline" className="bg-status-info/10 text-status-info text-[10px] py-0">Pending</Badge>;
      }
    };
    
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-text-primary">Appointment Members</h4>
          {!isNewAppointment && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsAddingMember(!isAddingMember)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Member
            </Button>
          )}
        </div>
        
        {/* Add Member Selector */}
        {isAddingMember && availableToAdd.length > 0 && (
          <div className="mb-4 p-3 bg-surface-elevated rounded-lg border border-border-primary">
            <Label className="text-xs mb-2 block">Select Team Member</Label>
            <Select value={selectedUserToAdd || ''} onValueChange={setSelectedUserToAdd}>
              <SelectTrigger className="w-full mb-2">
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map((user: any) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user.name || user.email}
                    {user.role && <span className="text-text-tertiary ml-1">({user.role})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedUserToAdd && (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleAddMember(selectedUserToAdd, 'attendee')}
                  className="flex-1"
                >
                  Add as Attendee
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleAddMember(selectedUserToAdd, 'optional')}
                  className="flex-1"
                >
                  Add as Optional
                </Button>
              </div>
            )}
          </div>
        )}
        
        {isAddingMember && availableToAdd.length === 0 && (
          <div className="mb-4 p-3 bg-surface-elevated rounded-lg text-xs text-text-tertiary">
            No more users available to add.
          </div>
        )}
        
        {isNewAppointment && (
          <div className="mb-4 p-3 bg-status-info/10 border border-status-info/20 rounded-lg text-xs text-status-info">
            <AlertCircle className="h-3 w-3 inline-block mr-1" />
            Save the appointment first to add team members.
          </div>
        )}
        
        {/* Members List */}
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-2">
            {members.map((member: any) => (
              <div 
                key={member._id} 
                className="flex items-center justify-between gap-2 bg-surface-elevated p-2 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={member.user?.image} />
                    <AvatarFallback className="text-xs bg-zenthea-teal/20 text-zenthea-teal">
                      {member.user?.firstName?.[0]}{member.user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {member.user?.firstName && member.user?.lastName
                        ? `${member.user.firstName} ${member.user.lastName}`
                        : member.user?.name || member.user?.email || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant="outline" className={cn("text-[10px] py-0", getRoleColor(member.role))}>
                        {member.role}
                      </Badge>
                      {getStatusBadge(member.status)}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 flex-shrink-0 hover:bg-status-error/10 hover:text-status-error"
                  onClick={() => handleRemoveMember(member.userId)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            
            {/* Show legacy care team members if no appointment members */}
            {members.length === 0 && careTeam.length > 0 && (
              <>
                <div className="text-xs text-text-tertiary mb-2">Legacy Care Team:</div>
                {careTeam.map((member) => (
                  <div key={member.id} className="flex items-center gap-2 bg-surface-elevated p-2 rounded-lg opacity-60">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="text-xs">{member.initials}</AvatarFallback>
                    </Avatar>
                    <div className="text-xs">
                      <div className="font-medium">{member.name}</div>
                      <div className="text-text-secondary">{member.role}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {members.length === 0 && careTeam.length === 0 && !isNewAppointment && (
              <div className="text-xs text-text-tertiary italic text-center py-4">
                No team members assigned yet. Click &quot;Add Member&quot; to invite team members.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };


  // Due Date Section
  const renderDueDate = () => (
    <div className="p-4">
      <div className="mb-3">
        <h4 className="text-sm font-medium text-text-primary">Due Date</h4>
      </div>
      <div className="bg-surface-elevated p-3 rounded-lg cursor-pointer hover:bg-surface-interactive transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-zenthea-teal-600" />
          <span className="text-sm font-medium">{date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-zenthea-teal-600" />
          <span className="text-sm">{time}</span>
          <span className="text-xs text-text-secondary">({duration} min)</span>
        </div>
        {location && (
          <div className="flex items-center gap-2 mt-2">
            <MapPin className="h-4 w-4 text-zenthea-teal-600" />
            <span className="text-sm">{location}</span>
          </div>
        )}
        {provider && (
          <div className="flex items-center gap-2 mt-2">
            <Stethoscope className="h-4 w-4 text-zenthea-teal-600" />
            <span className="text-sm">{provider}</span>
          </div>
        )}
      </div>
    </div>
  );

  // Notes Section
  const renderNotes = () => (
    <div className="p-4">
      <div className="mb-3">
        <h4 className="text-sm font-medium text-text-primary">Notes</h4>
      </div>
          <Textarea
            placeholder="Add clinical notes..."
            value={notes || ''}
            className="min-h-[80px] text-sm"
            readOnly
          />
    </div>
  );

  // Documents Section
  const renderDocuments = () => (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-text-primary">Documents</h4>
        <Button variant="ghost" size="sm">
          <Plus className="h-3 w-3 mr-1" />
          Upload
        </Button>
      </div>
      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center gap-3 bg-surface-elevated p-2 rounded-lg">
            <FileText className="h-4 w-4 text-zenthea-teal-600" />
            <div className="flex-1">
              <div className="text-sm font-medium">{doc.name}</div>
              <div className="text-xs text-text-secondary">{doc.size} • {doc.type}</div>
            </div>
            <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
              <X className="h-2 w-2" />
            </Button>
          </div>
        ))}
        {documents.length === 0 && (
          <div className="text-xs text-text-tertiary italic">No documents attached</div>
        )}
      </div>
    </div>
  );

  // Activity Feed - Read-only Audit Trail
  const renderActivity = () => {
    // Generate audit trail from appointment data
    const auditTrail = [
      {
        id: '1',
        action: 'Created',
        description: 'Appointment created',
        user: 'Dr. Smith',
        role: 'Provider',
        timestamp: '2024-01-15 09:30 AM',
        icon: 'Plus',
        type: 'create'
      },
      {
        id: '2', 
        action: 'Assigned',
        description: 'Assigned to Dr. Johnson',
        user: 'Dr. Smith',
        role: 'Provider',
        timestamp: '2024-01-15 10:15 AM',
        icon: 'User',
        type: 'assignment'
      },
      {
        id: '3',
        action: 'Status Changed',
        description: 'Status changed from Scheduled to Confirmed',
        user: 'Dr. Johnson',
        role: 'Provider', 
        timestamp: '2024-01-15 11:45 AM',
        icon: 'CheckCircle',
        type: 'status'
      },
      {
        id: '4',
        action: 'Priority Updated',
        description: 'Priority changed to High',
        user: 'Dr. Johnson',
        role: 'Provider',
        timestamp: '2024-01-15 12:30 PM',
        icon: 'AlertTriangle',
        type: 'priority'
      }
    ];

    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-text-primary">Activity Log</h4>
          <Button variant="ghost" size="sm">
            <Activity className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>
        
        {/* Audit Trail */}
        <div className="max-h-64 overflow-y-auto space-y-3">
          {auditTrail.map((entry) => (
            <div key={entry.id} className="flex gap-3 p-3 bg-surface-elevated rounded-lg border border-border-primary">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-interactive-primary flex items-center justify-center">
                  <Activity className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-text-primary">{entry.action}</span>
                  <span className="text-xs text-text-secondary">{entry.timestamp}</span>
                </div>
                <p className="text-sm text-text-primary mb-1">{entry.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">by</span>
                  <span className="text-xs font-medium text-text-primary">{entry.user}</span>
                  <span className="text-xs text-text-tertiary">({entry.role})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };


  // Main Content Renderer
  const renderContent = () => (
    <div className="space-y-0">
      {/* Tab Content */}
      {activeTab === 'info' && renderInfo()}
      {activeTab === 'members' && renderCareTeam()}
      {activeTab === 'dueDate' && renderDueDate()}
      {activeTab === 'attachments' && renderDocuments()}
      {activeTab === 'notes' && renderNotes()}
      {activeTab === 'activity' && renderActivity()}
    </div>
  );

  // Prepare appointment data for modals
  const getRescheduleAppointmentData = useCallback(() => {
    // Parse date and time to create scheduledAt timestamp
    let scheduledAt: number | undefined;
    try {
      const dateTimeStr = `${date} ${time}`;
      const dateTime = new Date(dateTimeStr);
      if (!isNaN(dateTime.getTime())) {
        scheduledAt = dateTime.getTime();
      }
    } catch (error) {
      // If parsing fails, scheduledAt will be undefined
    }

    return {
      id: appointmentData.id,
      providerId: providerId, // Use providerId from appointmentData
      locationId: locationId,
      date: date,
      time: time,
      scheduledAt: scheduledAt,
      duration: duration,
      provider: {
        name: provider || 'Unknown Provider',
        specialty: '', // Not available in appointmentData
      },
      type: type,
    };
  }, [appointmentData.id, date, time, duration, provider, providerId, locationId, type]);

  const getCancelAppointmentData = useCallback(() => {
    return {
      id: appointmentData.id,
      date: date,
      time: time,
      provider: provider ? {
        name: provider,
        specialty: undefined,
      } : undefined,
      providerName: provider,
      type: type,
      location: location,
    };
  }, [appointmentData.id, date, time, provider, type, location]);

  return (
    <>
      <BaseCardComponent 
        {...props} 
        activeTab={activeTab}
        onTabChange={onTabChange}
        handlers={handlers || {} as CardEventHandlers}
      >
        {renderContent()}
      </BaseCardComponent>
      
      {/* Reschedule Appointment Modal */}
      <RescheduleAppointmentModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        appointment={getRescheduleAppointmentData()}
      />
      
      {/* Cancel Appointment Modal */}
      <CancelAppointmentModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        appointment={getCancelAppointmentData()}
      />
    </>
  );
}

// Factory function for creating AppointmentCard instances
export function createAppointmentCard(
  id: string,
  appointmentData: AppointmentCardProps['appointmentData'],
  baseProps: Omit<BaseCardProps, 'id' | 'type' | 'content'> & {
    mode?: 'view' | 'edit' | 'create';
    prefilledDate?: Date;
    prefilledTime?: string;
    onSave?: (data: AppointmentFormData) => Promise<void>;
    onCancel?: () => void;
  },
  handlers: CardEventHandlers
): React.ReactElement {
  const { mode, prefilledDate, prefilledTime, onSave, onCancel, ...restProps } = baseProps;
  
  const props: AppointmentCardProps = {
    ...restProps,
    id,
    type: 'appointment',
    content: null, // Will be rendered by the card itself
    appointmentData,
    mode,
    prefilledDate,
    prefilledTime,
    onSave,
    onCancel,
  };
  
  return <AppointmentCard {...props} handlers={handlers} />;
}

// Export the form data type for use in other components
export type { AppointmentFormData };