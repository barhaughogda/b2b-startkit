"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { ClinicReports } from "@/components/clinic/Reports";
import { isOwner, isClinicUser } from "@/lib/auth-utils";
import { BackButton } from "@/components/ui/back-button";

// Force dynamic rendering - requires session context
export const dynamic = 'force-dynamic';

export default function ClinicSettingsReportsPage() {
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
          <p className="text-text-secondary">Please sign in to access this page.</p>
        </div>
      </ClinicLayout>
    );
  }

  // Check if user is clinic user (with backward compatibility)
  const userIsClinicUser = session?.user ? isClinicUser(session.user) : false;
  
  if (!userIsClinicUser) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-text-secondary">Access denied. Clinic user access required.</p>
        </div>
      </ClinicLayout>
    );
  }

  // Check if user is owner (owner-only page)
  const userIsOwner = session?.user ? isOwner(session.user) : false;
  
  if (!userIsOwner) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-text-secondary">Access denied. Owner role required.</p>
        </div>
      </ClinicLayout>
    );
  }

  return (
    <ClinicLayout>
      <div className="max-w-7xl mx-auto">
        <BackButton />
        <ClinicReports />
      </div>
    </ClinicLayout>
  );
}

