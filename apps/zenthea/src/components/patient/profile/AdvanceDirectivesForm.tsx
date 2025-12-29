'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation } from 'convex/react';
// Use relative import for Convex generated files (they're at root level, not in src/)
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Save, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface AdvanceDirectivesFormProps {
  patientId: Id<'patients'>;
  initialData?: {
    hasLivingWill?: boolean;
    livingWillDate?: string;
    hasDNR?: boolean;
    dnrDate?: string;
    hasPOLST?: boolean;
    polstDate?: string;
    organDonor?: boolean;
    advanceDirectivesOnFile?: boolean;
    notes?: string;
  };
}

export function AdvanceDirectivesForm({ patientId, initialData }: AdvanceDirectivesFormProps) {
  const { data: session } = useSession();
  const updateProfile = useMutation((api as any).patientProfile?.updatePatientProfile);
  const [isSaving, setIsSaving] = useState(false);

  const [directives, setDirectives] = useState({
    hasLivingWill: initialData?.hasLivingWill || false,
    livingWillDate: initialData?.livingWillDate || '',
    hasDNR: initialData?.hasDNR || false,
    dnrDate: initialData?.dnrDate || '',
    hasPOLST: initialData?.hasPOLST || false,
    polstDate: initialData?.polstDate || '',
    organDonor: initialData?.organDonor || false,
    advanceDirectivesOnFile: initialData?.advanceDirectivesOnFile || false,
    notes: initialData?.notes || '',
  });

  useEffect(() => {
    if (initialData) {
      setDirectives({
        hasLivingWill: initialData.hasLivingWill || false,
        livingWillDate: initialData.livingWillDate || '',
        hasDNR: initialData.hasDNR || false,
        dnrDate: initialData.dnrDate || '',
        hasPOLST: initialData.hasPOLST || false,
        polstDate: initialData.polstDate || '',
        organDonor: initialData.organDonor || false,
        advanceDirectivesOnFile: initialData.advanceDirectivesOnFile || false,
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        patientId,
        section: 'advanceDirectives',
        data: directives,
        userEmail: session?.user?.email,
      });
      toast.success('Advance directives updated', {
        description: 'Your advance directive information has been saved.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save advance directives.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-status-info-bg border border-status-info border-opacity-30 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <FileText className="h-5 w-5 text-status-info mt-0.5" />
          <div>
            <p className="text-sm font-medium text-status-info">
              Important: Advance Care Planning
            </p>
            <p className="text-sm text-text-secondary mt-1">
              Advance directives help ensure your healthcare wishes are known and respected. Consider discussing these with your healthcare provider.
            </p>
          </div>
        </div>
      </div>

      {/* Living Will */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hasLivingWill"
            checked={directives.hasLivingWill}
            onChange={(e) => setDirectives({ ...directives, hasLivingWill: e.target.checked })}
            className="h-4 w-4 bg-surface-elevated text-interactive-primary border-border-primary rounded focus:ring-border-focus"
          />
          <Label htmlFor="hasLivingWill" className="cursor-pointer font-semibold">
            I have a Living Will
          </Label>
        </div>
        {directives.hasLivingWill && (
          <div className="space-y-2 ml-6">
            <Label htmlFor="livingWillDate">Date Signed</Label>
            <Input
              id="livingWillDate"
              type="date"
              value={directives.livingWillDate}
              onChange={(e) => setDirectives({ ...directives, livingWillDate: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* DNR */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hasDNR"
            checked={directives.hasDNR}
            onChange={(e) => setDirectives({ ...directives, hasDNR: e.target.checked })}
            className="h-4 w-4 bg-surface-elevated text-interactive-primary border-border-primary rounded focus:ring-border-focus"
          />
          <Label htmlFor="hasDNR" className="cursor-pointer font-semibold">
            I have a Do-Not-Resuscitate (DNR) Order
          </Label>
        </div>
        {directives.hasDNR && (
          <div className="space-y-2 ml-6">
            <Label htmlFor="dnrDate">Date Signed</Label>
            <Input
              id="dnrDate"
              type="date"
              value={directives.dnrDate}
              onChange={(e) => setDirectives({ ...directives, dnrDate: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* POLST */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hasPOLST"
            checked={directives.hasPOLST}
            onChange={(e) => setDirectives({ ...directives, hasPOLST: e.target.checked })}
            className="h-4 w-4 bg-surface-elevated text-interactive-primary border-border-primary rounded focus:ring-border-focus"
          />
          <Label htmlFor="hasPOLST" className="cursor-pointer font-semibold">
            I have a POLST (Physician Orders for Life-Sustaining Treatment)
          </Label>
        </div>
        {directives.hasPOLST && (
          <div className="space-y-2 ml-6">
            <Label htmlFor="polstDate">Date Signed</Label>
            <Input
              id="polstDate"
              type="date"
              value={directives.polstDate}
              onChange={(e) => setDirectives({ ...directives, polstDate: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* Organ Donor */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="organDonor"
            checked={directives.organDonor}
            onChange={(e) => setDirectives({ ...directives, organDonor: e.target.checked })}
            className="h-4 w-4 bg-surface-elevated text-interactive-primary border-border-primary rounded focus:ring-border-focus"
          />
          <Label htmlFor="organDonor" className="cursor-pointer font-semibold">
            I am an organ donor
          </Label>
        </div>
      </div>

      {/* Documents on File */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="advanceDirectivesOnFile"
            checked={directives.advanceDirectivesOnFile}
            onChange={(e) =>
              setDirectives({ ...directives, advanceDirectivesOnFile: e.target.checked })
            }
            className="h-4 w-4 bg-surface-elevated text-interactive-primary border-border-primary rounded focus:ring-border-focus"
          />
          <Label htmlFor="advanceDirectivesOnFile" className="cursor-pointer">
            Advance directive documents are on file with this healthcare organization
          </Label>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="directivesNotes">Additional Notes</Label>
        <Textarea
          id="directivesNotes"
          value={directives.notes}
          onChange={(e) => setDirectives({ ...directives, notes: e.target.value })}
          className="min-h-[100px]"
          placeholder="Any additional information about your advance directives..."
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
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
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

