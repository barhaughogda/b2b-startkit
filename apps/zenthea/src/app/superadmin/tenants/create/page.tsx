"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useRouter } from "next/navigation";
import { CreateTenantForm } from "@/components/superadmin/tenants/CreateTenantForm";

export default function CreateTenantPage() {
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">Create New Tenant</h1>
        <p className="text-text-secondary mt-1">
          Create a new tenant organization in the Zenthea platform
        </p>
      </div>

      <CreateTenantForm
        onSuccess={(tenantId) => {
          router.push(`/superadmin/tenants/${tenantId}`);
        }}
      />
    </div>
  );
}

