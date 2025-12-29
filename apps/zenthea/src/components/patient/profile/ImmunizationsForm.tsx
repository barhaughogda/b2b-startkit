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
import { Save, Loader2, Plus, Trash2, Syringe } from 'lucide-react';
import { toast } from 'sonner';

interface ImmunizationsFormProps {
  patientId: Id<'patients'>;
  initialData?: Array<{
    vaccine: string;
    dateAdministered: string;
    lotNumber?: string;
    administeredBy?: string;
    location?: string;
    notes?: string;
  }>;
}

export function ImmunizationsForm({ patientId, initialData }: ImmunizationsFormProps) {
  const { data: session } = useSession();
  const addImmunization = useMutation((api as any).patientProfile?.addImmunization);
  const removeImmunization = useMutation((api as any).patientProfile?.removeImmunization);
  const updateProfile = useMutation((api as any).patientProfile?.updatePatientProfile);
  const [isSaving, setIsSaving] = useState<Record<number, boolean>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [immunizations, setImmunizations] = useState(initialData || []);

  useEffect(() => {
    if (initialData) {
      setImmunizations(initialData);
    }
  }, [initialData]);

  const handleAddImmunization = async () => {
    try {
      await addImmunization({
        patientId,
        immunization: {
          vaccine: '',
          dateAdministered: new Date().toISOString().split('T')[0],
          lotNumber: '',
          administeredBy: '',
          location: '',
          notes: '',
        },
        userEmail: session?.user?.email,
      });
      toast.success('Immunization added', {
        description: 'Please fill in the immunization details.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to add immunization.',
      });
    }
  };

  const handleRemoveImmunization = async (index: number) => {
    try {
      await removeImmunization({
        patientId,
        index,
        userEmail: session?.user?.email,
      });
      toast.success('Immunization removed', {
        description: 'The immunization has been removed.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to remove immunization.',
      });
    }
  };

  const handleUpdateImmunization = async (index: number) => {
    setIsSaving(prev => ({ ...prev, [index]: true }));
    try {
      const updatedImmunizations = [...immunizations];
      await updateProfile({
        patientId,
        section: 'immunizations',
        data: updatedImmunizations,
        userEmail: session?.user?.email,
      });
      setEditingIndex(null);
      toast.success('Immunization updated', {
        description: 'The immunization has been saved.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to update immunization.',
      });
    } finally {
      setIsSaving(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleFieldChange = (index: number, field: string, value: string) => {
    const updated = [...immunizations];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setImmunizations(updated);
    if (editingIndex !== index) {
      setEditingIndex(index);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-text-primary">Immunization Records</h4>
          <p className="text-sm text-text-secondary mt-1">
            Track your vaccination history
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAddImmunization}>
          <Plus className="h-4 w-4 mr-2" />
          Add Immunization
        </Button>
      </div>

      {immunizations.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border-primary rounded-lg">
          <Syringe className="h-12 w-12 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No immunizations recorded</p>
        </div>
      ) : (
        <div className="space-y-4">
          {immunizations.map((immunization, index) => (
            <div key={index} className="p-4 border border-border-primary rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Vaccine Name</Label>
                  <Input
                    value={immunization.vaccine}
                    onChange={(e) => handleFieldChange(index, 'vaccine', e.target.value)}
                    placeholder="e.g., COVID-19, Flu, Tetanus"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date Administered</Label>
                  <Input
                    type="date"
                    value={immunization.dateAdministered}
                    onChange={(e) => handleFieldChange(index, 'dateAdministered', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lot Number</Label>
                  <Input
                    value={immunization.lotNumber || ''}
                    onChange={(e) => handleFieldChange(index, 'lotNumber', e.target.value)}
                    placeholder="Lot number (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Administered By</Label>
                  <Input
                    value={immunization.administeredBy || ''}
                    onChange={(e) => handleFieldChange(index, 'administeredBy', e.target.value)}
                    placeholder="Provider or facility name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={immunization.location || ''}
                    onChange={(e) => handleFieldChange(index, 'location', e.target.value)}
                    placeholder="Location (optional)"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Input
                    value={immunization.notes || ''}
                    onChange={(e) => handleFieldChange(index, 'notes', e.target.value)}
                    placeholder="Additional notes (optional)"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveImmunization(index)}
                  className="text-status-error hover:text-status-error"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Immunization
                </Button>
                {editingIndex === index && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => handleUpdateImmunization(index)}
                    disabled={isSaving[index]}
                    className="bg-zenthea-teal hover:bg-zenthea-teal-600"
                  >
                    {isSaving[index] ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

