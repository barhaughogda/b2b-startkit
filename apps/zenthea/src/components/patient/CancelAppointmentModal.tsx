'use client';

import React, { useState, useEffect } from 'react';
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
import { AlertTriangle, Calendar, User, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Predefined reasons for cancellation
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
    // Support both formats: full provider object or just name
    provider?: {
      name: string;
      specialty?: string;
    };
    providerName?: string;
    type: string;
    location?: string;
  } | null;
}

export function CancelAppointmentModal({ 
  isOpen, 
  onClose, 
  appointment 
}: CancelAppointmentModalProps) {
  const { isLoading, error, cancelAppointment, clearError } = useAppointmentsStore();
  
  const [reasonType, setReasonType] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setReasonType('');
      setCustomReason('');
      setValidationError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (error) {
      // Clear error after 5 seconds
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Get the combined reason (either predefined or custom)
  const getFullReason = (): string => {
    if (reasonType === 'other') {
      return customReason.trim();
    }
    const selected = CANCEL_REASONS.find(r => r.value === reasonType);
    return selected?.label || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appointment) {
      return;
    }

    // Validate reason is provided
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
      await cancelAppointment(appointment.id, getFullReason());
      
      // Reset form and close modal on success
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
      setReasonType('');
      setCustomReason('');
      setValidationError(null);
      onClose();
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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

        {/* Appointment Info */}
        <div className="p-4 bg-status-error/10 border border-status-error/30 rounded-lg space-y-2">
          <h4 className="font-medium text-status-error">Appointment to Cancel</h4>
          <div className="text-sm text-text-primary space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-status-error" />
              <span><strong>Provider:</strong> {appointment.providerName || appointment.provider?.name || 'Unknown Provider'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-status-error" />
              <span><strong>Date:</strong> {appointment.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-status-error" />
              <span><strong>Time:</strong> {appointment.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <span><strong>Type:</strong> <span className="capitalize">{appointment.type}</span></span>
            </div>
            {appointment.location && (
              <div className="flex items-center gap-2">
                <span><strong>Location:</strong> {appointment.location}</span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cancellation Policy Notice */}
          <div className="p-3 bg-status-warning/10 border border-status-warning/30 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-status-warning mt-0.5" />
              <div className="text-sm text-status-warning">
                <strong>Cancellation Policy:</strong> Please provide at least 24 hours notice 
                when canceling appointments to avoid any cancellation fees.
              </div>
            </div>
          </div>

          {/* Reason for Cancellation - Required */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-text-secondary" />
              Reason for Cancellation
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
                {CANCEL_REASONS.map((reason) => (
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
                placeholder="Please let us know why you need to cancel this appointment..."
                rows={3}
                className={cn(
                  validationError && reasonType === 'other' && !customReason.trim() && "border-status-error"
                )}
              />
            )}
            
            <p className="text-xs text-text-tertiary">
              Providing a reason helps us improve our services and may help with rescheduling.
            </p>
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
              Keep Appointment
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting || isLoading || !reasonType || (reasonType === 'other' && !customReason.trim())}
            >
              {isSubmitting ? 'Canceling...' : 'Cancel Appointment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
