'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { CalendarIcon, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { AvailabilitySlotPicker } from '@/components/scheduling/AvailabilitySlotPicker';
import { TimeSlot } from '@/hooks/useProviderAvailability';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { toast } from 'sonner';

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
    userId?: string;
    clinicId?: string;
    date: string;
    time: string;
    duration?: number;
    provider: {
      name: string;
      specialty: string;
    };
    type: string;
  } | null;
}

// Trivial change to force rebuild
export function RescheduleAppointmentModal({ 
  isOpen, 
  onClose, 
  appointment 
}: RescheduleAppointmentModalProps) {
  const { data: session } = useZentheaSession();
  const tenantId = session?.user?.tenantId || 'demo-tenant';
  
  const [selectedDateTime, setSelectedDateTime] = useState<number>(0);
  const [reasonType, setReasonType] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      setSelectedDateTime(0);
      setReasonType('');
      setCustomReason('');
      setValidationError(null);
    }
  }, [isOpen, appointment?.id]);

  const handleSlotSelect = useCallback((slot: TimeSlot) => {
    setSelectedDateTime(slot.dateTime);
    setValidationError(null);
  }, []);

  const getFullReason = (): string => {
    if (reasonType === 'other') return customReason.trim();
    const selected = RESCHEDULE_REASONS.find(r => r.value === reasonType);
    return selected?.label || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) return;

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
      const newDateObj = new Date(selectedDateTime);
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: newDateObj.toISOString(),
          notes: `Rescheduled: ${getFullReason()}\n\nOriginal notes: ${appointment.provider.name}'s ${appointment.type}`,
        }),
      });

      if (!res.ok) throw new Error('Failed to reschedule');
      
      toast.success('Appointment rescheduled successfully');
      onClose();
    } catch (err) {
      toast.error('Failed to reschedule appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-zenthea-teal" />
            Reschedule Appointment
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 bg-surface-elevated rounded-lg space-y-3">
          <h4 className="font-medium text-text-primary flex items-center gap-2">
            <Clock className="h-4 w-4 text-text-secondary" />
            Current Appointment
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-text-secondary">Provider:</span> <span className="ml-2 text-text-primary">{appointment.provider.name}</span></div>
            <div><span className="text-text-secondary">Type:</span> <span className="ml-2 text-text-primary capitalize">{appointment.type}</span></div>
            <div><span className="text-text-secondary">Date:</span> <span className="ml-2 text-text-primary">{appointment.date}</span></div>
            <div><span className="text-text-secondary">Time:</span> <span className="ml-2 text-text-primary">{appointment.time}</span></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Reason for Rescheduling *</Label>
            <Select value={reasonType} onValueChange={setReasonType}>
              <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
              <SelectContent>
                {RESCHEDULE_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {reasonType === 'other' && <Textarea value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder="Reason..." rows={2} />}
          </div>

          <div className="space-y-3">
            <Label>Select New Date & Time *</Label>
            <AvailabilitySlotPicker
              providerId={appointment.providerId}
              userId={appointment.userId}
              clinicId={appointment.clinicId}
              tenantId={tenantId}
              slotDuration={appointment.duration || 30}
              selectedDateTime={selectedDateTime || undefined}
              onSlotSelect={handleSlotSelect}
              minDate={new Date()}
              maxDate={addDays(new Date(), 60)}
              showCalendar
            />
          </div>

          {validationError && <div className="p-3 text-sm text-status-error bg-status-error/10 border border-status-error/30 rounded-md">{validationError}</div>}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !selectedDateTime || !reasonType}>{isSubmitting ? 'Rescheduling...' : 'Confirm'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
