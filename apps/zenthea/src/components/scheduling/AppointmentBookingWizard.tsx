'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import {
  Building2,
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
  Stethoscope,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { Id } from '@/convex/_generated/dataModel';
import { CareTeamProviderSelector } from '@/components/patient/CareTeamProviderSelector';
import { ClinicSelector } from '@/components/scheduling/ClinicSelector';
import { AvailabilitySlotPicker } from '@/components/scheduling/AvailabilitySlotPicker';
import { ServiceSelector, type ServiceData } from '@/components/scheduling/ServiceSelector';
import { TimeSlot } from '@/hooks/useProviderAvailability';
import { CareTeamMember } from '@/hooks/useCareTeam';

// Wizard step types
type WizardStep = 1 | 2 | 3 | 4;
const WIZARD_STEPS = [
  { step: 1 as WizardStep, label: 'Provider', icon: User },
  { step: 2 as WizardStep, label: 'Date & Time', icon: Calendar },
  { step: 3 as WizardStep, label: 'Details', icon: FileText },
  { step: 4 as WizardStep, label: 'Confirm', icon: Check },
];

// Patient appointment form data
export interface PatientAppointmentFormData {
  providerId: string;
  providerName: string;
  /** User ID of the provider (for clinic-based availability) */
  userId?: string;
  scheduledAt: number;
  duration: number;
  type: 'consultation' | 'follow-up' | 'procedure' | 'telehealth';
  /** @deprecated Use clinicId instead */
  locationId?: string;
  /** Clinic ID for clinic-based scheduling */
  clinicId?: string;
  clinicName?: string;
  clinicTimezone?: string;
  notes?: string;
  /** Service ID from booking settings (if using services) */
  serviceId?: string;
  /** Service name for display */
  serviceName?: string;
}

interface AppointmentBookingWizardProps {
  tenantId: string;
  formData: PatientAppointmentFormData;
  onFormDataChange: (data: PatientAppointmentFormData) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
  saveError?: string | null;
  durationOptions?: Array<{ value: number; label: string }>;
  appointmentTypes?: Array<{
    value: 'consultation' | 'follow-up' | 'procedure' | 'telehealth';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
  /** 
   * If true, shows services from booking settings instead of hardcoded appointment types.
   * Services will include icons and prices from the tenant's configuration.
   */
  useServices?: boolean;
  /** Primary color for service selector styling */
  primaryColor?: string;
}

export function AppointmentBookingWizard({
  tenantId,
  formData,
  onFormDataChange,
  onSave,
  onCancel,
  isSaving = false,
  saveError = null,
  durationOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
  ],
  appointmentTypes = [
    { value: 'consultation', label: 'Consultation', icon: Stethoscope },
    { value: 'follow-up', label: 'Follow-up', icon: CheckCircle },
    { value: 'procedure', label: 'Procedure', icon: AlertCircle },
    { value: 'telehealth', label: 'Telehealth', icon: CheckCircle },
  ],
  useServices = false,
  primaryColor = 'var(--tenant-primary, var(--zenthea-teal))',
}: AppointmentBookingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  
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

  // Update form field
  const updateField = useCallback(
    (field: keyof PatientAppointmentFormData, value: string | number) => {
      onFormDataChange({ ...formData, [field]: value });
    },
    [formData, onFormDataChange]
  );

  // Handle provider selection
  const handleProviderSelect = useCallback(
    (providerId: string, member?: CareTeamMember) => {
      // Batch all updates into a single call to avoid stale closure issues
      onFormDataChange({
        ...formData,
        providerId,
        providerName: member?.name || '',
        userId: member?.userId ? String(member.userId) : undefined,
        scheduledAt: 0, // Reset time when provider changes
        clinicId: '', // Reset clinic when provider changes
        clinicName: '',
        clinicTimezone: '',
      });
    },
    [onFormDataChange, formData]
  );

  // Handle clinic selection
  const handleClinicSelect = useCallback(
    (clinicId: string, clinic?: { name: string; timezone?: string }) => {
      onFormDataChange({
        ...formData,
        clinicId,
        clinicName: clinic?.name || '',
        clinicTimezone: clinic?.timezone || '',
        scheduledAt: 0, // Reset time when clinic changes
      });
    },
    [onFormDataChange, formData]
  );

  // Handle time slot selection
  const handleSlotSelect = useCallback(
    (slot: TimeSlot) => {
      updateField('scheduledAt', slot.dateTime);
    },
    [updateField]
  );

  // Handle service selection (when useServices is true)
  const handleServiceSelect = useCallback(
    (service: ServiceData) => {
      onFormDataChange({
        ...formData,
        serviceId: service.id,
        serviceName: service.name,
        duration: service.duration,
        // Map to a generic type for compatibility
        type: 'consultation',
      });
    },
    [onFormDataChange, formData]
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

  // Check if current step is complete
  const isStepComplete = useCallback(
    (step: WizardStep): boolean => {
      switch (step) {
        case 1:
          // Provider and clinic must be selected (clinic required if userId available)
          const hasProvider = !!formData.providerId;
          const hasClinic = !!formData.clinicId;
          // If we have a userId, clinic is required; otherwise just provider is enough
          const step1Complete = hasProvider && (formData.userId ? hasClinic : true);
          return step1Complete;
        case 2:
          return !!formData.scheduledAt;
        case 3:
          // In services mode, serviceId must be selected; otherwise type is required
          return useServices ? !!formData.serviceId : !!formData.type;
        case 4:
          return true;
        default:
          return false;
      }
    },
    [formData.providerId, formData.userId, formData.clinicId, formData.scheduledAt, formData.type]
  );

  // Check if can proceed to next step
  const canProceed = useCallback((): boolean => {
    const result = isStepComplete(currentStep);    return result;
  }, [currentStep, isStepComplete, formData.providerId]);

  // Render wizard step indicator (Calendly-style)
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
            {/* Step circle */}
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
                        backgroundColor: 'var(--tenant-primary, var(--zenthea-teal))',
                        ...(isActive && {
                          boxShadow: `0 0 0 4px color-mix(in srgb, var(--tenant-primary, var(--zenthea-teal)) 20%, transparent)`,
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
                style={
                  isActive
                    ? { color: 'var(--tenant-primary, var(--zenthea-teal))' }
                    : undefined
                }
              >
                {stepInfo.label}
              </span>
            </button>

            {/* Connector line */}
            {index < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2',
                  currentStep > stepInfo.step ? '' : 'bg-border-primary'
                )}
                style={
                  currentStep > stepInfo.step
                    ? { backgroundColor: 'var(--tenant-primary, var(--zenthea-teal))' }
                    : undefined
                }
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // Render Step 1: Provider Selection
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-text-primary">Choose Your Provider</h3>
        <p className="text-sm text-text-secondary mt-1">
          Select a provider from your care team
        </p>
      </div>

      <CareTeamProviderSelector
        value={formData.providerId}
        onValueChange={handleProviderSelect}
        label=""
        placeholder="Choose from your care team"
        required
        showPrimaryBadge
        showSpecialty
      />

      {/* Clinic selection - shows clinics where the provider is available */}
      {formData.providerId && formData.userId && (
        <ClinicSelector
          value={formData.clinicId}
          onValueChange={handleClinicSelect}
          userId={formData.userId as Id<'users'>}
          tenantId={tenantId}
          label="Clinic"
          placeholder="Select a clinic location"
          showTimezone
          required
        />
      )}
    </div>
  );

  // Render Step 2: Date & Time Selection (Calendly-style)
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-text-primary">Select Date & Time</h3>
        <p className="text-sm text-text-secondary mt-1">
          Choose an available time slot with {formData.providerName || 'your provider'}
          {formData.clinicName && ` at ${formData.clinicName}`}
        </p>
        <p className="text-xs text-text-tertiary mt-1">
          Times shown in {displayTimezone.replace(/_/g, ' ')}
        </p>
      </div>

      {/* Use clinic-based availability if we have userId and clinicId */}
      {formData.userId && formData.clinicId ? (
        <AvailabilitySlotPicker
          userId={formData.userId as Id<'users'>}
          clinicId={formData.clinicId as Id<'clinics'>}
          tenantId={tenantId}
          slotDuration={formData.duration}
          selectedDateTime={formData.scheduledAt || undefined}
          onSlotSelect={handleSlotSelect}
          minDate={new Date()}
          maxDate={addDays(new Date(), 60)}
          showCalendar
          displayTimezone={displayTimezone}
          timeFormat={savedTimeFormat}
        />
      ) : formData.providerId ? (
        /* Fallback to provider-based availability for backward compatibility */
        <AvailabilitySlotPicker
          providerId={formData.providerId as Id<'providers'>}
          locationId={
            formData.locationId ? (formData.locationId as Id<'locations'>) : undefined
          }
          tenantId={tenantId}
          slotDuration={formData.duration}
          selectedDateTime={formData.scheduledAt || undefined}
          onSlotSelect={handleSlotSelect}
          minDate={new Date()}
          maxDate={addDays(new Date(), 60)}
          showCalendar
          displayTimezone={displayTimezone}
          timeFormat={savedTimeFormat}
        />
      ) : null}
    </div>
  );

  // Render Step 3: Appointment Details
  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-text-primary">
          {useServices ? 'Select a Service' : 'Appointment Details'}
        </h3>
        <p className="text-sm text-text-secondary mt-1">
          {useServices 
            ? 'Choose the service you would like to book'
            : 'Select the type of appointment and add any notes'}
        </p>
      </div>

      {/* Service Selection (when useServices is true) */}
      {useServices ? (
        <div className="space-y-4">
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

          {/* Notes */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="notes">Reason for Visit (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Please describe the reason for your appointment..."
              rows={3}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration</Label>
            <Select
              value={formData.duration.toString()}
              onValueChange={(value) => updateField('duration', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Appointment Type */}
          <div className="space-y-2">
            <Label>Appointment Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {appointmentTypes.map((apptType) => {
                const Icon = apptType.icon;
                const isSelected = formData.type === apptType.value;
                return (
                  <Button
                    key={apptType.value}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    className="justify-start h-auto py-3"
                    style={
                      isSelected
                        ? {
                            backgroundColor: primaryColor,
                            color: '#ffffff',
                          }
                        : undefined
                    }
                    onClick={() => updateField('type', apptType.value)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {apptType.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
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
        </>
      )}
    </div>
  );

  // Render Step 4: Confirmation
  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Confirm Your Appointment</h3>
        <p className="text-sm text-text-secondary mt-1">
          Review and confirm your appointment details
        </p>
      </div>

      {/* Appointment Summary Card */}
      <div className="bg-surface-elevated border border-border-primary rounded-lg p-4 space-y-4">
        {/* Provider */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: `color-mix(in srgb, var(--tenant-primary, var(--zenthea-teal)) 10%, transparent)`,
            }}
          >
            <User
              className="h-6 w-6"
              style={{ color: 'var(--tenant-primary, var(--zenthea-teal))' }}
            />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Provider</p>
            <p className="font-semibold text-text-primary">{formData.providerName}</p>
          </div>
        </div>

        <div className="border-t border-border-primary my-2" />

        {/* Date & Time */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: `color-mix(in srgb, var(--tenant-primary, var(--zenthea-teal)) 10%, transparent)`,
            }}
          >
            <Calendar
              className="h-6 w-6"
              style={{ color: 'var(--tenant-primary, var(--zenthea-teal))' }}
            />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Date & Time</p>
            <p className="font-semibold text-text-primary">
              {formData.scheduledAt > 0
                ? format(new Date(formData.scheduledAt), 'EEEE, MMMM d, yyyy')
                : 'Not selected'}
            </p>
            <p className="font-medium" style={{ color: 'var(--tenant-primary, var(--zenthea-teal))' }}>
              {formData.scheduledAt > 0 ? format(new Date(formData.scheduledAt), 'h:mm a') : ''}{' '}
              <span className="text-text-secondary text-sm">({formData.duration} min)</span>
            </p>
          </div>
        </div>

        {/* Clinic Location */}
        {formData.clinicName && (
          <>
            <div className="border-t border-border-primary my-2" />

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-zenthea-teal/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-zenthea-teal" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Clinic</p>
                <p className="font-semibold text-text-primary">{formData.clinicName}</p>
                {formData.clinicTimezone && (
                  <p className="text-xs text-text-tertiary">{formData.clinicTimezone}</p>
                )}
              </div>
            </div>
          </>
        )}

        <div className="border-t border-border-primary my-2" />

        {/* Service/Appointment Type */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: `color-mix(in srgb, ${primaryColor} 10%, transparent)`,
            }}
          >
            {useServices ? (
              <Briefcase
                className="h-6 w-6"
                style={{ color: primaryColor }}
              />
            ) : (
              <Stethoscope
                className="h-6 w-6"
                style={{ color: primaryColor }}
              />
            )}
          </div>
          <div>
            <p className="text-sm text-text-secondary">
              {useServices ? 'Service' : 'Appointment Type'}
            </p>
            <p className="font-semibold text-text-primary">
              {useServices && formData.serviceName 
                ? formData.serviceName 
                : <span className="capitalize">{formData.type}</span>}
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

      {/* Error Message */}
      {saveError && (
        <div className="bg-status-error/10 border border-status-error/20 text-status-error p-3 rounded-md text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {saveError}
        </div>
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
        onClick={currentStep === 1 ? onCancel : goToPreviousStep}
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
          style={{
            backgroundColor: 'var(--tenant-primary, var(--zenthea-teal))',
          }}
          className="hover:opacity-90"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onSave}
          disabled={isSaving || !formData.scheduledAt}
          style={{
            backgroundColor: 'var(--tenant-primary, var(--zenthea-teal))',
          }}
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
      )}
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

