'use client';

import React, { useState, useEffect } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation } from 'convex/react';
// Use relative import for Convex generated files (they're at root level, not in src/)
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MedicalBioFormProps {
  patientId: Id<'patients'>;
  initialData?: string;
}

export function MedicalBioForm({ patientId, initialData }: MedicalBioFormProps) {
  const { data: session } = useZentheaSession();
  const updateProfile = useMutation((api as any).patientProfile?.updatePatientProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [medicalBio, setMedicalBio] = useState(initialData || '');

  useEffect(() => {
    if (initialData !== undefined) {
      setMedicalBio(initialData);
    }
  }, [initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        patientId,
        section: 'medicalBio',
        data: medicalBio,
        userEmail: session?.user?.email,
      });
      toast.success('Medical biography updated', {
        description: 'Your medical biography has been saved.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save medical biography.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="medicalBio">Your Medical Story</Label>
        <p className="text-sm text-text-secondary mt-1 mb-3">
          Share your medical story, concerns, or any information you think is important for your
          healthcare providers to know.
        </p>
        <Textarea
          id="medicalBio"
          value={medicalBio}
          onChange={(e) => setMedicalBio(e.target.value)}
          className="min-h-[200px]"
          placeholder="Tell your healthcare providers about your medical history, concerns, or anything else you think is important..."
          aria-describedby="medicalBio-description"
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

