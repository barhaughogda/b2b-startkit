"use client";

import { ConvexProvider } from "convex/react";
import React from "react";
import { convex } from "@/lib/convex";

/**
 * Providers component to wrap the application with necessary contexts.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}
