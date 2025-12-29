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
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DemographicsFormProps {
  patientId: Id<'patients'>;
  initialData?: {
    preferredName?: string;
    gender?: string;
    genderIdentity?: string;
    preferredPronouns?: string;
    maritalStatus?: string;
    occupation?: string;
    primaryLanguage?: string;
    race?: string;
    ethnicity?: string;
    cellPhone?: string;
    workPhone?: string;
  };
}

export function DemographicsForm({ patientId, initialData }: DemographicsFormProps) {
  const { data: session } = useSession();
  const updateProfile = useMutation((api as any).patientProfile?.updatePatientProfile);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    preferredName: initialData?.preferredName || '',
    gender: initialData?.gender || '',
    genderIdentity: initialData?.genderIdentity || '',
    preferredPronouns: initialData?.preferredPronouns || '',
    maritalStatus: initialData?.maritalStatus || '',
    occupation: initialData?.occupation || '',
    primaryLanguage: initialData?.primaryLanguage || '',
    race: initialData?.race || '',
    ethnicity: initialData?.ethnicity || '',
    cellPhone: initialData?.cellPhone || '',
    workPhone: initialData?.workPhone || '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        preferredName: initialData.preferredName || '',
        gender: initialData.gender || '',
        genderIdentity: initialData.genderIdentity || '',
        preferredPronouns: initialData.preferredPronouns || '',
        maritalStatus: initialData.maritalStatus || '',
        occupation: initialData.occupation || '',
        primaryLanguage: initialData.primaryLanguage || '',
        race: initialData.race || '',
        ethnicity: initialData.ethnicity || '',
        cellPhone: initialData.cellPhone || '',
        workPhone: initialData.workPhone || '',
      });
    }
  }, [initialData]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        patientId,
        section: 'demographics',
        data: formData,
        userEmail: session?.user?.email,
      });
      toast.success('Profile updated', {
        description: 'Your demographics information has been saved.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save demographics.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isComplete = formData.gender && formData.primaryLanguage;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="preferredName">Preferred Name</Label>
          <Input
            id="preferredName"
            value={formData.preferredName}
            onChange={(e) => handleChange('preferredName', e.target.value)}
            placeholder="How you'd like to be addressed"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Biological Sex</Label>
          <select
            id="gender"
            value={formData.gender}
            onChange={(e) => handleChange('gender', e.target.value)}
            className="flex h-10 w-full rounded-md border border-border-primary bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="genderIdentity">Gender Identity</Label>
          <Input
            id="genderIdentity"
            value={formData.genderIdentity}
            onChange={(e) => handleChange('genderIdentity', e.target.value)}
            placeholder="e.g., Non-binary, Transgender"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferredPronouns">Preferred Pronouns</Label>
          <Input
            id="preferredPronouns"
            value={formData.preferredPronouns}
            onChange={(e) => handleChange('preferredPronouns', e.target.value)}
            placeholder="e.g., They/Them, She/Her, He/Him"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maritalStatus">Marital Status</Label>
          <select
            id="maritalStatus"
            value={formData.maritalStatus}
            onChange={(e) => handleChange('maritalStatus', e.target.value)}
            className="flex h-10 w-full rounded-md border border-border-primary bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select...</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
            <option value="domestic-partnership">Domestic Partnership</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="occupation">Occupation</Label>
          <Input
            id="occupation"
            value={formData.occupation}
            onChange={(e) => handleChange('occupation', e.target.value)}
            placeholder="Your current occupation"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="primaryLanguage">Primary Language *</Label>
          <select
            id="primaryLanguage"
            value={formData.primaryLanguage}
            onChange={(e) => handleChange('primaryLanguage', e.target.value)}
            className="flex h-10 w-full rounded-md border border-border-primary bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            <option value="">Select...</option>
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="zh">Chinese</option>
            <option value="fr">French</option>
            <option value="ar">Arabic</option>
            <option value="hi">Hindi</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="race">Race</Label>
          <Input
            id="race"
            value={formData.race}
            onChange={(e) => handleChange('race', e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ethnicity">Ethnicity</Label>
          <Input
            id="ethnicity"
            value={formData.ethnicity}
            onChange={(e) => handleChange('ethnicity', e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cellPhone">Cell Phone</Label>
          <Input
            id="cellPhone"
            type="tel"
            value={formData.cellPhone}
            onChange={(e) => handleChange('cellPhone', e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="workPhone">Work Phone</Label>
          <Input
            id="workPhone"
            type="tel"
            value={formData.workPhone}
            onChange={(e) => handleChange('workPhone', e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
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
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

