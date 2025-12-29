/**
 * Care Team Hook
 * 
 * React hook for fetching a patient's care team (providers they have appointments with)
 * Includes primary provider information for prominent display
 */

import { useQuery } from 'convex/react';
import { useSession } from 'next-auth/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { canUseConvexQuery } from '@/lib/convexIdValidation';

export interface CareTeamMember {
  id: string;
  providerId: Id<'providers'>;
  providerProfileId?: Id<'providerProfiles'>;
  userId?: Id<'users'>;
  name: string;
  role: string;
  specialty?: string;
  professionalPhotoUrl?: string;
  status: 'available' | 'away' | 'offline';
  isPrimaryProvider?: boolean;
  source?: 'explicit' | 'medical_record' | 'appointment';
}

export interface PrimaryProviderInfo {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

export function useCareTeam() {
  const { data: session } = useSession();
  const tenantId = session?.user?.tenantId || 'demo-tenant';
  const userEmail = session?.user?.email;
  const userRole = session?.user?.role;
  
  // Check if we can use Convex queries
  const canQuery = canUseConvexQuery(session?.user?.id, tenantId);
  
  // Get patient by email
  const patient = useQuery(
    api.patients.getPatientByEmail,
    canQuery && userRole === 'patient' && userEmail && tenantId
      ? { email: userEmail, tenantId }
      : 'skip'
  );
  
  // Get primary provider for the patient
  const primaryProviderResult = useQuery(
    api.careTeam.getPrimaryProvider,
    canQuery && patient?._id && tenantId
      ? { patientId: patient._id as Id<'patients'>, tenantId }
      : 'skip'
  );
  
  // Get full care team from the careTeam module
  const fullCareTeam = useQuery(
    api.careTeam.getCareTeamForPatient,
    canQuery && patient?._id && tenantId
      ? { patientId: patient._id as Id<'patients'>, tenantId }
      : 'skip'
  );
  
  // Fetch patient appointments to get unique providers (fallback/additional source)
  const appointments = useQuery(
    api.appointments.getPatientAppointments,
    canQuery && patient?._id && tenantId
      ? {
          patientId: patient._id as Id<'patients'>,
          tenantId,
          status: undefined, // Get all appointments
        }
      : 'skip'
  );
  
  // Fetch all providers for tenant (we'll filter to care team members)
  const allProviders = useQuery(
    api.providers.getProvidersByTenant,
    canQuery && tenantId
      ? {
          tenantId,
          limit: 100, // Get enough to find care team members
        }
      : 'skip'
  );
  
  // Fetch all published provider profiles
  const allProfiles = useQuery(
    api.providerProfiles.getPublishedProviders,
    canQuery && tenantId
      ? {
          tenantId,
          limit: 100,
        }
      : 'skip'
  );
  
  // Build care team members - prioritize full care team from careTeam module
  const careTeam: CareTeamMember[] = [];
  // Track by PROVIDER ID consistently to avoid duplicates
  // (same provider could appear from fullCareTeam and appointments)
  const addedProviderIds = new Set<string>();
  
  // Create a map of userId -> providerProfile to get providerId and profile data
  const userIdToProviderProfile = new Map<string, { 
    profileId: Id<'providerProfiles'>; 
    providerId: Id<'providers'>; 
    userId: Id<'users'>;
    professionalPhotoUrl?: string;
  }>();
  // Also create reverse map: providerId -> profile data (for appointment-based lookups)
  const providerIdToProfile = new Map<string, { 
    userId: Id<'users'>; 
    profileId: Id<'providerProfiles'>;
    professionalPhotoUrl?: string;
  }>();
  
  if (allProfiles?.providers) {
    allProfiles.providers.forEach(profile => {
      if (profile.userId && profile.providerId) {
        userIdToProviderProfile.set(profile.userId, {
          profileId: profile._id,
          providerId: profile.providerId,
          userId: profile.userId as Id<'users'>,
          professionalPhotoUrl: profile.professionalPhotoUrl,
        });
        // Reverse map for looking up profile data from providerId
        providerIdToProfile.set(profile.providerId, {
          userId: profile.userId as Id<'users'>,
          profileId: profile._id,
          professionalPhotoUrl: profile.professionalPhotoUrl,
        });
      }
    });
  }
  
  // Primary provider info for display
  const primaryProvider: PrimaryProviderInfo | null = primaryProviderResult?.hasProvider && primaryProviderResult.primaryProvider
    ? {
        _id: primaryProviderResult.primaryProvider._id,
        name: primaryProviderResult.primaryProvider.name,
        email: primaryProviderResult.primaryProvider.email,
        role: primaryProviderResult.primaryProvider.role,
        phone: primaryProviderResult.primaryProvider.phone,
      }
    : null;
  
  // First, add members from the full care team (which includes explicit members, medical records, appointments)
  if (fullCareTeam?.members) {
    fullCareTeam.members.forEach((member: { userId: string; name: string; role?: string; careTeamRole?: string; source?: string }) => {
      // Get the actual provider ID from the provider profile
      const providerProfileInfo = userIdToProviderProfile.get(member.userId);
      const actualProviderId = providerProfileInfo?.providerId;
      
      // Skip if we don't have a valid provider ID or if already added
      if (!actualProviderId || addedProviderIds.has(actualProviderId)) {
        return;
      }
      
      // Track by provider ID to prevent duplicates
      addedProviderIds.add(actualProviderId);
      
      // Determine if this member is the primary provider
      const isPrimary = primaryProvider?._id === member.userId;
      
      careTeam.push({
        id: member.userId,
        providerId: actualProviderId, // Use actual provider ID from profile
        providerProfileId: providerProfileInfo.profileId,
        userId: member.userId as Id<'users'>,
        name: member.name,
        role: isPrimary ? 'Primary Provider' : (String(member.careTeamRole || member.role || 'Care Team Member')),
        specialty: String(member.careTeamRole || ''),
        professionalPhotoUrl: providerProfileInfo.professionalPhotoUrl, // Include avatar!
        status: 'available',
        isPrimaryProvider: isPrimary,
        source: ((member as { source?: 'appointment' | 'explicit' | 'medical_record' }).source || 'explicit') as 'appointment' | 'explicit' | 'medical_record',
      });
    });
  }
  
  // Then, add any providers from appointments that aren't already in the care team
  if (appointments && allProviders && allProfiles) {
    const providerMap = new Map(allProviders.map(p => [p._id, p]));
    
    // Get unique providers from appointments (filter out undefined/null)
    const uniqueProviderIds = Array.from(
      new Set(
        appointments
          .map(apt => apt.providerId)
          .filter((id): id is Id<'providers'> => id !== undefined && id !== null)
      )
    );
    
    uniqueProviderIds.forEach(providerId => {
      // Skip if already added from care team (using consistent providerId tracking)
      if (addedProviderIds.has(providerId)) return;
      
      const provider = providerMap.get(providerId);
      if (provider) {
        addedProviderIds.add(providerId);
        
        // Look up profile data from the provider ID map
        const profileInfo = providerIdToProfile.get(providerId);
        
        // Determine role based on specialty or default
        const specialty = provider.specialty || 'General Medicine';
        const role = specialty.includes('Physician') || specialty.includes('Doctor')
          ? 'Primary Care Physician'
          : specialty.includes('Nurse')
          ? 'Nurse Practitioner'
          : specialty;
        
        careTeam.push({
          id: providerId,
          providerId,
          providerProfileId: profileInfo?.profileId,
          userId: profileInfo?.userId,
          name: `${provider.firstName} ${provider.lastName}`,
          role,
          specialty,
          professionalPhotoUrl: profileInfo?.professionalPhotoUrl,
          status: 'available',
          isPrimaryProvider: false,
          source: 'appointment',
        });
      }
    });
  }
  
  // Sort care team: primary provider first, then by source priority
  careTeam.sort((a, b) => {
    // Primary provider always first
    if (a.isPrimaryProvider && !b.isPrimaryProvider) return -1;
    if (!a.isPrimaryProvider && b.isPrimaryProvider) return 1;
    
    // Then by source: explicit > medical_record > appointment
    const sourcePriority = { explicit: 0, medical_record: 1, appointment: 2 };
    const aPriority = sourcePriority[a.source || 'appointment'] ?? 2;
    const bPriority = sourcePriority[b.source || 'appointment'] ?? 2;
    return aPriority - bPriority;
  });
  
  // Loading state
  const isLoading = canQuery && (
    patient === undefined ||
    primaryProviderResult === undefined ||
    fullCareTeam === undefined ||
    appointments === undefined ||
    allProviders === undefined ||
    allProfiles === undefined
  );
  
  return {
    careTeam,
    primaryProvider,
    hasPrimaryProvider: !!primaryProvider,
    isLoading,
  };
}

