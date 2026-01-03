"use client";

import { ConvexProvider } from "convex/react";
import React from "react";
import { CardSystemProvider } from "@/components/cards/CardSystemProvider";
import { SessionTimeoutProvider } from "@/components/session/SessionTimeoutProvider";
import { getConvexClient } from "@/lib/convex";

/**
 * Providers component to wrap the application with necessary contexts.
 * Includes ConvexProvider (legacy) and CardSystemProvider.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Always include ConvexProvider because some legacy components still use useQuery/useMutation
  // The client itself handles fallback URLs if NEXT_PUBLIC_CONVEX_URL is missing
  return (
    <ConvexProvider client={getConvexClient()}>
      <SessionTimeoutProvider>
        <CardSystemProvider>
          {children}
        </CardSystemProvider>
      </SessionTimeoutProvider>
    </ConvexProvider>
  );
}
