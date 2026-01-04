'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { Id } from '@/convex/_generated/dataModel';
import { canUseConvexQuery } from '@/lib/convexIdValidation';
import { convex } from '@/lib/convex-client';
import { ConvexErrorBoundary } from '@/components/utils/ConvexErrorBoundary';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { calculateProviderSectionCompleteness } from '@/lib/profileCompleteness';
import { ALL_SECTIONS } from '@/components/provider/ProviderProfileCompletenessIndicator';
import type { ProviderProfile } from '@/types';

interface ProfileCompletionBadgeProps {
  userId?: string;
  tenantId?: string;
}

/**
 * Component that uses Convex hooks
 * Uses 'skip' pattern to safely handle cases where ConvexProvider might not be available
 * or when query parameters are invalid
 */
function ProfileCompletionBadgeInner({ userId, tenantId }: ProfileCompletionBadgeProps) {
  // Check if we can use Convex queries FIRST (before using hooks)
  const canQuery = canUseConvexQuery(userId, tenantId);
  
  // Early return if we can't query (invalid Convex ID, etc.)
  // This prevents rendering a "0%" badge when the query cannot run
  if (!canQuery) {
    return null;
  }
  
  // Use 'skip' pattern to safely skip the query if conditions aren't met
  // This prevents errors when ConvexProvider isn't available or params are invalid
  const profileData = useQuery(
    api.providerProfiles.getProviderProfileByUserId,
    userId && tenantId
      ? {
          userId: userId as Id<'users'>,
          tenantId: tenantId!
        }
      : 'skip'
  );

  // Calculate completion percentage using section-based calculation
  // This matches the calculation used in ProviderProfileCompletenessIndicator
  // for consistency across the UI
  const completionPercentage = React.useMemo(() => {
    if (!profileData) return 0;
    
    const profile = profileData as Partial<ProviderProfile>;
    const sectionsCompleted = ALL_SECTIONS.filter((section) =>
      calculateProviderSectionCompleteness(section, profile as any)
    );
    
    return Math.round((sectionsCompleted.length / ALL_SECTIONS.length) * 100);
  }, [profileData]);
  
  // Only show warning if we have actual profile data and completion is below 80%
  // Check for truthy profileData (not just !== null) to handle undefined from 'skip'
  const showWarning = completionPercentage < 80 && !!profileData;

  if (!showWarning) {
    return null;
  }

  return (
    <Badge variant="outline" className="ml-auto">
      <AlertCircle className="h-3 w-3 mr-1" />
      {completionPercentage}%
    </Badge>
  );
}

/**
 * Component that displays profile completion percentage badge
 * 
 * Uses 'skip' pattern in useQuery to safely handle cases where:
 * - ConvexProvider might not be available (portal rendering issues)
 * - Query parameters are invalid
 * - Convex is not configured
 * 
 * This prevents hook errors that React error boundaries can't catch.
 * The component will gracefully return null if conditions aren't met.
 * 
 * NOTE: The 'skip' pattern helps, but if ConvexProvider isn't available at all,
 * useQuery will still throw an error. This is a known limitation - React hooks
 * can't be conditionally called. The error boundary provides a fallback.
 */
export function ProfileCompletionBadge({ userId, tenantId }: ProfileCompletionBadgeProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  // Ensure we're on the client side and React has fully mounted
  // This helps avoid hydration mismatches and timing issues with portals
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Early return if basic conditions aren't met
  if (!userId || !tenantId || !isMounted) {
    return null;
  }

  // Check if Convex is configured before rendering
  if (!convex || !process.env.NEXT_PUBLIC_CONVEX_URL) {
    return null;
  }

  // Wrap in error boundary as additional safety net
  // The 'skip' pattern in useQuery should prevent most errors, but this provides extra protection
  return (
    <ConvexErrorBoundary fallback={null}>
      <ProfileCompletionBadgeInner userId={userId} tenantId={tenantId} />
    </ConvexErrorBoundary>
  );
}

