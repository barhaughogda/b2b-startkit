"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Redirect page for /clinic → /company
 * Part of route restructuring from /clinic/ to /company/
 * See ROUTE_RESTRUCTURING_PLAN.md for details
 */
export default function ClinicRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Preserve query parameters
    const queryString = searchParams.toString();
    const redirectUrl = queryString 
      ? `/company?${queryString}`
      : '/company';
    
    router.replace(redirectUrl);
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-text-secondary">Redirecting...</p>
      </div>
    </div>
  );
}
