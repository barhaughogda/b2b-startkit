'use client';

/**
 * PublicBookingWizard Component
 * 
 * A booking wizard for unauthenticated users in "Full Booking" mode.
 * Allows patients to browse services, providers, and availability WITHOUT login.
 * At the confirmation step, prompts for login/register to complete the booking.
 * 
 * Key differences from AppointmentBookingWizard:
 * - Does not require authentication to browse
 * - Shows all public-bookable providers (not just care team)
 * - Handles "not accepting new patients" blocking for unauthenticated users
 * - At confirm step, redirects to login/register with state preservation
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  FileText,
  User,
  Check,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Loader2,
  AlertCircle,
  Briefcase,
  LogIn,
  UserPlus,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays } from 'date-fns';
import { Id } from '@/convex/_generated/dataModel';
import { AvailabilitySlotPicker } from '@/components/scheduling/AvailabilitySlotPicker';
import { ServiceSelector, type ServiceData } from '@/components/scheduling/ServiceSelector';
import { TimeSlot } from '@/hooks/useProviderAvailability';
import { useSlotLock } from '@/hooks/useSlotLock';
import Link from 'next/link';
import { toast } from 'sonner';

// Helper to format timezone with UTC offset (e.g., "America/New York (UTC-5)")
function formatTimezoneWithOffset(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    const offset = offsetPart?.value || '';
    
    // Format timezone name (replace underscores with spaces)
    const readableName = timezone.replace(/_/g, ' ');
    
    return `${readableName} (${offset})`;
  } catch {
    // Fallback if timezone is invalid
    return timezone.replace(/_/g, ' ');
  }
}

/**
 * Format a timestamp in a specific timezone using Intl.DateTimeFormat.
 * This ensures the displayed time matches the chosen timezone.
 */
function formatInTimezone(
  timestamp: number,
  timezone: string,
  options: Intl.DateTimeFormatOptions
): string {
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: timezone }).format(
      new Date(timestamp)
    );
  } catch {
    // Fallback to browser timezone if invalid timezone
    return new Intl.DateTimeFormat('en-US', options).format(new Date(timestamp));
  }
}

// Wizard step types
type WizardStep = 1 | 2 | 3 | 4;
const WIZARD_STEPS = [
  { step: 1 as WizardStep, label: 'Service', icon: Briefcase },
  { step: 2 as WizardStep, label: 'Provider', icon: User },
  { step: 3 as WizardStep, label: 'Date & Time', icon: Calendar },
  { step: 4 as WizardStep, label: 'Confirm', icon: Check },
];

// Public booking form data (stored in URL/sessionStorage for state preservation)
export interface PublicBookingFormData {
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  providerId: string; // publicProviderProfile _id
  providerName: string;
  providerUserId?: string; // For availability lookup
  providerTableId?: string; // providers table ID for appointment creation
  scheduledAt: number; // UTC timestamp - all display formatting is done at render time using invitee timezone
  scheduledTimeDisplay?: string; // Legacy: formatted time from slot selection (now derived at render time)
  scheduledDateDisplay?: string; // Legacy: formatted date from slot selection (now derived at render time)
  notes?: string;
}

// Provider from getBookingProviders query
interface BookingProvider {
  _id: string;
  displayName: string;
  title: string;
  bio: string;
  photo?: string;
  specialties: string[];
  languages?: string[];
  acceptingNewPatients: boolean;
  bookingEnabled?: boolean;
  clinicIds: string[];
  userId: string | null;
  providerProfileId: string;
  providerId: string | null; // providers table ID for appointment creation
}

interface PublicBookingWizardProps {
  tenantId: string;
  slug: string;
  formData: PublicBookingFormData;
  onFormDataChange: (data: PublicBookingFormData) => void;
  onCancel: () => void;
  primaryColor?: string;
  tenantName?: string;
  isAuthenticated?: boolean;
  // If authenticated, these handlers allow completing the booking
  onConfirmBooking?: () => Promise<void>;
  isSaving?: boolean;
  saveError?: string | null;
}

export function PublicBookingWizard({
  tenantId,
  slug,
  formData,
  onFormDataChange,
  onCancel,
  primaryColor = 'var(--tenant-primary, var(--zenthea-teal))',
  tenantName = 'the clinic',
  isAuthenticated = false,
  onConfirmBooking,
  isSaving = false,
  saveError = null,
}: PublicBookingWizardProps) {
  // Determine initial step based on restored booking state
  // If returning from auth with complete booking data, start at confirmation step
  const getInitialStep = (): WizardStep => {
    const hasService = !!formData.serviceId;
    const hasProvider = !!formData.providerId;
    const hasTime = !!formData.scheduledAt && formData.scheduledAt > 0;
    
    // If all required fields are filled, start at confirmation
    if (hasService && hasProvider && hasTime) {
      return 4;
    }
    // If service and provider are selected, start at time selection
    if (hasService && hasProvider) {
      return 3;
    }
    // If service is selected, start at provider selection
    if (hasService) {
      return 2;
    }
    // Default to step 1
    return 1;
  };

  const [currentStep, setCurrentStep] = useState<WizardStep>(getInitialStep);
  const [clinicTimezone, setClinicTimezone] = useState<string>('');
  
  // Patient's saved time preferences from settings
  const [savedTimezone, setSavedTimezone] = useState<string | null>(null);
  const [savedTimeFormat, setSavedTimeFormat] = useState<'12h' | '24h'>('12h');
  
  // User-initiated timezone override (allows changing display timezone on booking page)
  const [timezoneOverride, setTimezoneOverride] = useState<string | null>(null);
  
  // Slot locking to prevent double-booking during the booking process
  const { 
    acquireLock, 
    releaseLock, 
    isLocked, 
    isLocking, 
    lockError,
    sessionId 
  } = useSlotLock({
    tenantId,
    onLockExpired: () => {
      // If lock expires while user is still booking, notify them
      toast.warning('Your time slot reservation has expired. Please select a time again.');
      onFormDataChange({ ...formData, scheduledAt: 0 });
    },
  });
  
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

  // Use patient's saved timezone if available, otherwise detect from browser (Calendly-style UX)
  // This respects patient's explicit timezone preference from their profile settings
  // User can also override this on the booking page via dropdown
  const inviteeTimezone = useMemo(() => {
    // Priority 1: User-initiated override on this page
    if (timezoneOverride) {
      return timezoneOverride;
    }
    
    // Priority 2: Patient's saved timezone preference
    if (savedTimezone) {
      return savedTimezone;
    }
    
    // Priority 3: Browser timezone detection
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      // Fallback to UTC if timezone detection fails
      return 'UTC';
    }
  }, [timezoneOverride, savedTimezone]);

  // Fetch booking-enabled providers
  const bookingProviders = useQuery(
    api.publicLanding.getBookingProviders,
    { tenantId }
  );

  // Selected provider details
  const selectedProvider = useMemo(() => {
    if (!formData.providerId || !bookingProviders) return null;
    return bookingProviders.find(p => p._id === formData.providerId) || null;
  }, [formData.providerId, bookingProviders]);

  // Sync providerName if providerId exists but providerName is missing
  useEffect(() => {
    if (formData.providerId && !formData.providerName && selectedProvider?.displayName) {
      onFormDataChange({
        ...formData,
        providerName: selectedProvider.displayName,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.providerId, formData.providerName, selectedProvider?.displayName]);

  // Update form field
  const updateField = useCallback(
    (field: keyof PublicBookingFormData, value: string | number) => {
      onFormDataChange({ ...formData, [field]: value });
    },
    [formData, onFormDataChange]
  );

  // Handle service selection
  const handleServiceSelect = useCallback(
    (service: ServiceData) => {
      onFormDataChange({
        ...formData,
        serviceId: service.id,
        serviceName: service.name,
        serviceDuration: service.duration,
      });
    },
    [onFormDataChange, formData]
  );

  // Handle provider selection
  const handleProviderSelect = useCallback(
    (provider: BookingProvider) => {
      // Check if provider is accepting new patients
      if (!provider.acceptingNewPatients && !isAuthenticated) {
        // Don't select - blocked
        return;
      }

      onFormDataChange({
        ...formData,
        providerId: provider._id,
        providerName: provider.displayName,
        providerUserId: provider.userId || undefined,
        providerTableId: provider.providerId || undefined, // Store providers table ID for appointment creation
        scheduledAt: 0, // Reset time when provider changes
      });
    },
    [onFormDataChange, formData, isAuthenticated]
  );

  // Handle time slot selection
  const handleSlotSelect = useCallback(
    async (slot: TimeSlot) => {
      // Try to acquire a lock on the slot to prevent double-booking
      if (selectedProvider?.userId) {
        const slotDuration = formData.serviceDuration || 30;
        const slotEnd = slot.dateTime + (slotDuration * 60 * 1000);
        
        const lockAcquired = await acquireLock({
          userId: selectedProvider.userId as Id<'users'>,
          clinicId: selectedProvider.clinicIds?.[0] as Id<'clinics'> | undefined,
          slotStart: slot.dateTime,
          slotEnd: slotEnd,
        });
        
        if (!lockAcquired) {
          toast.error('This time slot is currently being held by another user. Please select a different time.');
          return;
        }
      }
      
      // Store timestamp and formatted strings (already in clinic timezone)
      onFormDataChange({
        ...formData,
        scheduledAt: slot.dateTime,
        scheduledTimeDisplay: slot.timeString, // Pre-formatted in clinic timezone (e.g., "9:00 AM")
        scheduledDateDisplay: slot.fullDateString, // Pre-formatted in clinic timezone (e.g., "Monday, December 29, 2025")
      });
    },
    [onFormDataChange, formData, selectedProvider, acquireLock]
  );

  // Wizard navigation handlers
  const goToNextStep = useCallback(() => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
    }
  }, [currentStep]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  }, [currentStep]);

  // Handle cancel with lock release
  const handleCancel = useCallback(async () => {
    // Release any held slot lock before cancelling
    await releaseLock();
    onCancel();
  }, [releaseLock, onCancel]);

  // Check if current step is complete
  const isStepComplete = useCallback(
    (step: WizardStep): boolean => {
      switch (step) {
        case 1:
          return !!formData.serviceId;
        case 2:
          return !!formData.providerId;
        case 3:
          return !!formData.scheduledAt;
        case 4:
          return true;
        default:
          return false;
      }
    },
    [formData.serviceId, formData.providerId, formData.scheduledAt]
  );

  // Check if can proceed to next step
  const canProceed = useCallback((): boolean => {
    return isStepComplete(currentStep);
  }, [currentStep, isStepComplete]);

  // Build the redirect URL with state preservation
  const buildAuthRedirectUrl = useCallback((authPath: 'login' | 'register') => {
    const bookingState = {
      serviceId: formData.serviceId,
      serviceName: formData.serviceName,
      serviceDuration: formData.serviceDuration,
      providerId: formData.providerId,
      providerName: formData.providerName,
      providerUserId: formData.providerUserId,
      providerTableId: formData.providerTableId,
      time: formData.scheduledAt,
      notes: formData.notes,
    };
    
    // Save state to sessionStorage as fallback
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`zenthea-booking-${slug}`, JSON.stringify(bookingState));
      } catch {
        // SessionStorage might be full or disabled
      }
    }
    
    // Encode state in URL params
    const stateParam = encodeURIComponent(JSON.stringify(bookingState));
    const redirectUrl = `/clinic/${slug}/book?bookingState=${stateParam}`;
    
    return `/clinic/${slug}/${authPath}?redirect=${encodeURIComponent(redirectUrl)}`;
  }, [slug, formData]);

  // Render wizard step indicator
  const renderWizardSteps = () => (
    <div className="flex items-center justify-between mb-6">
      {WIZARD_STEPS.map((stepInfo, index) => {
        const Icon = stepInfo.icon;
        const isActive = currentStep === stepInfo.step;
        const isCompleted = currentStep > stepInfo.step;
        const isClickable =
          stepInfo.step < currentStep || isStepComplete(stepInfo.step as WizardStep);

        return (
          <React.Fragment key={stepInfo.step}>
            <button
              type="button"
              onClick={() => isClickable && setCurrentStep(stepInfo.step)}
              disabled={!isClickable}
              className={cn(
                'flex flex-col items-center gap-1 transition-all',
                isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                  isActive
                    ? 'text-white'
                    : isCompleted
                    ? 'text-white'
                    : 'bg-surface-elevated border-2 border-border-primary text-text-secondary'
                )}
                style={
                  isActive || isCompleted
                    ? {
                        backgroundColor: primaryColor,
                        ...(isActive && {
                          boxShadow: `0 0 0 4px color-mix(in srgb, ${primaryColor} 20%, transparent)`,
                        }),
                      }
                    : undefined
                }
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  isActive ? '' : 'text-text-secondary'
                )}
                style={isActive ? { color: primaryColor } : undefined}
              >
                {stepInfo.label}
              </span>
            </button>

            {index < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2',
                  currentStep > stepInfo.step ? '' : 'bg-border-primary'
                )}
                style={
                  currentStep > stepInfo.step
                    ? { backgroundColor: primaryColor }
                    : undefined
                }
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // Step 1: Service Selection
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-text-primary">Select a Service</h3>
        <p className="text-sm text-text-secondary mt-1">
          Choose the type of appointment you'd like to book
        </p>
      </div>

      <ServiceSelector
        tenantId={tenantId}
        value={formData.serviceId}
        onSelect={handleServiceSelect}
        layout="list"
        showPrice
        showDuration
        showDescription
        primaryColor={primaryColor}
        onlineOnly
      />
    </div>
  );

  // Step 2: Provider Selection
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-text-primary">Choose Your Provider</h3>
        <p className="text-sm text-text-secondary mt-1">
          Select a provider for your {formData.serviceName || 'appointment'}
        </p>
      </div>

      {bookingProviders === undefined ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
          <span className="ml-2 text-sm text-text-secondary">Loading providers...</span>
        </div>
      ) : bookingProviders.length === 0 ? (
        <div className="text-center py-8">
          <User className="h-12 w-12 mx-auto mb-3 text-text-tertiary" />
          <p className="text-sm text-text-secondary">
            No providers available for online booking at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookingProviders.map((provider) => {
            const isSelected = formData.providerId === provider._id;
            const isBlocked = !provider.acceptingNewPatients && !isAuthenticated;

            return (
              <button
                key={provider._id}
                type="button"
                onClick={() => handleProviderSelect(provider)}
                disabled={isBlocked}
                className={cn(
                  'w-full p-4 rounded-lg border text-left transition-all',
                  isSelected
                    ? 'ring-2 ring-offset-2'
                    : isBlocked
                    ? 'opacity-70 cursor-not-allowed bg-surface-secondary'
                    : 'hover:shadow-md hover:border-border-focus'
                )}
                style={{
                  borderColor: isSelected ? primaryColor : undefined,
                  backgroundColor: isSelected ? `${primaryColor}10` : undefined,
                  ['--tw-ring-color' as string]: isSelected ? primaryColor : undefined,
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Provider Photo */}
                  {provider.photo ? (
                    <img
                      src={provider.photo}
                      alt={provider.displayName}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <User className="w-7 h-7" style={{ color: primaryColor }} />
                    </div>
                  )}

                  {/* Provider Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-text-primary">
                        {provider.displayName}
                      </p>
                      {provider.acceptingNewPatients ? (
                        <Badge 
                          className="text-xs"
                          style={{ 
                            backgroundColor: `${primaryColor}15`,
                            color: primaryColor,
                          }}
                        >
                          Accepting New Patients
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <UserX className="w-3 h-3 mr-1" />
                          Existing Patients Only
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary mt-0.5">{provider.title}</p>
                    {provider.specialties.length > 0 && (
                      <p className="text-xs text-text-tertiary mt-1">
                        {provider.specialties.slice(0, 3).join(' • ')}
                      </p>
                    )}
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <CheckCircle 
                      className="w-6 h-6 flex-shrink-0" 
                      style={{ color: primaryColor }}
                    />
                  )}
                </div>

                {/* Blocked message for non-accepting providers */}
                {isBlocked && (
                  <div className="mt-3 p-2 rounded bg-surface-elevated text-sm text-text-secondary flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-status-warning" />
                    <span>
                      Sign in as an existing patient to book with this provider
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // Step 3: Date & Time Selection
  const renderStep3 = () => {

    return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-text-primary">Select Date & Time</h3>
        <p className="text-sm text-text-secondary mt-1">
          Choose an available time with {formData.providerName || 'your provider'}
        </p>
        {/* Note: Timezone display moved to AvailabilitySlotPicker component */}
      </div>

      {selectedProvider?.userId ? (
        selectedProvider.clinicIds && selectedProvider.clinicIds.length > 0 ? (
          <AvailabilitySlotPicker
            userId={selectedProvider.userId as Id<'users'>}
            clinicId={selectedProvider.clinicIds[0] as Id<'clinics'>}
            tenantId={tenantId}
            slotDuration={formData.serviceDuration || 30}
            selectedDateTime={formData.scheduledAt || undefined}
            onSlotSelect={handleSlotSelect}
            onTimezoneLoad={setClinicTimezone}
            minDate={new Date()}
            maxDate={addDays(new Date(), 60)}
            showCalendar
            displayTimezone={inviteeTimezone} // Display times in invitee's timezone
            timeFormat={savedTimeFormat} // Use patient's saved time format preference
            showTimezoneDisplay={true} // Show timezone label in the slot picker
            allowTimezoneOverride={true} // Allow users to change the display timezone
            onTimezoneOverride={setTimezoneOverride} // Handle timezone changes
            sessionId={sessionId} // Pass session ID for slot locking
          />
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-status-warning" />
            <p className="text-sm text-text-secondary">
              This provider is not assigned to any clinic. Please contact support.
            </p>
          </div>
        )
      ) : (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-status-warning" />
          <p className="text-sm text-text-secondary">
            Unable to load availability for this provider.
            Please try selecting a different provider.
          </p>
        </div>
      )}
    </div>
  );
  };

  // Step 4: Confirmation
  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-text-primary">
          {isAuthenticated ? 'Confirm Your Appointment' : 'Almost There!'}
        </h3>
        <p className="text-sm text-text-secondary mt-1">
          {isAuthenticated
            ? 'Review and confirm your appointment details'
            : 'Sign in or create an account to complete your booking'}
        </p>
      </div>

      {/* Appointment Summary Card */}
      <div className="bg-surface-elevated border border-border-primary rounded-lg p-4 space-y-4">
        {/* Service */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}10` }}
          >
            <Briefcase className="h-6 w-6" style={{ color: primaryColor }} />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Service</p>
            <p className="font-semibold text-text-primary">{formData.serviceName}</p>
            <p className="text-xs text-text-tertiary">{formData.serviceDuration} minutes</p>
          </div>
        </div>

        <div className="border-t border-border-primary my-2" />

        {/* Provider */}
        <div className="flex items-center gap-3">
          {selectedProvider?.photo ? (
            <img
              src={selectedProvider.photo}
              alt={selectedProvider.displayName || formData.providerName || 'Provider'}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}10` }}
            >
              <User className="h-6 w-6" style={{ color: primaryColor }} />
            </div>
          )}
          <div>
            <p className="text-sm text-text-secondary">Provider</p>
            <p className="font-semibold text-text-primary">
              {formData.providerName || selectedProvider?.displayName || 'Not selected'}
            </p>
          </div>
        </div>

        <div className="border-t border-border-primary my-2" />

        {/* Date & Time */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}10` }}
          >
            <Calendar className="h-6 w-6" style={{ color: primaryColor }} />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Date & Time</p>
            <p className="font-semibold text-text-primary">
              {formData.scheduledAt > 0
                ? formatInTimezone(formData.scheduledAt, inviteeTimezone, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Not selected'}
            </p>
            <p className="font-medium" style={{ color: primaryColor }}>
              {formData.scheduledAt > 0
                ? formatInTimezone(formData.scheduledAt, inviteeTimezone, {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: savedTimeFormat === '12h',
                  })
                : ''}
            </p>
            {/* Show timezone info for clarity */}
            <p className="text-xs text-text-tertiary mt-0.5">
              {formatTimezoneWithOffset(inviteeTimezone)}
            </p>
          </div>
        </div>

        {/* Notes */}
        {formData.notes && (
          <>
            <div className="border-t border-border-primary my-2" />
            <div>
              <p className="text-sm text-text-secondary mb-1">Notes</p>
              <p className="text-sm text-text-primary">{formData.notes}</p>
            </div>
          </>
        )}
      </div>

      {/* Notes Input */}
      <div className="space-y-2">
        <Label htmlFor="notes">Reason for Visit (Optional)</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Please describe the reason for your appointment..."
          rows={3}
        />
      </div>

      {/* Auth Prompt (for unauthenticated users) */}
      {!isAuthenticated && (
        <div className="bg-surface-secondary rounded-lg p-4 space-y-4">
          <p className="text-sm text-text-primary text-center">
            Sign in or create an account to complete your booking at {tenantName}
          </p>
          
          <div className="space-y-3">
            <Link href={buildAuthRedirectUrl('login')} className="block">
              <Button
                className="w-full"
                style={{ backgroundColor: primaryColor }}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In to Complete Booking
              </Button>
            </Link>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border-primary" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface-secondary px-2 text-text-tertiary">
                  New patient?
                </span>
              </div>
            </div>
            
            <Link href={buildAuthRedirectUrl('register')} className="block">
              <Button variant="outline" className="w-full">
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Confirm Button (for authenticated users) */}
      {isAuthenticated && onConfirmBooking && (
        <>
          {saveError && (
            <div className="bg-status-error/10 border border-status-error/20 text-status-error p-3 rounded-md text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {saveError}
            </div>
          )}
        </>
      )}
    </div>
  );

  // Render wizard content based on current step
  const renderWizardContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return renderStep1();
    }
  };

  // Render wizard navigation buttons
  const renderWizardNavigation = () => (
    <div className="flex items-center justify-between pt-4 border-t border-border-primary mt-4">
      <Button
        type="button"
        variant="outline"
        onClick={currentStep === 1 ? handleCancel : goToPreviousStep}
        disabled={isSaving}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        {currentStep === 1 ? 'Cancel' : 'Back'}
      </Button>

      {currentStep < 4 ? (
        <Button
          type="button"
          onClick={goToNextStep}
          disabled={!canProceed()}
          style={{ backgroundColor: primaryColor }}
          className="hover:opacity-90"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      ) : isAuthenticated && onConfirmBooking ? (
        <Button
          type="button"
          onClick={onConfirmBooking}
          disabled={isSaving || !formData.scheduledAt}
          style={{ backgroundColor: primaryColor }}
          className="hover:opacity-90"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Booking...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Booking
            </>
          )}
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-4">
      {renderWizardSteps()}
      {renderWizardContent()}
      {renderWizardNavigation()}
    </div>
  );
}

export default PublicBookingWizard;

