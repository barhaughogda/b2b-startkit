"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";
import { CardSystemProvider } from "@/components/cards/CardSystemProvider";
import { SessionTimeoutProvider } from "@/components/session/SessionTimeoutProvider";

/**
 * Providers component to wrap the application with necessary contexts.
 * Includes ConvexProvider (legacy) and CardSystemProvider.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://migrated-to-postgres-placeholder.convex.cloud"));

  // Always include ConvexProvider because some legacy components still use useQuery/useMutation
  // The client itself handles fallback URLs if NEXT_PUBLIC_CONVEX_URL is missing
  return (
    <ConvexProvider client={client}>
      <SessionTimeoutProvider>
        <CardSystemProvider>
          {children}
        </CardSystemProvider>
      </SessionTimeoutProvider>
    </ConvexProvider>
  );
}
