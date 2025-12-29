'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ProviderProfile } from '@/types';
import { getDefaultVisibilitySettings } from '@/lib/profileVisibility';
import { convex } from '@/lib/convex';
import { canUseConvexQuery } from '@/lib/convexIdValidation';
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
import { ConvexErrorBoundary } from '@/components/utils/ConvexErrorBoundary';
import { toast } from 'sonner';

interface EnhancedProviderProfileEditorProps {
  profileId?: string;
  onSave?: () => void;
}

/**
 * Enhanced Provider Profile Editor
 * 
 * Refactored to match patient profile UX/UI design pattern.
 * Uses expandable sections instead of wizard navigation.
 * 
 * Features:
 * - 3-column grid layout (sidebar + content)
 * - Expandable ProfileSection components
 * - Profile completeness tracking
 * - Avatar upload integration
 * - Form validation with React Hook Form + Zod
 * 
 * @example
 * ```tsx
 * <EnhancedProviderProfileEditor
 *   profileId="profile-123"
 *   onSave={() => console.log('Saved')}
 * />
 * ```
 */
export function EnhancedProviderProfileEditor({
  profileId,
  onSave
}: EnhancedProviderProfileEditorProps) {
  // Check if Convex is configured
  // Note: Only NEXT_PUBLIC_* env vars are available in client components
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  // Check if convex client exists (it will be null if URL validation failed)
  const isConvexConfigured = !!convex;

  // Debug logging (development only)
  React.useEffect(() => {
    logger.debug('[Convex Debug]', {
      hasConvexClient: !!convex,
      hasConvexUrl: !!convexUrl,
      convexUrl: convexUrl || 'NOT SET',
      isConvexConfigured,
      nodeEnv: process.env.NODE_ENV
    });
  }, [convex, convexUrl, isConvexConfigured]);

  if (!isConvexConfigured) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Your Profile</h1>
          <p className="text-text-secondary">Complete your professional profile to help patients find and connect with you</p>
        </div>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 p-4 bg-status-warning/10 border border-status-warning rounded-md">
                <AlertCircle className="h-5 w-5 text-status-warning" />
                <div>
                  <h3 className="font-semibold text-text-primary mb-1">Convex Not Available</h3>
                  <p className="text-sm text-text-secondary">
                    Convex is required to use the provider profile editor. Please ensure:
                    <br />1. The Convex dev server is running: <code className="bg-surface-elevated px-1 rounded">npx convex dev</code>
                    <br />2. The <code className="bg-surface-elevated px-1 rounded">NEXT_PUBLIC_CONVEX_URL</code> environment variable is set correctly in Vercel.
                    <br />
                    <br />
                    <span className="text-xs text-text-tertiary block mt-2 p-2 bg-surface-elevated rounded">
                      <strong>Debug Info:</strong>
                      <br />• Convex client: {convex ? '✓ Available' : '✗ Not Available'}
                      <br />• NEXT_PUBLIC_CONVEX_URL: {convexUrl ? `✓ Set (${convexUrl.substring(0, 30)}...)` : '✗ NOT SET'}
                      {convexUrl && !convex && (
                        <>
                          <br /><span className="text-status-error">⚠️ URL is set but validation failed. Check browser console (F12) for details.</span>
                        </>
                      )}
                      {!convexUrl && (
                        <>
                          <br /><span className="text-status-error">⚠️ Environment variable is missing. Set NEXT_PUBLIC_CONVEX_URL in Vercel → Settings → Environment Variables</span>
                          <br /><span className="text-status-error">⚠️ Make sure it's set for Preview environment (not just Production)</span>
                        </>
                      )}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    );
  }

  return (
    <ConvexErrorBoundary
      title="Your Profile"
      description="Complete your professional profile to help patients find and connect with you"
    >
      <EnhancedProviderProfileEditorInner profileId={profileId} onSave={onSave} />
    </ConvexErrorBoundary>
  );
}

function EnhancedProviderProfileEditorInner({
  profileId,
  onSave
}: EnhancedProviderProfileEditorProps) {
  const { data: session, update: updateSession } = useSession();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['identity']));
  const profileLoadedRef = useRef(false);

  // Use extracted form hook
  const { handleSubmit, watch, setValue, formState: { errors }, updateField, updateVisibility } = useProviderProfileForm();
  
  // Watch form values - memoize to prevent unnecessary re-renders
  // The completeness calculation is memoized separately, so watching all fields is acceptable
  const formData = watch() as ProviderProfileUpdateData;

  // Check if we can use Convex queries (user ID must be valid Convex ID, not demo ID)
  const canQuery = canUseConvexQuery(session?.user?.id, session?.user?.tenantId);
  
  // Get existing profile
  const existingProfile = useQuery(
    api.providerProfiles.getProviderProfileByUserId,
    canQuery
      ? {
          userId: session!.user!.id as Id<'users'>,
          tenantId: session!.user!.tenantId!
        }
      : 'skip'
  );

  // Get user data (firstName, lastName, phone, dateOfBirth are stored in users table, not providerProfiles)
  const userData = useQuery(
    api.users.getUserById,
    canQuery
      ? { userId: session!.user!.id as Id<'users'> }
      : 'skip'
  );

  // Use extracted save hook
  const { saveProfile, isSaving } = useProviderProfileSave({
    session: session ? {
      user: {
        id: session.user.id!,
        tenantId: session.user.tenantId!,
      },
    } : null,
    existingProfile: existingProfile || null,
    onSave: async () => {
      // Refresh the session to update name across the portal
      if (updateSession) {
        await updateSession();
      }
      // Call the original onSave callback if provided
      onSave?.();
    },
  });

  // Use extracted avatar hook
  const { handleAvatarChange, isUpdatingAvatar } = useProviderAvatar({
    session: session ? {
      user: {
        id: session.user.id!,
        tenantId: session.user.tenantId!,
      },
    } : null,
    existingProfile: existingProfile || null,
  });

  // Only update form data once when profile is loaded
  // Use a ref to track if we've loaded to prevent duplicate updates
  useEffect(() => {
    // existingProfile can be: undefined (loading), null (not found), or object (found)
    // Only initialize when we have a definitive answer (null or object), not while loading (undefined)
    // Also wait for userData to be loaded (not undefined) to get user identity fields
    
    if (existingProfile && userData && !profileLoadedRef.current) {
      // Profile exists - load it into form
      profileLoadedRef.current = true;
      const profileData = existingProfile as Partial<ProviderProfile>;
      
      // Parse name from userData.name or session.user.name as fallback for firstName/lastName
      const nameSource = userData.name || session?.user?.name || '';
      const nameParts = nameSource.split(' ');
      const fallbackFirstName = nameParts[0] || '';
      const fallbackLastName = nameParts.slice(1).join(' ') || '';
      
      
      // Load profile fields
      Object.keys(profileData).forEach((key) => {
        const value = profileData[key as keyof ProviderProfile];
        if (value !== undefined) {
          setValue(key as keyof ProviderProfileUpdateData, value as any, { shouldValidate: false });
        }
      });
      
      // Load user identity fields from users table (firstName, lastName, phone, dateOfBirth, email)
      // These fields are stored in the users table, not providerProfiles
      // Use fallback from name parsing if firstName/lastName not populated
      const firstNameToUse = userData.firstName || fallbackFirstName;
      const lastNameToUse = userData.lastName || fallbackLastName;
      const emailToUse = userData.email || session?.user?.email;
      
      if (firstNameToUse) setValue('firstName', firstNameToUse, { shouldValidate: false });
      if (lastNameToUse) setValue('lastName', lastNameToUse, { shouldValidate: false });
      if (userData.phone) setValue('phone', userData.phone, { shouldValidate: false });
      if (userData.dateOfBirth) setValue('dateOfBirth', userData.dateOfBirth, { shouldValidate: false });
      if (emailToUse) setValue('email', emailToUse, { shouldValidate: false });
      
    } else if (existingProfile === null && userData && !profileLoadedRef.current) {
      // Profile doesn't exist but user does - load user fields
      profileLoadedRef.current = true;
      
      // Parse name from userData.name or session.user.name as fallback for firstName/lastName
      const nameSource = userData.name || session?.user?.name || '';
      const nameParts = nameSource.split(' ');
      const fallbackFirstName = nameParts[0] || '';
      const fallbackLastName = nameParts.slice(1).join(' ') || '';
      
      
      // Use fallback from name parsing if firstName/lastName not populated
      const firstNameToUse = userData.firstName || fallbackFirstName;
      const lastNameToUse = userData.lastName || fallbackLastName;
      const emailToUse = userData.email || session?.user?.email;
      
      if (firstNameToUse) setValue('firstName', firstNameToUse, { shouldValidate: false });
      if (lastNameToUse) setValue('lastName', lastNameToUse, { shouldValidate: false });
      if (userData.phone) setValue('phone', userData.phone, { shouldValidate: false });
      if (userData.dateOfBirth) setValue('dateOfBirth', userData.dateOfBirth, { shouldValidate: false });
      if (emailToUse) setValue('email', emailToUse, { shouldValidate: false });
      
    } else if (existingProfile === null && userData === null && session?.user && !profileLoadedRef.current) {
      // No profile and no user data - fallback to session
      profileLoadedRef.current = true;
      const sessionName = session.user.name || '';
      const nameParts = sessionName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      if (firstName) setValue('firstName', firstName, { shouldValidate: false });
      if (lastName) setValue('lastName', lastName, { shouldValidate: false });
      if (session.user.email) setValue('email', session.user.email, { shouldValidate: false });
    } else if (existingProfile === null && userData === null && !session?.user) {
      // Everything cleared - reset the ref to allow re-initialization
      profileLoadedRef.current = false;
    }
    // If existingProfile is undefined (still loading), do nothing - wait for definitive answer
  }, [existingProfile, userData, setValue, session]);

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

  // Get provider name for avatar
  const getProviderName = () => {
    if (session?.user?.name) {
      return session.user.name;
    }
    if (existingProfile) {
      // Try to get name from user query if available
      return 'Provider';
    }
    return 'Provider';
  };

  const handleSave = handleSubmit(
    (data) => {
      logger.debug('[Profile Form] Submitting form data:', data);
      saveProfile(data);
    },
    (errors) => {
      logger.error('[Profile Form] Validation errors:', errors);
      toast.error('Please fix validation errors before saving', {
        description: Object.keys(errors).length > 0 
          ? `Errors in: ${Object.keys(errors).join(', ')}`
          : 'Please check all required fields',
      });
    }
  );


  // Loading state - wait for both profile and user data
  if (existingProfile === undefined || userData === undefined) {
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

