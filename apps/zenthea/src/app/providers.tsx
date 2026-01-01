"use client";

import { ConvexProvider } from "convex/react";
import React from "react";
import { CardSystemProvider } from "@/components/cards/CardSystemProvider";
import { SessionTimeoutProvider } from "@/components/session/SessionTimeoutProvider";
import { convex } from "@/lib/convex";

/**
 * Providers component to wrap the application with necessary contexts.
 * Includes ConvexProvider (if configured) and CardSystemProvider.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const isConvexEnabled = process.env.NEXT_PUBLIC_CONVEX_URL && 
                         !process.env.NEXT_PUBLIC_CONVEX_URL.includes('dummy') &&
                         !process.env.NEXT_PUBLIC_CONVEX_URL.includes('your-');

  if (!isConvexEnabled) {
    return (
      <SessionTimeoutProvider>
        <CardSystemProvider>
          {children}
        </CardSystemProvider>
      </SessionTimeoutProvider>
    );
  }

  return (
    <ConvexProvider client={convex!}>
      <SessionTimeoutProvider>
        <CardSystemProvider>
          {children}
        </CardSystemProvider>
      </SessionTimeoutProvider>
    </ConvexProvider>
  );
}
