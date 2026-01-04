"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";

/**
 * Providers component to wrap the application with necessary contexts.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://migrated-to-postgres-placeholder.convex.cloud"));

  return (
    <ConvexProvider client={client}>
      {children}
    </ConvexProvider>
  );
}
