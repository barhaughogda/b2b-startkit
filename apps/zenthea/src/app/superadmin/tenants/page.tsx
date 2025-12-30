"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TenantList } from "@/components/superadmin/tenants/TenantList";

export default function SuperAdminTenantsPage() {
  const { data: session, status } = useZentheaSession();
  const router = useRouter();

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Tenant Management</h1>
          <p className="text-text-secondary mt-1">
            View and manage all tenants in the Zenthea platform
          </p>
        </div>
        <Button
          onClick={() => router.push("/superadmin/tenants/create")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Tenant
        </Button>
      </div>

      <TenantList />
    </div>
  );
}

