'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation } from 'convex/react';
// Use relative import for Convex generated files (they're at root level, not in src/)
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Save, Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface InsuranceFormProps {
  patientId: Id<'patients'>;
  initialData?: {
    primary?: {
      provider: string;
      policyNumber: string;
      groupNumber?: string;
      subscriberName: string;
      subscriberDOB?: string;
      effectiveDate: string;
      employerName?: string;
    };
    secondary?: {
      provider: string;
      policyNumber: string;
      groupNumber?: string;
      subscriberName: string;
    };
  };
}

export function InsuranceForm({ patientId, initialData }: InsuranceFormProps) {
  const { data: session } = useSession();
  const updateProfile = useMutation((api as any).patientProfile?.updatePatientProfile);
  const [isSaving, setIsSaving] = useState(false);

  // Handle both old and new insurance structures
  const getInitialInsurance = () => {
    // Always ensure primary exists, even if initialData.primary is undefined
    const primary = initialData?.primary || {
      provider: '',
      policyNumber: '',
      groupNumber: '',
      subscriberName: '',
      subscriberDOB: '',
      effectiveDate: '',
      employerName: '',
    };

    return {
      primary: {
        provider: primary.provider || '',
        policyNumber: primary.policyNumber || '',
        groupNumber: primary.groupNumber || '',
        subscriberName: primary.subscriberName || '',
        subscriberDOB: primary.subscriberDOB || '',
        effectiveDate: primary.effectiveDate || '',
        employerName: primary.employerName || '',
      },
      secondary: initialData?.secondary
        ? {
            provider: initialData.secondary.provider,
            policyNumber: initialData.secondary.policyNumber,
            groupNumber: initialData.secondary.groupNumber || '',
            subscriberName: initialData.secondary.subscriberName,
          }
        : undefined,
    };
  };

  const [insurance, setInsurance] = useState(() => getInitialInsurance());

  useEffect(() => {
    if (initialData) {
      setInsurance(getInitialInsurance());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        patientId,
        section: 'insurance',
        data: insurance,
        userEmail: session?.user?.email,
      });
      toast.success('Insurance updated', {
        description: 'Your insurance information has been saved.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save insurance.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isComplete = insurance.primary?.provider && insurance.primary?.policyNumber && insurance.primary?.subscriberName;

  return (
    <div className="space-y-6">
      {/* Primary Insurance */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-zenthea-teal" />
          <h4 className="text-sm font-semibold text-text-primary">Primary Insurance</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryProvider">Insurance Provider *</Label>
            <Input
              id="primaryProvider"
              value={insurance.primary?.provider || ''}
              onChange={(e) =>
                setInsurance({
                  ...insurance,
                  primary: { ...(insurance.primary || {}), provider: e.target.value },
                })
              }
              placeholder="e.g., Blue Cross Blue Shield"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryPolicyNumber">Policy Number *</Label>
            <Input
              id="primaryPolicyNumber"
              value={insurance.primary?.policyNumber || ''}
              onChange={(e) =>
                setInsurance({
                  ...insurance,
                  primary: { ...(insurance.primary || {}), policyNumber: e.target.value },
                })
              }
              placeholder="Policy number"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryGroupNumber">Group Number</Label>
            <Input
              id="primaryGroupNumber"
              value={insurance.primary?.groupNumber || ''}
              onChange={(e) =>
                setInsurance({
                  ...insurance,
                  primary: { ...(insurance.primary || {}), groupNumber: e.target.value },
                })
              }
              placeholder="Group number (optional)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primarySubscriberName">Subscriber Name *</Label>
            <Input
              id="primarySubscriberName"
              value={insurance.primary?.subscriberName || ''}
              onChange={(e) =>
                setInsurance({
                  ...insurance,
                  primary: { ...(insurance.primary || {}), subscriberName: e.target.value },
                })
              }
              placeholder="Name on insurance card"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primarySubscriberDOB">Subscriber Date of Birth</Label>
            <Input
              id="primarySubscriberDOB"
              type="date"
              value={insurance.primary?.subscriberDOB || ''}
              onChange={(e) =>
                setInsurance({
                  ...insurance,
                  primary: { ...(insurance.primary || {}), subscriberDOB: e.target.value },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryEffectiveDate">Effective Date *</Label>
            <Input
              id="primaryEffectiveDate"
              type="date"
              value={insurance.primary?.effectiveDate || ''}
              onChange={(e) =>
                setInsurance({
                  ...insurance,
                  primary: { ...(insurance.primary || {}), effectiveDate: e.target.value },
                })
              }
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="primaryEmployerName">Employer Name</Label>
            <Input
              id="primaryEmployerName"
              value={insurance.primary?.employerName || ''}
              onChange={(e) =>
                setInsurance({
                  ...insurance,
                  primary: { ...(insurance.primary || {}), employerName: e.target.value },
                })
              }
              placeholder="If employer-sponsored"
            />
          </div>
        </div>
      </div>

      {/* Secondary Insurance */}
      <div className="space-y-4 border-t border-border-primary pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-text-primary">Secondary Insurance</h4>
            <p className="text-sm text-text-secondary mt-1">Optional</p>
          </div>
          {!insurance.secondary && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setInsurance({
                  ...insurance,
                  secondary: {
                    provider: '',
                    policyNumber: '',
                    groupNumber: '',
                    subscriberName: '',
                  },
                })
              }
            >
              Add Secondary Insurance
            </Button>
          )}
        </div>

        {insurance.secondary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="secondaryProvider">Insurance Provider</Label>
              <Input
                id="secondaryProvider"
                value={insurance.secondary.provider}
                onChange={(e) =>
                  setInsurance({
                    ...insurance,
                    secondary: { ...insurance.secondary!, provider: e.target.value },
                  })
                }
                placeholder="Insurance provider"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryPolicyNumber">Policy Number</Label>
              <Input
                id="secondaryPolicyNumber"
                value={insurance.secondary.policyNumber}
                onChange={(e) =>
                  setInsurance({
                    ...insurance,
                    secondary: { ...insurance.secondary!, policyNumber: e.target.value },
                  })
                }
                placeholder="Policy number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryGroupNumber">Group Number</Label>
              <Input
                id="secondaryGroupNumber"
                value={insurance.secondary.groupNumber}
                onChange={(e) =>
                  setInsurance({
                    ...insurance,
                    secondary: { ...insurance.secondary!, groupNumber: e.target.value },
                  })
                }
                placeholder="Group number (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondarySubscriberName">Subscriber Name</Label>
              <Input
                id="secondarySubscriberName"
                value={insurance.secondary.subscriberName}
                onChange={(e) =>
                  setInsurance({
                    ...insurance,
                    secondary: { ...insurance.secondary!, subscriberName: e.target.value },
                  })
                }
                placeholder="Name on insurance card"
              />
            </div>
            <div className="md:col-span-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setInsurance({ ...insurance, secondary: undefined })}
                className="text-status-error hover:text-status-error"
              >
                Remove Secondary Insurance
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving || !isComplete}
          className="bg-zenthea-teal hover:bg-zenthea-teal-600"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Insurance Information
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

