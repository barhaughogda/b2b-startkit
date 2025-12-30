'use client';

/**
 * @deprecated DEPRECATED - DO NOT USE
 * 
 * This modal is deprecated. All appointment booking functionality should use
 * the unified card system instead:
 * 
 * For All Portals (Patient and Provider/Company):
 * - Use CardSystemProvider and openCard('appointment', {...props, mode: 'create' }, baseProps)
 * - The AppointmentCard provides the booking wizard in its Info tab
 * 
 * This ensures consistent UI/UX across the application and centralizes all
 * appointment management (create, view, edit, reschedule, cancel) in the
 * Info tab of the appointment card.
 * 
 * @see CardSystemProvider
 * @see AppointmentCard
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAppointmentsStore } from '@/stores/appointmentsStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, User, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { LocationSelector } from '@/components/provider/LocationSelector';
import { Id } from '@/convex/_generated/dataModel';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { canUseConvexQuery } from '@/lib/convexIdValidation';

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProviderId?: string;
}

/**
 * @deprecated Use PatientCardSystemProvider.openAppointmentCard() or CardSystemProvider.openCard() instead
 */
export function BookAppointmentModal({ isOpen, onClose, initialProviderId }: BookAppointmentModalProps) {
  // Log deprecation warning in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[DEPRECATED] BookAppointmentModal is deprecated. ' +
      'Use PatientCardSystemProvider.openAppointmentCard({ mode: "create" }) ' +
      'or CardSystemProvider.openCard("appointment", ...) instead.'
    );
  }
  const { providers, isLoading, error, fetchProviders, bookAppointment, clearError } = useAppointmentsStore();
  const { data: session } = useZentheaSession();
  
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(initialProviderId || '');
  const [appointmentType, setAppointmentType] = useState('');
  const [reason, setReason] = useState('');
  const [locationId, setLocationId] = useState(''); // Changed from location string to locationId
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const tenantId = session?.user?.tenantId || 'demo-tenant';
  
  // Check if we can use Convex queries
  const canQuery = canUseConvexQuery(session?.user?.id, tenantId);
  
  // Fetch real providers from Convex
  const convexProviders = useQuery(
    (api as any).providers?.getProvidersByTenant,
    canQuery && tenantId
      ? {
          tenantId,
          limit: 100,
        }
      : 'skip'
  ) as Array<{ _id: Id<'providers'>; firstName: string; lastName: string; specialty?: string }> | undefined;
  
  // Use Convex providers if available, otherwise fall back to store providers
  const availableProviders = useMemo(() => {
    if (convexProviders && convexProviders.length > 0) {
      return convexProviders.map((provider) => ({
        id: provider._id,
        name: `${provider.firstName} ${provider.lastName}`,
        specialty: provider.specialty || 'General Medicine',
      }));
    }
    return providers;
  }, [convexProviders, providers]);
  
  // Validate that selectedProvider is a valid Convex ID format
  const isValidProviderId = useMemo(() => {
    if (!selectedProvider) return false;
    // Check if it's a valid Convex ID format (starts with 'j' or 'k' followed by alphanumeric)
    return /^[jk][a-z0-9]{15,}$/.test(selectedProvider);
  }, [selectedProvider]);
  
  // Convert to Convex ID type if valid, otherwise undefined
  const validProviderId = useMemo(() => {
    return isValidProviderId ? (selectedProvider as Id<'providers'>) : undefined;
  }, [selectedProvider, isValidProviderId]);

  // Available time slots (in a real app, this would come from provider availability)
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  const appointmentTypes = [
    'consultation',
    'follow-up',
    'procedure',
    'telehealth'
  ];

  // Fetch providers from store if Convex query is not available
  useEffect(() => {
    if (isOpen && !canQuery && providers.length === 0) {
      fetchProviders();
    }
  }, [isOpen, canQuery, providers.length, fetchProviders]);

  // Update selected provider when initialProviderId changes
  useEffect(() => {
    if (initialProviderId && isOpen) {
      setSelectedProvider(initialProviderId);
    }
  }, [initialProviderId, isOpen]);

  useEffect(() => {
    if (error) {
      // Clear error after 5 seconds
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime || !selectedProvider || !appointmentType) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await bookAppointment({
        providerId: selectedProvider,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        type: appointmentType,
        reason: reason || undefined,
        preferredLocation: locationId || undefined, // Using locationId as preferredLocation
      });
      
      // Reset form and close modal on success
      setSelectedDate(undefined);
      setSelectedTime('');
      setSelectedProvider(initialProviderId || '');
      setAppointmentType('');
      setReason('');
      setLocationId('');
      onClose();
    } catch (error) {
      // Error is handled by the store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      clearError();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto z-50"
        role="dialog"
        aria-labelledby="booking-modal-title"
        aria-describedby="booking-modal-description"
      >
          <DialogHeader>
            <DialogTitle 
              id="booking-modal-title"
              className="flex items-center gap-2"
            >
              <CalendarIcon className="h-5 w-5" aria-hidden="true" />
              Schedule New Appointment
            </DialogTitle>
            <DialogDescription id="booking-modal-description">
              Choose your preferred provider, date, and time for your appointment.
            </DialogDescription>
          </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider" className="flex items-center gap-2">
              <User className="h-4 w-4" aria-hidden="true" />
              Healthcare Provider
            </Label>
            <Select 
              value={selectedProvider} 
              onValueChange={setSelectedProvider} 
              required
              aria-required="true"
            >
              <SelectTrigger 
                id="provider"
                aria-label="Select healthcare provider"
              >
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {availableProviders.length === 0 ? (
                  <SelectItem value="no-providers" disabled>
                    No providers available
                  </SelectItem>
                ) : (
                  availableProviders.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name} - {provider.specialty}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" aria-hidden="true" />
              Appointment Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal"
                  )}
                  aria-label="Select appointment date"
                  aria-describedby="date-help"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[60]" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Appointment Time
            </Label>
            <Select 
              value={selectedTime} 
              onValueChange={setSelectedTime} 
              required
              aria-required="true"
            >
              <SelectTrigger aria-label="Select appointment time">
                <SelectValue placeholder="Select a time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Appointment Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Appointment Type</Label>
            <Select 
              value={appointmentType} 
              onValueChange={setAppointmentType} 
              required
              aria-required="true"
            >
              <SelectTrigger 
                id="type"
                aria-label="Select appointment type"
              >
                <SelectValue placeholder="Select appointment type" />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <LocationSelector
            value={locationId}
            onValueChange={setLocationId}
            providerId={validProviderId} // Only pass valid Convex ID, or undefined to show all locations
            tenantId={tenantId}
            label="Preferred Location"
            placeholder="Select a location"
            showTelehealth={true} // Allow telehealth locations in patient booking
          />

          {/* Reason/Notes */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Visit (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please describe the reason for your appointment..."
              rows={3}
              aria-label="Reason for visit (optional)"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div 
              className="p-3 text-sm text-status-error bg-status-error-bg border border-status-error border-opacity-30 rounded-md"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
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
              variant="default"
              disabled={isSubmitting || isLoading || !selectedDate || !selectedTime || !selectedProvider || !appointmentType}
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Appointment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
