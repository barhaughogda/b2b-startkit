"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { ClinicAnalyticsDashboard } from "@/components/clinic/ClinicAnalyticsDashboard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { isOwner } from "@/lib/auth-utils";
import { BackButton } from "@/components/ui/back-button";

// Force dynamic rendering - requires session context
export const dynamic = 'force-dynamic';

/**
 * Clinic Analytics Page
 * 
 * Displays comprehensive analytics dashboard for clinic owners.
 * Owner-only access is enforced by both the page (UI check) and API route (server check).
 * 
 * Analytics includes:
 * - Patient growth trends
 * - Appointment scheduling and completion
 * - Revenue metrics
 * - User activity
 * - System performance
 * 
 * Part of the Access System Refactoring - replaces /admin/analytics
 * See ACCESS_SYSTEM_REFACTORING_TASKS.md for details
 */
export default function ClinicAnalyticsPage() {
  const { data: session, status } = useZentheaSession();

  if (status === "loading") {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-text-secondary">Loading...</p>
        </div>
      </ClinicLayout>
    );
  }

  if (status === "unauthenticated") {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Please sign in to access this page.</AlertDescription>
          </Alert>
        </div>
      </ClinicLayout>
    );
  }

  // Check if user is owner (UI-level check - API route also enforces this)
  if (!isOwner(session?.user)) {
    return (
      <ClinicLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Only clinic owners can access analytics. Please contact your clinic administrator if you need access.
            </AlertDescription>
          </Alert>
        </div>
      </ClinicLayout>
    );
  }

  return (
    <ClinicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <BackButton />
        <ClinicAnalyticsDashboard />
      </div>
    </ClinicLayout>
  );
}
