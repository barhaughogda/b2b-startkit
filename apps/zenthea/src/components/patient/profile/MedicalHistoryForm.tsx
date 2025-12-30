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
import { Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface MedicalHistoryFormProps {
  patientId: Id<'patients'>;
  initialData?: {
    chronicConditions?: Array<{
      condition: string;
      diagnosisDate: string;
      status: string;
      notes?: string;
    }>;
    surgeries?: Array<{
      procedure: string;
      date: string;
      hospital?: string;
      notes?: string;
    }>;
    hospitalizations?: Array<{
      reason: string;
      admissionDate: string;
      dischargeDate: string;
      hospital?: string;
      notes?: string;
    }>;
  };
}

export function MedicalHistoryForm({ patientId, initialData }: MedicalHistoryFormProps) {
  const { data: session } = useZentheaSession();
  const updateProfile = useMutation((api as any).patientProfile?.updatePatientProfile);
  const [isSaving, setIsSaving] = useState(false);

  const [medicalHistory, setMedicalHistory] = useState({
    chronicConditions: initialData?.chronicConditions || [],
    surgeries: initialData?.surgeries || [],
    hospitalizations: initialData?.hospitalizations || [],
  });

  useEffect(() => {
    if (initialData) {
      setMedicalHistory({
        chronicConditions: initialData.chronicConditions || [],
        surgeries: initialData.surgeries || [],
        hospitalizations: initialData.hospitalizations || [],
      });
    }
  }, [initialData]);

  const addChronicCondition = () => {
    setMedicalHistory((prev) => ({
      ...prev,
      chronicConditions: [
        ...prev.chronicConditions,
        { condition: '', diagnosisDate: '', status: 'active', notes: '' },
      ],
    }));
  };

  const updateChronicCondition = (index: number, field: string, value: string) => {
    setMedicalHistory((prev) => ({
      ...prev,
      chronicConditions: prev.chronicConditions.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeChronicCondition = (index: number) => {
    setMedicalHistory((prev) => ({
      ...prev,
      chronicConditions: prev.chronicConditions.filter((_, i) => i !== index),
    }));
  };

  const addSurgery = () => {
    setMedicalHistory((prev) => ({
      ...prev,
      surgeries: [...prev.surgeries, { procedure: '', date: '', hospital: '', notes: '' }],
    }));
  };

  const updateSurgery = (index: number, field: string, value: string) => {
    setMedicalHistory((prev) => ({
      ...prev,
      surgeries: prev.surgeries.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeSurgery = (index: number) => {
    setMedicalHistory((prev) => ({
      ...prev,
      surgeries: prev.surgeries.filter((_, i) => i !== index),
    }));
  };

  const addHospitalization = () => {
    setMedicalHistory((prev) => ({
      ...prev,
      hospitalizations: [
        ...prev.hospitalizations,
        { reason: '', admissionDate: '', dischargeDate: '', hospital: '', notes: '' },
      ],
    }));
  };

  const updateHospitalization = (index: number, field: string, value: string) => {
    setMedicalHistory((prev) => ({
      ...prev,
      hospitalizations: prev.hospitalizations.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeHospitalization = (index: number) => {
    setMedicalHistory((prev) => ({
      ...prev,
      hospitalizations: prev.hospitalizations.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        patientId,
        section: 'medicalHistory',
        data: medicalHistory,
        userEmail: session?.user?.email,
      });
      toast.success('Medical history updated', {
        description: 'Your medical history has been saved.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save medical history.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Chronic Conditions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text-primary">Chronic Conditions</h4>
          <Button type="button" variant="outline" size="sm" onClick={addChronicCondition}>
            <Plus className="h-4 w-4 mr-2" />
            Add Condition
          </Button>
        </div>
        {medicalHistory.chronicConditions.map((condition, index) => (
          <div key={index} className="p-4 border border-border-primary rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Condition</Label>
                <Input
                  value={condition.condition}
                  onChange={(e) => updateChronicCondition(index, 'condition', e.target.value)}
                  placeholder="e.g., Hypertension"
                />
              </div>
              <div className="space-y-2">
                <Label>Diagnosis Date</Label>
                <Input
                  type="date"
                  value={condition.diagnosisDate}
                  onChange={(e) => updateChronicCondition(index, 'diagnosisDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={condition.status}
                  onChange={(e) => updateChronicCondition(index, 'status', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border-primary bg-background px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                  <option value="in-remission">In Remission</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={condition.notes || ''}
                onChange={(e) => updateChronicCondition(index, 'notes', e.target.value)}
                placeholder="Additional notes (optional)"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeChronicCondition(index)}
              className="text-status-error hover:text-status-error"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        ))}
      </div>

      {/* Surgeries */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text-primary">Surgeries</h4>
          <Button type="button" variant="outline" size="sm" onClick={addSurgery}>
            <Plus className="h-4 w-4 mr-2" />
            Add Surgery
          </Button>
        </div>
        {medicalHistory.surgeries.map((surgery, index) => (
          <div key={index} className="p-4 border border-border-primary rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Procedure</Label>
                <Input
                  value={surgery.procedure}
                  onChange={(e) => updateSurgery(index, 'procedure', e.target.value)}
                  placeholder="e.g., Appendectomy"
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={surgery.date}
                  onChange={(e) => updateSurgery(index, 'date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hospital</Label>
                <Input
                  value={surgery.hospital || ''}
                  onChange={(e) => updateSurgery(index, 'hospital', e.target.value)}
                  placeholder="Hospital name (optional)"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={surgery.notes || ''}
                onChange={(e) => updateSurgery(index, 'notes', e.target.value)}
                placeholder="Additional notes (optional)"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeSurgery(index)}
              className="text-status-error hover:text-status-error"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        ))}
      </div>

      {/* Hospitalizations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text-primary">Hospitalizations</h4>
          <Button type="button" variant="outline" size="sm" onClick={addHospitalization}>
            <Plus className="h-4 w-4 mr-2" />
            Add Hospitalization
          </Button>
        </div>
        {medicalHistory.hospitalizations.map((hosp, index) => (
          <div key={index} className="p-4 border border-border-primary rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  value={hosp.reason}
                  onChange={(e) => updateHospitalization(index, 'reason', e.target.value)}
                  placeholder="Reason for hospitalization"
                />
              </div>
              <div className="space-y-2">
                <Label>Admission Date</Label>
                <Input
                  type="date"
                  value={hosp.admissionDate}
                  onChange={(e) => updateHospitalization(index, 'admissionDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Discharge Date</Label>
                <Input
                  type="date"
                  value={hosp.dischargeDate}
                  onChange={(e) => updateHospitalization(index, 'dischargeDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hospital</Label>
                <Input
                  value={hosp.hospital || ''}
                  onChange={(e) => updateHospitalization(index, 'hospital', e.target.value)}
                  placeholder="Hospital name (optional)"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={hosp.notes || ''}
                onChange={(e) => updateHospitalization(index, 'notes', e.target.value)}
                placeholder="Additional notes (optional)"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeHospitalization(index)}
              className="text-status-error hover:text-status-error"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        ))}
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

