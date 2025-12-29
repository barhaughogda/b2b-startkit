"use client";

import { useSession } from "next-auth/react";
import { PlatformSettings } from "@/components/superadmin/PlatformSettings";

export default function SuperAdminSettingsPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-text-secondary">Please sign in to access this page.</p>
      </div>
    );
  }

  // Check if user is superadmin
  if (session?.user?.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-text-secondary">Access denied. Superadmin role required.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">Platform Settings</h1>
        <p className="text-text-secondary mt-1">
          Manage platform-wide security policies, integrations, and default settings
        </p>
      </div>

      <PlatformSettings />
    </div>
  );
}

