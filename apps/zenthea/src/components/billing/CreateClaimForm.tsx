'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  validateCPTCode,
  validateDiagnosisCode,
  validateModifier,
  validateUnits,
  validateChargeAmount,
  validateLineItem,
  validateDateNotInFuture,
} from '@/lib/billing/claimValidation';

/**
 * Create Claim Form Component (Task 9.2)
 * 
 * Form for creating insurance claims from completed appointments with:
 * - Inline validation for all fields
 * - CPT code format validation
 * - Date range validation (service dates not in future)
 * - Required field validation
 * - Helpful error messages
 */

interface LineItem {
  procedureCode: string;
  modifiers: string[];
  diagnosisCodes: string[];
  units: number;
  chargeAmount: number; // in cents
}

interface LineItemErrors {
  [key: string]: string;
}

interface CreateClaimFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateClaimForm({ onSuccess, onCancel }: CreateClaimFormProps) {
  const { data: session } = useSession();
  const userEmail = session?.user?.email;
  const tenantId = session?.user?.tenantId;

  // All hooks must be called before any conditional returns
  // Form state
  const [appointmentId, setAppointmentId] = useState<Id<'appointments'> | ''>('');
  const [payerId, setPayerId] = useState<Id<'insurancePayers'> | ''>('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      procedureCode: '',
      modifiers: [],
      diagnosisCodes: [''],
      units: 1,
      chargeAmount: 0,
    },
  ]);

  // Validation errors
  const [errors, setErrors] = useState<{
    appointmentId?: string;
    payerId?: string;
    lineItems?: LineItemErrors[];
  }>({});

  // Loading and submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Convex queries - use conditional args based on tenantId
  const appointments = useQuery(
    api.appointments.getAppointmentsByTenant,
    tenantId ? { tenantId, limit: 100 } : 'skip'
  );

  const payers = useQuery(
    api.billing.getInsurancePayers,
    tenantId ? { tenantId } : 'skip'
  );

  // Convex mutation
  const createClaimForAppointment = useMutation(api.billing.createClaimForAppointment);

  // Filter completed appointments
  const completedAppointments = appointments?.filter(
    (apt) => apt.status === 'completed'
  ) || [];

  // Validate form on change - must be before conditional return
  useEffect(() => {
    const newErrors: typeof errors = {};

    // Validate appointment
    if (!appointmentId) {
      newErrors.appointmentId = 'Appointment selection is required';
    }

    // Validate payer
    if (!payerId) {
      newErrors.payerId = 'Insurance payer selection is required';
    }

    // Validate line items
    const lineItemErrors: LineItemErrors[] = [];
    lineItems.forEach((item, index) => {
      const itemErrors = validateLineItem(item);
      if (Object.keys(itemErrors).length > 0) {
        lineItemErrors[index] = itemErrors;
      }
    });

    if (lineItemErrors.length > 0) {
      newErrors.lineItems = lineItemErrors;
    }

    setErrors(newErrors);
  }, [appointmentId, payerId, lineItems]);

  // Handle missing tenantId explicitly - after all hooks
  if (!tenantId) {
    return (
      <div className="bg-status-error/10 border border-status-error/20 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-4 w-4 text-status-error mr-2" />
          <p className="text-status-error text-sm">
            Please log in to create claims. Tenant information is required.
          </p>
        </div>
      </div>
    );
  }

  // Add new line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        procedureCode: '',
        modifiers: [],
        diagnosisCodes: [''],
        units: 1,
        chargeAmount: 0,
      },
    ]);
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  // Update line item field
  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: any
  ) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  // Add diagnosis code to line item
  const addDiagnosisCode = (lineItemIndex: number) => {
    const updated = [...lineItems];
    updated[lineItemIndex].diagnosisCodes.push('');
    setLineItems(updated);
  };

  // Remove diagnosis code from line item
  const removeDiagnosisCode = (lineItemIndex: number, diagIndex: number) => {
    const updated = [...lineItems];
    if (updated[lineItemIndex].diagnosisCodes.length > 1) {
      updated[lineItemIndex].diagnosisCodes.splice(diagIndex, 1);
      setLineItems(updated);
    }
  };

  // Update diagnosis code
  const updateDiagnosisCode = (
    lineItemIndex: number,
    diagIndex: number,
    value: string
  ) => {
    const updated = [...lineItems];
    updated[lineItemIndex].diagnosisCodes[diagIndex] = value;
    setLineItems(updated);
  };

  // Add modifier to line item
  const addModifier = (lineItemIndex: number) => {
    const updated = [...lineItems];
    updated[lineItemIndex].modifiers.push('');
    setLineItems(updated);
  };

  // Remove modifier from line item
  const removeModifier = (lineItemIndex: number, modIndex: number) => {
    const updated = [...lineItems];
    updated[lineItemIndex].modifiers.splice(modIndex, 1);
    setLineItems(updated);
  };

  // Update modifier
  const updateModifier = (
    lineItemIndex: number,
    modIndex: number,
    value: string
  ) => {
    const updated = [...lineItems];
    updated[lineItemIndex].modifiers[modIndex] = value.toUpperCase();
    setLineItems(updated);
  };

  // Parse currency input to cents
  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const dollars = parseFloat(cleaned) || 0;
    return Math.round(dollars * 100);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Final validation
    const finalErrors: typeof errors = {};

    if (!appointmentId) {
      finalErrors.appointmentId = 'Appointment selection is required';
    }

    if (!payerId) {
      finalErrors.payerId = 'Insurance payer selection is required';
    }

    const lineItemErrors: LineItemErrors[] = [];
    lineItems.forEach((item, index) => {
      const itemErrors = validateLineItem(item);
      if (Object.keys(itemErrors).length > 0) {
        lineItemErrors[index] = itemErrors;
      }
    });

    if (lineItemErrors.length > 0) {
      finalErrors.lineItems = lineItemErrors;
    }

    if (Object.keys(finalErrors).length > 0) {
      setErrors(finalErrors);
      setSubmitError('Please fix the errors below before submitting');
      return;
    }

    // Validate appointment date (not in future)
    const selectedAppointment = completedAppointments.find(
      (apt) => apt._id === appointmentId
    );

    if (selectedAppointment) {
      const dateError = validateDateNotInFuture(selectedAppointment.scheduledAt);
      if (dateError) {
        setErrors({ ...finalErrors, appointmentId: dateError });
        setSubmitError('Please select an appointment with a valid service date');
        return;
      }
    } else {
      finalErrors.appointmentId = 'Selected appointment not found';
      setErrors(finalErrors);
      setSubmitError('Please select a valid appointment');
      return;
    }

    if (!userEmail) {
      setSubmitError('User email is required');
      return;
    }

    setIsSubmitting(true);

    try {
      await createClaimForAppointment({
        appointmentId: appointmentId as Id<'appointments'>,
        payerId: payerId as Id<'insurancePayers'>,
        userEmail,
        lineItems: lineItems.map((item) => ({
          // Sanitize procedure code: remove non-alphanumeric characters (keep A-Z, 0-9)
          procedureCode: item.procedureCode.trim().replace(/[^A-Z0-9]/g, ''),
          // Sanitize modifiers: keep only alphanumeric, max 2 chars
          modifiers: item.modifiers
            .filter((m) => m.trim() !== '')
            .map((m) => m.trim().replace(/[^A-Z0-9]/g, '').slice(0, 2)),
          // Sanitize diagnosis codes: keep alphanumeric and decimal points
          diagnosisCodes: item.diagnosisCodes
            .filter((d) => d.trim() !== '')
            .map((d) => d.trim().replace(/[^A-Z0-9.]/g, '')),
          units: item.units,
          chargeAmount: item.chargeAmount,
        })),
      });

      // Reset form state on success
      setAppointmentId('');
      setPayerId('');
      setLineItems([
        {
          procedureCode: '',
          modifiers: [],
          diagnosisCodes: [''],
          units: 1,
          chargeAmount: 0,
        },
      ]);
      setErrors({});
      setSubmitError(null);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to create claim. Please try again.';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Submit Error */}
      {submitError && (
        <div className="bg-status-error/10 border border-status-error/20 rounded-lg p-3">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-status-error mr-2" />
            <p className="text-status-error text-sm">{submitError}</p>
          </div>
        </div>
      )}

      {/* Appointment Selection */}
      <div>
        <Label htmlFor="appointment">
          Appointment <span className="text-status-error">*</span>
        </Label>
        <Select
          value={appointmentId}
          onValueChange={(value) => setAppointmentId(value as Id<'appointments'>)}
        >
          <SelectTrigger
            id="appointment"
            className={cn(errors.appointmentId && 'border-status-error')}
          >
            <SelectValue placeholder="Select a completed appointment" />
          </SelectTrigger>
          <SelectContent>
            {completedAppointments.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-text-secondary">
                No completed appointments available
              </div>
            ) : (
              completedAppointments.map((apt) => {
                const date = new Date(apt.scheduledAt);
                const dateStr = date.toLocaleDateString();
                return (
                  <SelectItem key={apt._id} value={apt._id}>
                    {dateStr} - {apt.type || 'Appointment'}
                  </SelectItem>
                );
              })
            )}
          </SelectContent>
        </Select>
        {errors.appointmentId && (
          <p className="mt-1 text-sm text-status-error flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            {errors.appointmentId}
          </p>
        )}
      </div>

      {/* Service Date Display (auto-filled from appointment) */}
      {appointmentId && (() => {
        const selectedAppointment = completedAppointments.find(
          (apt) => apt._id === appointmentId
        );
        if (selectedAppointment) {
          const serviceDate = new Date(selectedAppointment.scheduledAt);
          return (
            <div>
              <Label>Service Date</Label>
              <div className="mt-1 px-3 py-2 bg-surface-elevated border border-border-primary rounded-md text-sm text-text-primary">
                {serviceDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                Service date is automatically set from the selected appointment
              </p>
            </div>
          );
        }
        return null;
      })()}

      {/* Payer Selection */}
      <div>
        <Label htmlFor="payer">
          Insurance Payer <span className="text-status-error">*</span>
        </Label>
        <Select
          value={payerId}
          onValueChange={(value) => setPayerId(value as Id<'insurancePayers'>)}
        >
          <SelectTrigger
            id="payer"
            className={cn(errors.payerId && 'border-status-error')}
          >
            <SelectValue placeholder="Select an insurance payer" />
          </SelectTrigger>
          <SelectContent>
            {!payers || payers.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-text-secondary">
                No insurance payers available
              </div>
            ) : (
              payers.map((payer) => (
                <SelectItem key={payer._id} value={payer._id}>
                  {payer.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.payerId && (
          <p className="mt-1 text-sm text-status-error flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            {errors.payerId}
          </p>
        )}
      </div>

      {/* Line Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>
            Line Items <span className="text-status-error">*</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLineItem}
            className="flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add Line Item
          </Button>
        </div>

        <div className="space-y-4">
          {lineItems.map((item, itemIndex) => {
            const itemErrors = errors.lineItems?.[itemIndex] || {};

            return (
              <div
                key={itemIndex}
                className="border border-border-primary rounded-lg p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Line Item {itemIndex + 1}</h4>
                  {lineItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(itemIndex)}
                      className="text-status-error hover:text-status-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Procedure Code */}
                <div>
                  <Label htmlFor={`procedure-${itemIndex}`}>
                    CPT Code <span className="text-status-error">*</span>
                  </Label>
                  <Input
                    id={`procedure-${itemIndex}`}
                    value={item.procedureCode}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      updateLineItem(itemIndex, 'procedureCode', value);
                    }}
                    placeholder="e.g., 99213"
                    className={cn(itemErrors.procedureCode && 'border-status-error')}
                  />
                  {itemErrors.procedureCode && (
                    <p className="mt-1 text-sm text-status-error flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {itemErrors.procedureCode}
                    </p>
                  )}
                </div>

                {/* Diagnosis Codes */}
                <div>
                  <Label>
                    Diagnosis Codes (ICD-10) <span className="text-status-error">*</span>
                  </Label>
                  <div className="space-y-2">
                    {item.diagnosisCodes.map((code, diagIndex) => (
                      <div key={diagIndex} className="flex items-start gap-2">
                        <div className="flex-1">
                          <Input
                            value={code}
                            onChange={(e) => {
                              const value = e.target.value.toUpperCase();
                              updateDiagnosisCode(itemIndex, diagIndex, value);
                            }}
                            placeholder="e.g., E11.9"
                            className={cn(
                              itemErrors[`diagnosisCodes.${diagIndex}`] &&
                                'border-status-error'
                            )}
                          />
                          {itemErrors[`diagnosisCodes.${diagIndex}`] && (
                            <p className="mt-1 text-sm text-status-error flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {itemErrors[`diagnosisCodes.${diagIndex}`]}
                            </p>
                          )}
                        </div>
                        {item.diagnosisCodes.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDiagnosisCode(itemIndex, diagIndex)}
                            className="text-status-error hover:text-status-error"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addDiagnosisCode(itemIndex)}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Diagnosis Code
                    </Button>
                  </div>
                  {itemErrors.diagnosisCodes && (
                    <p className="mt-1 text-sm text-status-error flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {itemErrors.diagnosisCodes}
                    </p>
                  )}
                </div>

                {/* Modifiers */}
                <div>
                  <Label>Modifiers (Optional)</Label>
                  <div className="space-y-2">
                    {item.modifiers.map((modifier, modIndex) => (
                      <div key={modIndex} className="flex items-start gap-2">
                        <div className="flex-1">
                          <Input
                            value={modifier}
                            onChange={(e) => {
                              const value = e.target.value.toUpperCase();
                              updateModifier(itemIndex, modIndex, value);
                            }}
                            placeholder="e.g., 25, 59"
                            maxLength={2}
                            className={cn(
                              itemErrors[`modifiers.${modIndex}`] &&
                                'border-status-error'
                            )}
                          />
                          {itemErrors[`modifiers.${modIndex}`] && (
                            <p className="mt-1 text-sm text-status-error flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {itemErrors[`modifiers.${modIndex}`]}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeModifier(itemIndex, modIndex)}
                          className="text-status-error hover:text-status-error"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addModifier(itemIndex)}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Modifier
                    </Button>
                  </div>
                </div>

                {/* Units and Charge Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`units-${itemIndex}`}>
                      Units <span className="text-status-error">*</span>
                    </Label>
                    <Input
                      id={`units-${itemIndex}`}
                      type="number"
                      min="1"
                      value={item.units}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        updateLineItem(itemIndex, 'units', value);
                      }}
                      className={cn(itemErrors.units && 'border-status-error')}
                    />
                    {itemErrors.units && (
                      <p className="mt-1 text-sm text-status-error flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {itemErrors.units}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`charge-${itemIndex}`}>
                      Charge Amount <span className="text-status-error">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                        $
                      </span>
                      <Input
                        id={`charge-${itemIndex}`}
                        type="text"
                        value={
                          item.chargeAmount > 0
                            ? (item.chargeAmount / 100).toFixed(2)
                            : ''
                        }
                        onChange={(e) => {
                          const cents = parseCurrency(e.target.value);
                          updateLineItem(itemIndex, 'chargeAmount', cents);
                        }}
                        placeholder="0.00"
                        className={cn(
                          'pl-7',
                          itemErrors.chargeAmount && 'border-status-error'
                        )}
                      />
                    </div>
                    {itemErrors.chargeAmount && (
                      <p className="mt-1 text-sm text-status-error flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {itemErrors.chargeAmount}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Claim'}
        </Button>
      </div>
    </form>
  );
}

