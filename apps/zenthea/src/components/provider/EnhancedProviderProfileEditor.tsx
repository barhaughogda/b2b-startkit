'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { ProviderProfile } from '@/types';
import { useProviderProfile } from '@/hooks/useProviderProfile';
import { useProviderProfileForm } from '@/hooks/useProviderProfileForm';
import { useProviderProfileSave } from '@/hooks/useProviderProfileSave';
import { useProviderSectionCompleteness } from '@/hooks/useProviderSectionCompleteness';
import { useProviderAvatar } from '@/hooks/useProviderAvatar';
import { ProviderIdentitySection } from '@/components/provider/profile/sections/ProviderIdentitySection';
import { ProviderCredentialsSection } from '@/components/provider/profile/sections/ProviderCredentialsSection';
import { ProviderPersonalContentSection } from '@/components/provider/profile/sections/ProviderPersonalContentSection';
import { ProviderPracticeDetailsSection } from '@/components/provider/profile/sections/ProviderPracticeDetailsSection';
import { ProviderVisibilitySettingsSection } from '@/components/provider/profile/sections/ProviderVisibilitySettingsSection';
import { ProviderMultimediaSection } from '@/components/provider/profile/sections/ProviderMultimediaSection';
import { ProviderSchedulingPreferencesSection } from '@/components/provider/profile/sections/ProviderSchedulingPreferencesSection';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { Card, CardContent } from '@/components/ui/card';
import {
  Save,
  AlertCircle,
  Camera,
  FileText,
  Award,
  Building2,
  Heart,
  Lock,
  Clock,
} from 'lucide-react';
import { ProfileSection } from '@/components/patient/profile/ProfileSection';
import { ProviderProfileCompletenessIndicator, ALL_SECTIONS as PROVIDER_SECTIONS } from './ProviderProfileCompletenessIndicator';
import { PatientAvatarUpload } from '@/components/patient/PatientAvatarUpload';
import { toast } from 'sonner';

interface EnhancedProviderProfileEditorProps {
  profileId?: string;
  onSave?: () => void;
}

/**
 * Enhanced Provider Profile Editor
 */
export function EnhancedProviderProfileEditor({
  profileId,
  onSave
}: EnhancedProviderProfileEditorProps) {
  const { data: session, update: updateSession } = useZentheaSession();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['identity']));
  const profileLoadedRef = useRef(false);

  // Get profile using refactored hook
  const { profile: existingProfile, isLoading } = useProviderProfile(profileId);

  // Use extracted form hook
  const { handleSubmit, watch, setValue, formState: { errors }, updateField, updateVisibility } = useProviderProfileForm();
  
  // Watch form values
  const formData = watch() as ProviderProfileUpdateData;

  // Use extracted save hook
  const { saveProfile, isSaving } = useProviderProfileSave({
    session: session ? {
      user: {
        id: session.user.id!,
        tenantId: session.user.tenantId || '',
      },
    } : null,
    existingProfile: (existingProfile as any) || null,
    onSave: async () => {
      if (updateSession) {
        await updateSession();
      }
      onSave?.();
    },
  });

  // Use extracted avatar hook
  const { handleAvatarChange, isUpdatingAvatar } = useProviderAvatar({
    session: session ? {
      user: {
        id: session.user.id!,
        tenantId: session.user.tenantId || '',
      },
    } : null,
    existingProfile: (existingProfile as any) || null,
  });

  // Load profile data into form once it's loaded
  useEffect(() => {
    if (existingProfile && !profileLoadedRef.current) {
      profileLoadedRef.current = true;
      Object.keys(existingProfile).forEach((key) => {
        const value = (existingProfile as any)[key];
        if (value !== undefined) {
          setValue(key as keyof ProviderProfileUpdateData, value as any, { shouldValidate: false });
        }
      });
      
      // Load name from session as fallback
      if (session?.user?.name) {
        const nameParts = session.user.name.split(' ');
        if (!watch('firstName')) setValue('firstName', nameParts[0] || '', { shouldValidate: false });
        if (!watch('lastName')) setValue('lastName', nameParts.slice(1).join(' ') || '', { shouldValidate: false });
      }
      if (session?.user?.email && !watch('email')) {
        setValue('email', session.user.email, { shouldValidate: false });
      }
    }
  }, [existingProfile, setValue, session, watch]);

  // Use extracted section completeness hook
  const { sectionsCompleted, getSectionCompleteness } = useProviderSectionCompleteness(formData);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const getProviderName = () => session?.user?.name || 'Provider';

  const handleSave = handleSubmit(
    (data) => {
      saveProfile(data);
    },
    (errors) => {
      logger.error('[Profile Form] Validation errors:', errors);
      toast.error('Please fix validation errors before saving');
    }
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zenthea-teal mx-auto"></div>
              <p className="mt-2 text-text-secondary">Loading profile...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 p-4 bg-status-warning/10 border border-status-warning rounded-md">
              <AlertCircle className="h-5 w-5 text-status-warning" />
              <div>
                <h3 className="font-semibold text-text-primary mb-1">Not Authenticated</h3>
                <p className="text-sm text-text-secondary">Please sign in to view your profile.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary">Your Profile</h1>
          <p className="text-text-secondary mt-1">
            Complete your professional profile to help patients find and connect with you
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Avatar and Completeness */}
          <div className="lg:col-span-1 space-y-6">
            {/* Avatar Card */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <PatientAvatarUpload
                    currentAvatar={formData.professionalPhotoUrl || existingProfile?.professionalPhotoUrl}
                    patientName={getProviderName()}
                    onAvatarChange={handleAvatarChange}
                    disabled={isUpdatingAvatar}
                  />
                </div>
                <h3 className="font-semibold text-lg text-text-primary">
                  {getProviderName()}
                </h3>
                {session?.user?.email && (
                  <p className="text-sm text-text-secondary mt-2">{session.user.email}</p>
                )}
              </CardContent>
            </Card>

            {/* Profile Completeness Indicator */}
            <ProviderProfileCompletenessIndicator
              sectionsCompleted={sectionsCompleted}
              totalSections={PROVIDER_SECTIONS.length}
            />

            {/* Save Button */}
            <Card>
              <CardContent className="p-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Expandable Sections */}
          <div className="lg:col-span-2 space-y-4">
            {/* Identity */}
            <ProfileSection
              title="Identity & Basic Information"
              icon={FileText}
              isExpanded={expandedSections.has('identity')}
              onToggle={() => toggleSection('identity')}
              isComplete={getSectionCompleteness('identity')}
            >
              <ProviderIdentitySection formData={formData} updateField={updateField} errors={errors} />
            </ProfileSection>

            {/* Credentials */}
            <ProfileSection
              title="Credentials & Qualifications"
              icon={Award}
              isExpanded={expandedSections.has('credentials')}
              onToggle={() => toggleSection('credentials')}
              isComplete={getSectionCompleteness('credentials')}
            >
              <ProviderCredentialsSection formData={formData} updateField={updateField} errors={errors} />
            </ProfileSection>

            {/* Personal */}
            <ProfileSection
              title="Personal Story & Philosophy"
              icon={Heart}
              isExpanded={expandedSections.has('personal')}
              onToggle={() => toggleSection('personal')}
              isComplete={getSectionCompleteness('personal')}
            >
              <ProviderPersonalContentSection formData={formData} updateField={updateField} errors={errors} />
            </ProfileSection>

            {/* Practice */}
            <ProfileSection
              title="Practice Details"
              icon={Building2}
              isExpanded={expandedSections.has('practice')}
              onToggle={() => toggleSection('practice')}
              isComplete={getSectionCompleteness('practice')}
            >
              <ProviderPracticeDetailsSection formData={formData} updateField={updateField} errors={errors} />
            </ProfileSection>

            {/* Scheduling Preferences */}
            <ProfileSection
              title="Scheduling Preferences"
              icon={Clock}
              isExpanded={expandedSections.has('scheduling')}
              onToggle={() => toggleSection('scheduling')}
            >
              <ProviderSchedulingPreferencesSection />
            </ProfileSection>

            {/* Multimedia */}
            <ProfileSection
              title="Multimedia"
              icon={Camera}
              isExpanded={expandedSections.has('multimedia')}
              onToggle={() => toggleSection('multimedia')}
              isComplete={getSectionCompleteness('multimedia')}
            >
              <ProviderMultimediaSection formData={formData} updateField={updateField} errors={errors} />
            </ProfileSection>

            {/* Privacy */}
            <ProfileSection
              title="Privacy Settings"
              icon={Lock}
              isExpanded={expandedSections.has('privacy')}
              onToggle={() => toggleSection('privacy')}
              isComplete={getSectionCompleteness('privacy')}
            >
              <ProviderVisibilitySettingsSection formData={formData} updateVisibility={updateVisibility} errors={errors} />
            </ProfileSection>
          </div>
        </div>
      </div>
    </div>
  );
}
