import { useSession } from 'next-auth/react';
import { useQuery } from 'convex/react';
import { Id } from '../../convex/_generated/dataModel';
import { canUseConvexQuery, isValidConvexIdForTable } from '@/lib/convexIdValidation';
import { getPatientProfileApi } from '@/lib/convex-api-types';
import { api } from '../../convex/_generated/api';

export interface UsePatientProfileDataReturn {
  patientId: Id<'patients'> | null | undefined;
  patientProfile: any | null | undefined;
  isLoading: boolean;
  queriesSkipped: boolean;
  patientEmail: string;
  tenantId: string;
}

/**
 * Hook to fetch patient profile data from Convex
 * Handles patient ID lookup by email and profile retrieval
 */
export function usePatientProfileData(): UsePatientProfileDataReturn {
  const { data: session } = useSession();
  
  // Safely access patientProfile API (may not be in generated types if codegen was skipped)
  const patientProfileApi = getPatientProfileApi(api) || (api as any).patientProfile;
  
  // Extract email and tenantId from session
  const patientEmail = session?.user?.email?.trim() || '';
  const tenantId = session?.user?.tenantId?.trim() || 'demo-tenant';
  
  // Only query if we have a valid email and tenantId with valid Convex user ID
  const canQueryByEmail = canUseConvexQuery(session?.user?.id, tenantId);
  
  // Track if query is actually being executed (not skipped)
  const queryArgs = canQueryByEmail && patientEmail && patientEmail.length > 0 
    ? { email: patientEmail, tenantId } 
    : 'skip';
  
  // Find patient by email
  const foundPatientId = useQuery(
    (patientProfileApi?.findPatientByEmail || (api as any).patientProfile?.findPatientByEmail) as any,
    queryArgs
  ) as Id<'patients'> | null | undefined;

  // Validate that foundPatientId is a valid Convex ID for patients table
  const isValidPatientId = foundPatientId && isValidConvexIdForTable(foundPatientId, 'patients');

  // Get patient profile once we have a valid patient ID
  const patientProfile = useQuery(
    (patientProfileApi?.getPatientProfile || (api as any).patientProfile?.getPatientProfile) as any,
    isValidPatientId
      ? { patientId: foundPatientId as Id<'patients'> }
      : 'skip'
  ) as any;

  // Check if queries were skipped (not executed)
  const queriesSkipped = queryArgs === 'skip';
  
  // Determine loading state
  const isLoading = (foundPatientId === undefined || patientProfile === undefined) && !queriesSkipped;

  return {
    patientId: foundPatientId,
    patientProfile,
    isLoading,
    queriesSkipped,
    patientEmail,
    tenantId,
  };
}

