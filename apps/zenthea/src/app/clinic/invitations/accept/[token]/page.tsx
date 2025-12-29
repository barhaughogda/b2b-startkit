"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";

/**
 * CRITICAL Redirect page for /clinic/invitations/accept/[token] → /company/invitations/accept/[token]
 * Part of route restructuring from /clinic/ to /company/
 * Preserves dynamic route parameter [token] and query parameters
 * 
 * This redirect is CRITICAL for invitation links - old invitation emails will use /clinic/ routes
 * See ROUTE_RESTRUCTURING_PLAN.md for details
 */
export default function ClinicInvitationAcceptRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const token = params.token as string;

  useEffect(() => {
    if (!token) return;

    const queryString = searchParams.toString();
    const redirectUrl = queryString 
      ? `/company/invitations/accept/${token}?${queryString}`
      : `/company/invitations/accept/${token}`;
    
    router.replace(redirectUrl);
  }, [router, searchParams, token]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-text-secondary">Redirecting...</p>
      </div>
    </div>
  );
}
