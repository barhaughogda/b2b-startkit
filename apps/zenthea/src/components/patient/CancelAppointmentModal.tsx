'use client';

import React, { useState, useEffect } from 'react';
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
import { AlertTriangle, Calendar, User, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CANCEL_REASONS = [
  { value: 'schedule_conflict', label: 'Schedule conflict' },
  { value: 'feeling_unwell', label: 'Feeling unwell' },
  { value: 'transportation', label: 'Transportation issues' },
  { value: 'work_family', label: 'Work/family emergency' },
  { value: 'no_longer_needed', label: 'No longer need the appointment' },
  { value: 'financial', label: 'Financial reasons' },
  { value: 'other', label: 'Other (please specify)' },
];

interface CancelAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    date: string;
    time: string;
    provider?: {
      name: string;
      specialty?: string;
    };
    providerName?: string;
    type: string;
    location?: string;
  } | null;
}

// Trivial change to force rebuild
export function CancelAppointmentModal({ 
  isOpen, 
  onClose, 
  appointment 
}: CancelAppointmentModalProps) {
  const [reasonType, setReasonType] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReasonType('');
      setCustomReason('');
      setValidationError(null);
    }
  }, [isOpen]);

  const getFullReason = (): string => {
    if (reasonType === 'other') return customReason.trim();
    const selected = CANCEL_REASONS.find(r => r.value === reasonType);
    return selected?.label || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) return;

    if (!reasonType) {
      setValidationError('Please select a reason for cancellation');
      return;
    }

    if (reasonType === 'other' && !customReason.trim()) {
      setValidationError('Please provide a reason for cancellation');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);
    
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          notes: `Cancelled: ${getFullReason()}`,
        }),
      });

      if (!res.ok) throw new Error('Failed to cancel');
      
      toast.success('Appointment cancelled successfully');
      onClose();
    } catch (err) {
      toast.error('Failed to cancel appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-status-error">
            <AlertTriangle className="h-5 w-5" />
            Cancel Appointment
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-status-error/10 border border-status-error/30 rounded-lg space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span><strong>Provider:</strong> {appointment.providerName || appointment.provider?.name || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span><strong>Date:</strong> {appointment.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span><strong>Time:</strong> {appointment.time}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Reason for Cancellation *</Label>
            <Select value={reasonType} onValueChange={setReasonType}>
              <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {reasonType === 'other' && <Textarea value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder="Reason..." rows={3} />}
          </div>

          {validationError && <div className="p-3 text-sm text-status-error bg-status-error/10 border border-status-error/30 rounded-md">{validationError}</div>}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Keep Appointment</Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting || !reasonType}>{isSubmitting ? 'Cancelling...' : 'Cancel'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
