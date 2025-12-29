"use client";

import { ConvexProvider } from "convex/react";
import { SessionProvider } from "next-auth/react";
import React from "react";
import { CardSystemProvider } from "@/components/cards/CardSystemProvider";
import { SessionTimeoutProvider } from "@/components/session/SessionTimeoutProvider";
import { convex } from "@/lib/convex";

/**
 * Providers component to wrap the application with necessary contexts.
 * Includes NextAuth's SessionProvider, ConvexProvider (if configured), and CardSystemProvider.
 *
 * @param {Object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to be rendered within the providers.
 * @returns {JSX.Element} The wrapped children with all necessary providers.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // If Convex is not configured, render children without ConvexProvider
  if (!convex) {
    return (
      <SessionProvider>
        <SessionTimeoutProvider>
          <CardSystemProvider>
            {children}
          </CardSystemProvider>
        </SessionTimeoutProvider>
      </SessionProvider>
    );
  }

  return (
    <SessionProvider>
      <ConvexProvider client={convex}>
        <SessionTimeoutProvider>
          <CardSystemProvider>
            {children}
          </CardSystemProvider>
        </SessionTimeoutProvider>
      </ConvexProvider>
    </SessionProvider>
  );
}
