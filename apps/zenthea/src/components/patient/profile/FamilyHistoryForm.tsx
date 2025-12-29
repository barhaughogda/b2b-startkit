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
import { Save, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface FamilyHistoryFormProps {
  patientId: Id<'patients'>;
  initialData?: Array<{
    relationship: string;
    condition: string;
    ageAtDiagnosis?: number;
    currentAge?: number;
    deceased: boolean;
    notes?: string;
  }>;
}

export function FamilyHistoryForm({ patientId, initialData }: FamilyHistoryFormProps) {
  const { data: session } = useSession();
  const addFamilyHistory = useMutation((api as any).patientProfile?.addFamilyHistory);
  const removeFamilyHistory = useMutation((api as any).patientProfile?.removeFamilyHistory);
  const [isSaving, setIsSaving] = useState(false);

  const [familyHistory, setFamilyHistory] = useState(initialData || []);

  useEffect(() => {
    if (initialData) {
      setFamilyHistory(initialData);
    }
  }, [initialData]);

  const handleAddEntry = async () => {
    try {
      await addFamilyHistory({
        patientId,
        entry: {
          relationship: '',
          condition: '',
          ageAtDiagnosis: undefined,
          currentAge: undefined,
          deceased: false,
          notes: '',
        },
        userEmail: session?.user?.email,
      });
      toast.success('Family history entry added', {
        description: 'Please fill in the details.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to add entry.',
      });
    }
  };

  const handleRemoveEntry = async (index: number) => {
    try {
      await removeFamilyHistory({
        patientId,
        index,
        userEmail: session?.user?.email,
      });
      toast.success('Entry removed', {
        description: 'The family history entry has been removed.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to remove entry.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-text-primary">Family Medical History</h4>
          <p className="text-sm text-text-secondary mt-1">
            Medical conditions affecting your family members
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAddEntry}>
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
      </div>

      {familyHistory.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border-primary rounded-lg">
          <Users className="h-12 w-12 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No family history recorded</p>
        </div>
      ) : (
        <div className="space-y-4">
          {familyHistory.map((entry, index) => (
            <div key={index} className="p-4 border border-border-primary rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Input
                    value={entry.relationship}
                    placeholder="e.g., Mother, Father, Sibling"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Input
                    value={entry.condition}
                    placeholder="e.g., Diabetes, Heart Disease"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Age at Diagnosis</Label>
                  <Input
                    type="number"
                    value={entry.ageAtDiagnosis || ''}
                    placeholder="Age"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Age</Label>
                  <Input
                    type="number"
                    value={entry.currentAge || ''}
                    placeholder="Current age"
                    disabled
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={entry.deceased}
                      disabled
                      className="h-4 w-4 bg-surface-elevated text-interactive-primary border-border-primary rounded focus:ring-border-focus"
                    />
                    <Label>Deceased</Label>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Input
                    value={entry.notes || ''}
                    placeholder="Additional notes (optional)"
                    disabled
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveEntry(index)}
                className="text-status-error hover:text-status-error"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Entry
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-status-info-bg border border-status-info border-opacity-30 rounded-lg p-4">
        <p className="text-sm text-text-secondary">
          <strong>Note:</strong> Family history helps identify genetic risk factors. Include conditions affecting parents, siblings, grandparents, aunts, uncles, and cousins.
        </p>
      </div>
    </div>
  );
}

