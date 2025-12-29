"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";

/**
 * Redirect page for /clinic/settings/roles/[id] → /company/settings/roles/[id]
 * Part of route restructuring from /clinic/ to /company/
 * Preserves dynamic route parameter [id] and query parameters
 * See ROUTE_RESTRUCTURING_PLAN.md for details
 */
export default function ClinicSettingsRoleRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const roleId = params.id as string;

  useEffect(() => {
    if (!roleId) return;

    const queryString = searchParams.toString();
    const redirectUrl = queryString 
      ? `/company/settings/roles/${roleId}?${queryString}`
      : `/company/settings/roles/${roleId}`;
    
    router.replace(redirectUrl);
  }, [router, searchParams, roleId]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-text-secondary">Redirecting...</p>
      </div>
    </div>
  );
}
