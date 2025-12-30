'use client';

import React, { useState, useEffect } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation } from 'convex/react';
// Use relative import for Convex generated files (they're at root level, not in src/)
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Save, Loader2, Plus, Trash2, Pill } from 'lucide-react';
import { toast } from 'sonner';

interface MedicationsFormProps {
  patientId: Id<'patients'>;
  initialData?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    route: string;
    prescribedBy?: string;
    startDate: string;
    indication?: string;
    notes?: string;
  }>;
}

export function MedicationsForm({ patientId, initialData }: MedicationsFormProps) {
  const { data: session } = useZentheaSession();
  const addMedication = useMutation((api as any).patientProfile?.addMedication);
  const removeMedication = useMutation((api as any).patientProfile?.removeMedication);
  const [isSaving, setIsSaving] = useState(false);

  const [medications, setMedications] = useState(initialData || []);

  useEffect(() => {
    if (initialData) {
      setMedications(initialData);
    }
  }, [initialData]);

  const handleAddMedication = async () => {
    const newMedication = {
      name: '',
      dosage: '',
      frequency: '',
      route: 'oral',
      startDate: new Date().toISOString().split('T')[0]!,
      indication: '',
      notes: '',
    };

    try {
      await addMedication({
        patientId,
        medication: newMedication,
        userEmail: session?.user?.email,
      });
      toast.success('Medication added', {
        description: 'Please fill in the medication details.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to add medication.',
      });
    }
  };

  const handleRemoveMedication = async (index: number) => {
    try {
      await removeMedication({
        patientId,
        index,
        userEmail: session?.user?.email,
      });
      toast.success('Medication removed', {
        description: 'The medication has been removed from your profile.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to remove medication.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-text-primary">Current Medications</h4>
          <p className="text-sm text-text-secondary mt-1">
            Include all prescription medications, over-the-counter drugs, vitamins, and supplements
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAddMedication}>
          <Plus className="h-4 w-4 mr-2" />
          Add Medication
        </Button>
      </div>

      {medications.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border-primary rounded-lg">
          <Pill className="h-12 w-12 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No medications recorded</p>
        </div>
      ) : (
        <div className="space-y-4">
          {medications.map((medication, index) => (
            <div key={index} className="p-4 border border-border-primary rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Medication Name *</Label>
                  <Input
                    value={medication.name}
                    placeholder="e.g., Metformin"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dosage *</Label>
                  <Input
                    value={medication.dosage}
                    placeholder="e.g., 500mg"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency *</Label>
                  <Input
                    value={medication.frequency}
                    placeholder="e.g., Twice daily"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Route</Label>
                  <select
                    value={medication.route}
                    disabled
                    className="flex h-10 w-full rounded-md border border-border-primary bg-background px-3 py-2 text-sm"
                  >
                    <option value="oral">Oral</option>
                    <option value="topical">Topical</option>
                    <option value="injection">Injection</option>
                    <option value="inhalation">Inhalation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Prescribed By</Label>
                  <Input
                    value={medication.prescribedBy || ''}
                    placeholder="Doctor's name"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={medication.startDate}
                    disabled
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Indication</Label>
                  <Input
                    value={medication.indication || ''}
                    placeholder="What is this medication for?"
                    disabled
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Input
                    value={medication.notes || ''}
                    placeholder="Additional notes (optional)"
                    disabled
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveMedication(index)}
                className="text-status-error hover:text-status-error"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Medication
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-status-info-bg border border-status-info border-opacity-30 rounded-lg p-4">
        <p className="text-sm text-text-secondary">
          <strong>Note:</strong> To add or update medications, please contact your healthcare provider or use the medication management feature.
        </p>
      </div>
    </div>
  );
}

