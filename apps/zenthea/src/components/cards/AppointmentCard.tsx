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
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { LocationSelector } from '@/components/provider/LocationSelector';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AppointmentBookingWizard, PatientAppointmentFormData } from '@/components/scheduling/AppointmentBookingWizard';
import { RescheduleAppointmentModal } from '@/components/patient/RescheduleAppointmentModal';
import { CancelAppointmentModal } from '@/components/patient/CancelAppointmentModal';
import { useCareTeam } from '@/hooks/useCareTeam';
import { useAppointment, useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { useOrganizationUsers } from '@/hooks/useOrganizationUsers';

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

// Trivial change to force rebuild
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
    id: appointmentId,
    patientId,
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

  // Extract id, title, priority from props to avoid ReferenceError
  const id = (props as any).id || appointmentId;
  const title = (props as any).title || `${type.charAt(0).toUpperCase() + type.slice(1)}: ${patientName}`;
  const priority = (props as any).priority || 'medium';

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

  // Get data using refactored hooks
  const { careTeam: patientCareTeam, primaryProvider: patientPrimaryProvider, isLoading: careTeamLoading } = useCareTeam(formData.patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formData.patientId) ? formData.patientId : undefined);
  const { appointment, updateAppointment, addMember, removeMember, updateMemberStatus, isLoading: appointmentLoading } = useAppointment(appointmentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appointmentId) ? appointmentId : '');
  const { createAppointment } = useAppointments();
  const { patients, isLoading: patientsLoading } = usePatients();
  const { users: tenantUsers, isLoading: usersLoading } = useOrganizationUsers();
  
  // Track if auto-select has been performed
  const hasAutoSelectedProvider = useRef(false);

  // Sync isEditing state with mode prop
  useEffect(() => {
    setIsEditing(mode === 'create' || mode === 'edit');
  }, [mode]);

  // Auto-select primary provider for patient wizard (patient users only)
  useEffect(() => {
    if (
      isPatient &&
      mode === 'create' &&
      !hasAutoSelectedProvider.current &&
      patientCareTeam &&
      patientCareTeam.length > 0
    ) {
      const primaryMember = patientCareTeam.find(member => member.isPrimaryProvider);
      if (primaryMember) {
        hasAutoSelectedProvider.current = true;
        setPatientWizardData(prev => ({
          ...prev,
          providerId: primaryMember.id,
          providerName: primaryMember.name,
        }));
      }
    }
  }, [isPatient, mode, patientCareTeam]);
  
  // Default to primary provider when creating a new appointment
  useEffect(() => {
    if (
      mode === 'create' && 
      !primaryProviderDefaulted &&
      patientPrimaryProvider
    ) {
      setFormData(prev => ({
        ...prev,
        calendarOwnerId: patientPrimaryProvider.userId,
      }));
      setPrimaryProviderDefaulted(true);
    }
  }, [mode, patientPrimaryProvider, primaryProviderDefaulted]);
  
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
  
  // Shared calendars (placeholder for future migration)
  const editableCalendars: any[] = [];

  // Update form field helper
  const updateField = (field: keyof AppointmentFormData, value: string | number) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
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

  // Handle patient wizard save
  const handlePatientWizardSave = async () => {
    if (!patientWizardData.providerId) {
      setSaveError('Please select a provider');
      return;
    }
    if (!patientWizardData.scheduledAt) {
      setSaveError('Please select a date and time');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const appointmentType = patientWizardData.type === 'telehealth' 
        ? 'consultation' 
        : patientWizardData.type === 'follow-up' 
        ? 'follow-up' 
        : patientWizardData.type === 'procedure'
        ? 'procedure'
        : 'consultation';

      await createAppointment({
        patientId: session?.user?.id, // Patient is the current user
        scheduledAt: new Date(patientWizardData.scheduledAt).toISOString(),
        duration: patientWizardData.duration,
        type: appointmentType,
        notes: patientWizardData.notes,
        locationId: patientWizardData.locationId,
        status: 'scheduled',
      });

      setIsEditing(false);
      toast.success('Appointment scheduled successfully!');
      handlers.onClose?.(props.id);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save appointment');
      toast.error('Failed to schedule appointment');
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
      const scheduledAt = new Date(`${formData.date}T${formData.time}`).toISOString();
      
      if (mode === 'create') {
        await createAppointment({
          patientId: formData.patientId,
          scheduledAt,
          duration: formData.duration,
          type: formData.type,
          notes: formData.notes,
          locationId: formData.locationId,
          status: 'scheduled',
        });
      } else {
        await updateAppointment({
          scheduledAt,
          duration: formData.duration,
          type: formData.type,
          status: formData.status,
          notes: formData.notes,
          locationId: formData.locationId,
        });
      }

      setIsEditing(false);
      if (onSave) await onSave(formData);
      
      if (handlers.onAppointmentDataChange) {
        handlers.onAppointmentDataChange(props.id, {
          ...appointmentData,
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          mode: 'view',
        });
      }
      
      if (mode === 'create') {
        toast.success('Appointment created');
        handlers.onClose?.(props.id);
      } else {
        toast.success('Appointment updated');
      }
    } catch (error) {
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
      if (handlers.onAppointmentDataChange) {
        handlers.onAppointmentDataChange(props.id, {
          ...appointmentData,
          mode: 'view',
        });
      }
    }
    if (onCancel) onCancel();
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

  const statusInfo = taskStatusConfig[props.status as keyof typeof taskStatusConfig] || taskStatusConfig.new;

  // Helper function to parse time string
  const parseTimeTo24Hour = useCallback((timeStr: string): string => {
    if (!timeStr) return '';
    const time24Regex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
    const match24 = timeStr.match(time24Regex);
    if (match24 && match24[1] && match24[2]) {
      return `${match24[1].padStart(2, '0')}:${match24[2]}`;
    }
    const time12Regex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
    const match12 = timeStr.match(time12Regex);
    if (match12 && match12[1] && match12[2] && match12[3]) {
      let hours = parseInt(match12[1], 10);
      const ampm = match12[3].toUpperCase();
      if (ampm === 'PM' && hours !== 12) hours += 12;
      else if (ampm === 'AM' && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${match12[2]}`;
    }
    return '';
  }, []);

  // Generate Google Calendar URL
  const generateGoogleCalendarUrl = useCallback(() => {
    if (!date || !time) return '';
    const time24Hour = parseTimeTo24Hour(time);
    if (!time24Hour) return '';
    const startDate = new Date(`${date}T${time24Hour}`);
    if (isNaN(startDate.getTime())) return '';
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    const formatGoogleDate = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, '');
      const title = encodeURIComponent(`${type} - ${patientName}`);
    const locStr = encodeURIComponent(location || '');
    const det = encodeURIComponent(notes || `Appointment at Zenthea Healthcare`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${det}&location=${locStr}`;
  }, [date, time, duration, type, patientName, location, notes, parseTimeTo24Hour]);

  const generateICalFile = useCallback(() => {
    if (!date || !time) return;
    const time24Hour = parseTimeTo24Hour(time);
    if (!time24Hour) return;
    const startDate = new Date(`${date}T${time24Hour}`);
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    const formatICalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const icsContent = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Zenthea Healthcare//Appointment//EN',
      'BEGIN:VEVENT', `UID:${appointmentData.id}@zenthea.com`, `DTSTAMP:${formatICalDate(new Date())}`,
      `DTSTART:${formatICalDate(startDate)}`, `DTEND:${formatICalDate(endDate)}`,
      `SUMMARY:${type} - ${patientName}`, `DESCRIPTION:${notes || 'Appointment at Zenthea Healthcare'}`,
      location ? `LOCATION:${location}` : '', 'END:VEVENT', 'END:VCALENDAR',
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

  const copyAppointmentDetails = useCallback(async () => {
    const details = [
      `📅 ${type} Appointment`, ``, `👤 Patient: ${patientName}`, `🗓️ Date: ${date}`, `⏰ Time: ${time}`,
      `⏱️ Duration: ${duration} minutes`, provider ? `👨‍⚕️ Provider: ${provider}` : '',
      location ? `📍 Location: ${location}` : '', notes ? `📝 Notes: ${notes}` : '', ``,
      `Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(details);
      toast.success('Appointment details copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  }, [type, patientName, date, time, duration, provider, location, notes, status]);

  const getDirectionsUrl = useCallback(() => {
    if (!location) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  }, [location]);

  // Info Tab View Mode
  const renderInfoView = () => (
    <div className="p-4">
      <div className="space-y-4">
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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{type}</Badge>
        </div>
        <div className="bg-surface-elevated p-3 rounded-lg">
          <h4 className="text-xs font-medium text-text-secondary mb-2">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => { const url = generateGoogleCalendarUrl(); if (url) window.open(url, '_blank'); }} className="h-8 text-xs gap-1.5">
              <CalendarPlus className="h-3.5 w-3.5" />Add to Google
            </Button>
            <Button size="sm" variant="outline" onClick={generateICalFile} className="h-8 text-xs gap-1.5">
              <CalendarPlus className="h-3.5 w-3.5" />Download .ics
            </Button>
            <Button size="sm" variant="outline" onClick={copyAppointmentDetails} className="h-8 text-xs gap-1.5">
              <Copy className="h-3.5 w-3.5" />Copy Details
            </Button>
            {location && (
              <Button size="sm" variant="outline" onClick={() => window.open(getDirectionsUrl(), '_blank')} className="h-8 text-xs gap-1.5">
                <Navigation className="h-3.5 w-3.5" />Directions
              </Button>
            )}
          </div>
        </div>
        {notes && (
          <div className="bg-surface-elevated p-3 rounded-md">
            <h4 className="text-xs font-medium text-text-secondary mb-1">Notes</h4>
            <p className="text-sm text-text-primary">{notes}</p>
          </div>
        )}
        {mode === 'view' && status !== 'completed' && status !== 'cancelled' && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={(e) => { e.stopPropagation(); setIsRescheduleModalOpen(true); }}>
              <CalendarClock className="h-3 w-3 mr-1" />Reschedule
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={(e) => { e.stopPropagation(); setIsCancelModalOpen(true); }}>
              <XCircle className="h-3 w-3 mr-1" />Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Info Tab Form Mode
  const renderInfoForm = () => {
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
    
    return (
      <div className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          {saveError && <div className="bg-status-error/10 border border-status-error/20 text-status-error p-3 rounded-md text-sm">{saveError}</div>}
        {mode === 'create' && (
          <div>
            <Label htmlFor="patient-select">Patient *</Label>
              <Select value={formData.patientId} onValueChange={(v) => { const p = patients?.find(p => p.id === v); updateField('patientId', v); if (p) updateField('patientName', `${p.firstName} ${p.lastName}`); setPatientSearchQuery(''); }} onOpenChange={(o) => { if (!o) setPatientSearchQuery(''); }}>
                <SelectTrigger id="patient-select"><SelectValue placeholder="Select a patient" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <div className="sticky top-0 z-10 bg-surface-elevated border-b border-border-primary px-2 py-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                      <Input type="text" placeholder="Search patients..." value={patientSearchQuery} onChange={(e) => setPatientSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} />
                  </div>
                </div>
                <div className="max-h-[240px] overflow-y-auto">
                    {filteredPatients.length === 0 ? <div className="px-2 py-4 text-sm text-text-secondary text-center">No patients found</div> : filteredPatients.map((p) => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}
                </div>
              </SelectContent>
            </Select>
          </div>
        )}
        {mode === 'edit' && patientName && (
            <div><Label>Patient</Label><div className="flex items-center gap-2 p-2 bg-surface-elevated rounded-md text-sm"><User className="h-4 w-4 text-text-secondary" /><span>{patientName}</span></div></div>
          )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" value={formData.date} onChange={(e) => updateField('date', e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="time">Time *</Label>
              <Input id="time" type="time" value={formData.time} onChange={(e) => updateField('time', e.target.value)} required />
                      </div>
                    </div>
        <div>
          <Label htmlFor="duration">Duration</Label>
            <Select value={formData.duration.toString()} onValueChange={(v) => updateField('duration', parseInt(v))}>
              <SelectTrigger id="duration"><SelectValue /></SelectTrigger>
              <SelectContent>{durationOptions.map(o => <SelectItem key={o.value} value={o.value.toString()}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {mode === 'edit' && (
          <div>
            <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="scheduled"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-status-info" />Scheduled</div></SelectItem>
                  <SelectItem value="confirmed"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-status-success" />Confirmed</div></SelectItem>
                  <SelectItem value="in-progress"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-status-warning" />In Progress</div></SelectItem>
                  <SelectItem value="completed"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-zenthea-teal" />Completed</div></SelectItem>
                  <SelectItem value="cancelled"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-status-error" />Cancelled</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label>Appointment Type</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
              {appointmentTypes.map(t => <Button key={t.value} type="button" variant={formData.type === t.value ? 'default' : 'outline'} className="justify-start" onClick={() => updateField('type', t.value)}><t.icon className="h-4 w-4 mr-2" />{t.label}</Button>)}
          </div>
        </div>
          <LocationSelector value={formData.locationId} onValueChange={(v) => updateField('locationId', v)} tenantId={tenantId} label="Location" placeholder="Select a location" />
          <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Notes..." rows={3} /></div>
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-primary">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}{mode === 'create' ? 'Create' : 'Save'}</Button>
        </div>
      </form>
    </div>
    );
  };

  const renderInfo = () => isEditing ? renderInfoForm() : renderInfoView();

  const [isAddingMember, setIsAddingMember] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string | null>(null);

  // Members Tab
  const renderCareTeam = () => {
    const isNew = mode === 'create' || appointmentData.id === 'new';
    const members = appointment?.members || [];
    const existingMemberIds = new Set(members.map((m: any) => m.userId));
    const availableToAdd = (tenantUsers || []).filter((u: any) => !existingMemberIds.has(u.id) && u.id !== currentUserId);
    
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-text-primary">Appointment Members</h4>
          {!isNew && <Button variant="ghost" size="sm" onClick={() => setIsAddingMember(!isAddingMember)}><Plus className="h-3 w-3 mr-1" />Add</Button>}
        </div>
        {isAddingMember && (
          <div className="mb-4 p-3 bg-surface-elevated border border-border-primary rounded-lg">
            <Select value={selectedUserToAdd || ''} onValueChange={setSelectedUserToAdd}>
              <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
              <SelectContent>{availableToAdd.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}</SelectContent>
            </Select>
            {selectedUserToAdd && <div className="flex gap-2 mt-2"><Button size="sm" variant="outline" onClick={() => { if (addMember) addMember(selectedUserToAdd, 'attendee'); setIsAddingMember(false); }} className="flex-1">Add</Button></div>}
              </div>
            )}
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-2">
            {members.map((m: any) => (
              <div key={m.userId} className="flex items-center justify-between gap-2 bg-surface-elevated p-2 rounded-lg">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Avatar className="h-8 w-8"><AvatarImage src={m.avatarUrl} /><AvatarFallback>{m.name?.[0]}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1"><div className="text-sm font-medium truncate">{m.name || m.email}</div><Badge variant="outline" className="text-[10px]">{m.role}</Badge></div>
                    </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeMember && removeMember(m.userId)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const renderContent = () => (
    <div className="space-y-0">
      {activeTab === 'info' && renderInfo()}
      {activeTab === 'members' && renderCareTeam()}
      {activeTab === 'dueDate' && renderDueDate()}
      {activeTab === 'attachments' && renderDocuments()}
      {activeTab === 'notes' && renderNotes()}
      {activeTab === 'activity' && renderActivity()}
    </div>
  );

  const renderDueDate = () => (
    <div className="p-4">
      <div className="bg-surface-elevated p-3 rounded-lg">
        <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>{date}</span></div>
        <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span>{time}</span></div>
      </div>
    </div>
  );

  const renderNotes = () => (
    <div className="p-4"><Textarea value={notes || ''} readOnly className="min-h-[80px]" /></div>
  );

  const renderDocuments = () => (
    <div className="p-4"><div className="text-xs text-text-tertiary italic">No documents attached</div></div>
  );

  const renderActivity = () => (
    <div className="p-4"><div className="text-xs text-text-tertiary italic">Audit trail coming soon...</div></div>
  );

  const getRescheduleAppointmentData = useCallback(() => ({
    id: appointmentData.id, providerId, locationId, date, time, duration, provider: { name: provider || 'Unknown', specialty: '' }, type
  }), [appointmentData.id, providerId, locationId, date, time, duration, provider, type]);

  const getCancelAppointmentData = useCallback(() => ({
    id: appointmentData.id, date, time, providerName: provider, type, location
  }), [appointmentData.id, date, time, provider, type, location]);

  return (
    <>
      <BaseCardComponent {...props} id={id} type={type} title={title} priority={priority} status={status} patientId={patientId} patientName={patientName} activeTab={activeTab} onTabChange={onTabChange} handlers={handlers}>
        {renderContent()}
      </BaseCardComponent>
      <RescheduleAppointmentModal isOpen={isRescheduleModalOpen} onClose={() => setIsRescheduleModalOpen(false)} appointment={getRescheduleAppointmentData()} />
      <CancelAppointmentModal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} appointment={getCancelAppointmentData()} />
    </>
  );
}

export function createAppointmentCard(id: string, appointmentData: any, baseProps: any, handlers: any) {
  return <AppointmentCard {...baseProps} id={id} type="appointment" appointmentData={appointmentData} handlers={handlers} />;
}
