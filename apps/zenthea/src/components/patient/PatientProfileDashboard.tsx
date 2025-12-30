'use client';

import React, { useState } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useMutation } from 'convex/react';
import { Card, CardContent } from '@/components/ui/card';
import { getPatientProfileApi } from '@/lib/convex-api-types';
import { canUseConvexQuery } from '@/lib/convexIdValidation';
import { api } from '../../../convex/_generated/api';
import { toast } from 'sonner';
import { usePatientProfileData } from '@/hooks/usePatientProfileData';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import { PatientDashboardLayout } from './dashboard/PatientDashboardLayout';

export function PatientProfileDashboard() {
  const { data: session } = useZentheaSession();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['demographics']));
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  
  // Fetch patient profile data
  const {
    patientId,
    patientProfile,
    isLoading,
    queriesSkipped,
    patientEmail,
  } = usePatientProfileData();

  // Calculate profile completeness
  const { getSectionCompleteness, sectionsCompleted } = useProfileCompleteness(patientProfile);

  // Setup avatar mutation
  const patientProfileApi = getPatientProfileApi(api) || (api as any).patientProfile;
  const updatePatientAvatarMutation = useMutation(
    (patientProfileApi?.updatePatientAvatar || (api as any).patientProfile?.updatePatientAvatar) as any
  );

  // Handle section expansion
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

  // Handle avatar change
  const handleAvatarChange = async (avatarUrl: string) => {
    if (!patientId) {
      toast.error('Patient profile not found. Please try again.');
      return;
    }

    setIsUpdatingAvatar(true);
    try {
      await updatePatientAvatarMutation({
        patientId,
        avatarUrl,
        userEmail: session?.user?.email,
      });
      toast.success('Profile photo updated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile photo. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  // Handle case where queries are skipped (invalid user ID or missing session)
  if (queriesSkipped) {
    const isDemoMode = session?.user?.id && !canUseConvexQuery(session?.user?.id, session?.user?.tenantId || 'demo-tenant');
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-text-secondary mb-4">
                Unable to load patient profile. Please ensure you are logged in with a valid account.
              </p>
              {!session?.user?.id && (
                <p className="text-sm text-text-tertiary">
                  No user session found. Please log in again.
                </p>
              )}
              {isDemoMode && (
                <div className="text-sm text-text-tertiary mt-2 space-y-2">
                  <p>If you're using demo credentials, ensure demo users are seeded by running:</p>
                  <code className="block bg-surface-elevated px-3 py-2 rounded text-xs mt-2">
                    npm run seed:demo-users
                  </code>
                </div>
              )}
              {session?.user?.id && !isDemoMode && (
                <p className="text-sm text-text-tertiary">
                  Invalid user account. Please contact support.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state - only show if queries are actually running (not skipped)
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

  // No patient found - queries completed but returned null
  if (!patientId || !patientProfile) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-text-secondary mb-4">
                Patient profile not found. Please contact support to set up your profile.
              </p>
              {patientEmail && (
                <p className="text-sm text-text-tertiary">
                  Email: {patientEmail}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <PatientDashboardLayout
      patientId={patientId}
      patientProfile={patientProfile}
      expandedSections={expandedSections}
      onToggleSection={toggleSection}
      getSectionCompleteness={getSectionCompleteness}
      sectionsCompleted={sectionsCompleted}
      onAvatarChange={handleAvatarChange}
      isUpdatingAvatar={isUpdatingAvatar}
      fallbackName={session?.user?.name}
    />
  );
}
