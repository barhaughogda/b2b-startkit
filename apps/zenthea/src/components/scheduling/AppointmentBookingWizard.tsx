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
  FileText,
  User,
  Check,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Loader2,
  AlertCircle,
  Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { CareTeamProviderSelector } from '@/components/patient/CareTeamProviderSelector';
import { ClinicSelector } from '@/components/scheduling/ClinicSelector';
import { AvailabilitySlotPicker } from '@/components/scheduling/AvailabilitySlotPicker';
import { TimeSlot } from '@/hooks/useProviderAvailability';
import { CareTeamMember } from '@/hooks/useCareTeam';

type WizardStep = 1 | 2 | 3 | 4;
const WIZARD_STEPS = [
  { step: 1 as WizardStep, label: 'Provider', icon: User },
  { step: 2 as WizardStep, label: 'Date & Time', icon: Calendar },
  { step: 3 as WizardStep, label: 'Details', icon: FileText },
  { step: 4 as WizardStep, label: 'Confirm', icon: Check },
];

export interface PatientAppointmentFormData {
  providerId: string;
  providerName: string;
  userId?: string;
  scheduledAt: number;
  duration: number;
  type: 'consultation' | 'follow-up' | 'procedure' | 'telehealth';
  locationId?: string;
  clinicId?: string;
  clinicName?: string;
  clinicTimezone?: string;
  notes?: string;
}

interface AppointmentBookingWizardProps {
  tenantId: string;
  formData: PatientAppointmentFormData;
  onFormDataChange: (data: PatientAppointmentFormData) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
  saveError?: string | null;
}

export function AppointmentBookingWizard({
  tenantId,
  formData,
  onFormDataChange,
  onSave,
  onCancel,
  isSaving = false,
  saveError = null,
}: AppointmentBookingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  const handleProviderSelect = useCallback((providerId: string, member?: CareTeamMember) => {
    onFormDataChange({ ...formData, providerId, providerName: member?.name || '', userId: member?.id, scheduledAt: 0, clinicId: '', clinicName: '' });
  }, [onFormDataChange, formData]);

  const handleClinicSelect = useCallback((clinicId: string, clinic?: any) => {
    onFormDataChange({ ...formData, clinicId, clinicName: clinic?.name || '', clinicTimezone: clinic?.timezone || '', scheduledAt: 0 });
  }, [onFormDataChange, formData]);

  const handleSlotSelect = useCallback((slot: TimeSlot) => {
    onFormDataChange({ ...formData, scheduledAt: slot.dateTime });
  }, [formData, onFormDataChange]);

  const isStepComplete = (step: WizardStep): boolean => {
    if (step === 1) return !!formData.providerId && !!formData.clinicId;
    if (step === 2) return !!formData.scheduledAt;
    if (step === 3) return !!formData.type;
    return true;
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <CareTeamProviderSelector value={formData.providerId} onValueChange={handleProviderSelect} label="Choose Provider" required />
      {formData.providerId && (
        <ClinicSelector value={formData.clinicId} onValueChange={handleClinicSelect} userId={formData.userId} tenantId={tenantId} label="Clinic" required />
      )}
    </div>
  );

  const renderStep2 = () => (
    <AvailabilitySlotPicker userId={formData.userId} clinicId={formData.clinicId} tenantId={tenantId} slotDuration={formData.duration} selectedDateTime={formData.scheduledAt || undefined} onSlotSelect={handleSlotSelect} />
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <Label>Appointment Type</Label>
      <Select value={formData.type} onValueChange={(v: any) => onFormDataChange({ ...formData, type: v })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="consultation">Consultation</SelectItem>
          <SelectItem value="follow-up">Follow-up</SelectItem>
          <SelectItem value="procedure">Procedure</SelectItem>
          <SelectItem value="telehealth">Telehealth</SelectItem>
        </SelectContent>
      </Select>
      <Label>Notes</Label>
      <Textarea value={formData.notes || ''} onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })} placeholder="Notes..." />
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4 p-4 border rounded-lg bg-surface-elevated">
      <div><Label>Provider</Label><p className="font-semibold">{formData.providerName}</p></div>
      <div><Label>Date & Time</Label><p className="font-semibold">{formData.scheduledAt > 0 ? format(new Date(formData.scheduledAt), 'PPPP p') : 'Not selected'}</p></div>
      <div><Label>Clinic</Label><p className="font-semibold">{formData.clinicName}</p></div>
      <div><Label>Type</Label><p className="font-semibold capitalize">{formData.type}</p></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between border-b pb-4">
        {WIZARD_STEPS.map(s => <div key={s.step} className={cn("text-xs font-medium", currentStep === s.step ? "text-zenthea-teal" : "text-text-tertiary")}>{s.label}</div>)}
      </div>
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={currentStep === 1 ? onCancel : () => setCurrentStep((prev) => (prev - 1) as WizardStep)}>{currentStep === 1 ? 'Cancel' : 'Back'}</Button>
        {currentStep < 4 ? (
          <Button onClick={() => setCurrentStep((prev) => (prev + 1) as WizardStep)} disabled={!isStepComplete(currentStep)}>Next</Button>
        ) : (
          <Button onClick={onSave} disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}Confirm</Button>
        )}
      </div>
      {saveError && <div className="text-status-error text-sm mt-2">{saveError}</div>}
    </div>
  );
}
