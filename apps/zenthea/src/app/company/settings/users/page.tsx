"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useRouter } from "next/navigation";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { ClinicUserManagement } from "@/components/clinic/ClinicUserManagement";
import { isOwner, isClinicUser } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

// Force dynamic rendering - requires session context
export const dynamic = 'force-dynamic';

export default function ClinicUsersPage() {
  const { data: session, status } = useZentheaSession();
  const router = useRouter();

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
      <div className="max-w-7xl mx-auto p-6">
        <BackButton />
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">User Management</h1>
              <p className="text-text-secondary mt-1">
                Manage clinic users, roles, and permissions
              </p>
            </div>
            <Button
              onClick={() => router.push("/company/settings/users/invite")}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Invite User
            </Button>
          </div>
        </div>

        <ClinicUserManagement />
      </div>
    </ClinicLayout>
  );
}

