'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAppointmentsStore } from '@/stores/appointmentsStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Clock, AlertCircle, CheckCircle, User, Calendar } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { AvailabilitySlotPicker } from '@/components/scheduling/AvailabilitySlotPicker';
import { TimeSlot } from '@/hooks/useProviderAvailability';
import { Id } from '@/convex/_generated/dataModel';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { canUseConvexQuery } from '@/lib/convexIdValidation';

// Predefined reasons for rescheduling
const RESCHEDULE_REASONS = [
  { value: 'schedule_conflict', label: 'Schedule conflict' },
  { value: 'feeling_unwell', label: 'Feeling unwell' },
  { value: 'transportation', label: 'Transportation issues' },
  { value: 'work_family', label: 'Work/family emergency' },
  { value: 'different_provider', label: 'Need to see a different provider' },
  { value: 'other', label: 'Other (please specify)' },
];

interface RescheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    providerId?: string;
    /** User ID of the provider (for clinic-based availability) */
    userId?: string;
    /** @deprecated Use clinicId instead */
    locationId?: string;
    /** Clinic ID for clinic-based scheduling */
    clinicId?: string;
    clinicTimezone?: string;
    date: string;
    time: string;
    scheduledAt?: number;
    duration?: number;
    provider: {
      name: string;
      specialty: string;
    };
    type: string;
  } | null;
}

export function RescheduleAppointmentModal({ 
  isOpen, 
  onClose, 
  appointment 
}: RescheduleAppointmentModalProps) {
  const { data: session } = useZentheaSession();
  const tenantId = session?.user?.tenantId || 'demo-tenant';
  const { isLoading, error, rescheduleAppointment, clearError } = useAppointmentsStore();
  
  const [selectedDateTime, setSelectedDateTime] = useState<number>(0);
  const [reasonType, setReasonType] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Patient's saved time preferences from settings
  const [savedTimezone, setSavedTimezone] = useState<string | null>(null);
  const [savedTimeFormat, setSavedTimeFormat] = useState<'12h' | '24h'>('12h');
  
  // Load patient's saved time preferences from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTimezone = localStorage.getItem('zenthea-timezone');
      if (storedTimezone) {
        setSavedTimezone(storedTimezone);
      }
      
      const storedTimeFormat = localStorage.getItem('zenthea-time-format');
      if (storedTimeFormat === '12h' || storedTimeFormat === '24h') {
        setSavedTimeFormat(storedTimeFormat);
      }
    }
  }, []);

  // Use patient's saved timezone if available, otherwise detect from browser
  const displayTimezone = useMemo(() => {
    // Priority 1: Patient's saved timezone preference
    if (savedTimezone) {
      return savedTimezone;
    }
    
    // Priority 2: Browser timezone detection
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      // Fallback to UTC if timezone detection fails
      return 'UTC';
    }
  }, [savedTimezone]);

  // Check if we can use Convex queries
  const canQuery = canUseConvexQuery(session?.user?.id, tenantId);

  // Fetch full appointment if providerId is missing (to derive it from userId)
  const fullAppointment = useQuery(
    api.appointments.getAppointment,
    canQuery && appointment?.id && !appointment.providerId && isOpen
      ? { id: appointment.id as Id<'appointments'> }
      : 'skip'
  );

  // Derive providerId from appointment's userId if providerId is missing
  const providerProfile = useQuery(
    api.providerProfiles.getProviderProfileByUserId,
    canQuery && fullAppointment?.userId && !appointment?.providerId && tenantId
      ? {
          userId: fullAppointment.userId as Id<'users'>,
          tenantId,
        }
      : 'skip'
  );

  // Use providerId from appointment, or derive it from provider profile
  const effectiveProviderId = useMemo(() => {
    if (appointment?.providerId) {
      return appointment.providerId as Id<'providers'>;
    }
    if (providerProfile?.providerId) {
      return providerProfile.providerId as Id<'providers'>;
    }
    return undefined;
  }, [appointment?.providerId, providerProfile?.providerId]);

  // Reset form when modal opens/closes or appointment changes
  useEffect(() => {
    if (isOpen) {
      setSelectedDateTime(0);
      setReasonType('');
      setCustomReason('');
      setValidationError(null);
    }
  }, [isOpen, appointment?.id]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Handle slot selection from AvailabilitySlotPicker
  const handleSlotSelect = useCallback((slot: TimeSlot) => {
    setSelectedDateTime(slot.dateTime);
    setValidationError(null);
  }, []);

  // Get the combined reason (either predefined or custom)
  const getFullReason = (): string => {
    if (reasonType === 'other') {
      return customReason.trim();
    }
    const selected = RESCHEDULE_REASONS.find(r => r.value === reasonType);
    return selected?.label || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appointment) return;

    // Validate reason is provided
    if (!reasonType) {
      setValidationError('Please select a reason for rescheduling');
      return;
    }

    if (reasonType === 'other' && !customReason.trim()) {
      setValidationError('Please provide a reason for rescheduling');
      return;
    }

    if (!selectedDateTime) {
      setValidationError('Please select a new date and time');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);
    
    try {
      const newDate = new Date(selectedDateTime);
      await rescheduleAppointment(
        appointment.id,
        format(newDate, 'yyyy-MM-dd'),
        format(newDate, 'HH:mm'),
        getFullReason()
      );
      
      // Reset form and close modal on success
      setSelectedDateTime(0);
      setReasonType('');
      setCustomReason('');
      onClose();
    } catch (err) {
      // Error is handled by the store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      clearError();
      setSelectedDateTime(0);
      setReasonType('');
      setCustomReason('');
      setValidationError(null);
      onClose();
    }
  };

  if (!appointment) return null;

  const appointmentDuration = appointment.duration || 30;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-zenthea-teal" />
            Reschedule Appointment
          </DialogTitle>
          <DialogDescription>
            Select a new date and time for your appointment with {appointment.provider.name}.
          </DialogDescription>
        </DialogHeader>

        {/* Current Appointment Info */}
        <div className="p-4 bg-surface-elevated rounded-lg space-y-3">
          <h4 className="font-medium text-text-primary flex items-center gap-2">
            <Clock className="h-4 w-4 text-text-secondary" />
            Current Appointment
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-text-secondary">Provider:</span>
              <span className="ml-2 text-text-primary">{appointment.provider.name}</span>
            </div>
            <div>
              <span className="text-text-secondary">Type:</span>
              <span className="ml-2 text-text-primary capitalize">{appointment.type}</span>
            </div>
            <div>
              <span className="text-text-secondary">Date:</span>
              <span className="ml-2 text-text-primary">{appointment.date}</span>
            </div>
            <div>
              <span className="text-text-secondary">Time:</span>
              <span className="ml-2 text-text-primary">{appointment.time}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Reason for Rescheduling - Required */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-zenthea-teal" />
              Reason for Rescheduling
              <span className="text-status-error">*</span>
            </Label>
            <Select value={reasonType} onValueChange={(value) => {
              setReasonType(value);
              setValidationError(null);
            }}>
              <SelectTrigger className={cn(
                validationError && !reasonType && "border-status-error"
              )}>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {RESCHEDULE_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Custom reason text area - only show when "Other" is selected */}
            {reasonType === 'other' && (
              <Textarea
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  setValidationError(null);
                }}
                placeholder="Please describe why you need to reschedule..."
                rows={2}
                className={cn(
                  validationError && reasonType === 'other' && !customReason.trim() && "border-status-error"
                )}
              />
            )}
          </div>

          {/* New Date & Time Selection using AvailabilitySlotPicker */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-zenthea-teal" />
              Select New Date & Time
              <span className="text-status-error">*</span>
            </Label>
            <p className="text-xs text-text-tertiary">
              Times shown in {displayTimezone.replace(/_/g, ' ')}
            </p>
            
            {/* Use clinic-based availability if we have userId and clinicId */}
            {appointment.userId && appointment.clinicId ? (
              <AvailabilitySlotPicker
                userId={appointment.userId as Id<'users'>}
                clinicId={appointment.clinicId as Id<'clinics'>}
                tenantId={tenantId}
                slotDuration={appointmentDuration}
                selectedDateTime={selectedDateTime || undefined}
                onSlotSelect={handleSlotSelect}
                minDate={new Date()}
                maxDate={addDays(new Date(), 60)}
                showCalendar
                displayTimezone={displayTimezone}
                timeFormat={savedTimeFormat}
              />
            ) : effectiveProviderId ? (
              /* Fallback to provider-based availability for backward compatibility */
              <AvailabilitySlotPicker
                providerId={effectiveProviderId}
                locationId={appointment.locationId ? (appointment.locationId as Id<'locations'>) : undefined}
                tenantId={tenantId}
                slotDuration={appointmentDuration}
                selectedDateTime={selectedDateTime || undefined}
                onSlotSelect={handleSlotSelect}
                minDate={new Date()}
                maxDate={addDays(new Date(), 60)}
                showCalendar
                displayTimezone={displayTimezone}
                timeFormat={savedTimeFormat}
              />
            ) : (
              <div className="p-4 bg-status-warning/10 border border-status-warning/30 rounded-lg text-sm text-status-warning">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                {canQuery && fullAppointment && !providerProfile ? (
                  <>Unable to find provider information for this appointment. Please contact the clinic directly to reschedule.</>
                ) : (
                  <>Provider information is missing from this appointment. Please contact the clinic directly to reschedule.</>
                )}
              </div>
            )}

            {/* Selected Time Display */}
            {selectedDateTime > 0 && (
              <div className="bg-zenthea-teal/10 border border-zenthea-teal/30 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-zenthea-teal">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">New Time Selected</span>
                </div>
                <p className="text-text-primary mt-1">
                  {new Intl.DateTimeFormat('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: displayTimezone,
                  }).format(new Date(selectedDateTime))} at{' '}
                  <span className="font-semibold text-zenthea-teal">
                    {new Intl.DateTimeFormat('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: savedTimeFormat === '12h',
                      timeZone: displayTimezone,
                    }).format(new Date(selectedDateTime))}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Validation Error Display */}
          {validationError && (
            <div className="p-3 text-sm text-status-error bg-status-error/10 border border-status-error/30 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {validationError}
            </div>
          )}

          {/* Store Error Display */}
          {error && (
            <div className="p-3 text-sm text-status-error bg-status-error/10 border border-status-error/30 rounded-md">
              {error}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-border-primary">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading || !selectedDateTime || !reasonType || (reasonType === 'other' && !customReason.trim())}
              className="bg-zenthea-teal hover:bg-zenthea-teal/90"
            >
              {isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
