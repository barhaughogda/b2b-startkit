"use client";

import { ConvexProvider } from "convex/react";
import React from "react";
import { CardSystemProvider } from "@/components/cards/CardSystemProvider";
import { SessionTimeoutProvider } from "@/components/session/SessionTimeoutProvider";
import { convex } from "@/lib/convex";

/**
 * Providers component to wrap the application with necessary contexts.
 * Includes ConvexProvider and CardSystemProvider.
 */
export function Providers({ children }: { children: React.ReactNode }) {
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
