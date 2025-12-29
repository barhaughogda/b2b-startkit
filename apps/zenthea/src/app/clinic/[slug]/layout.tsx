"use client";

import React from "react";
import { ConvexProvider } from "convex/react";
import { convex } from "@/lib/convex";

interface PublicTenantLayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

/**
 * Layout for public tenant pages (landing page, booking, providers, etc.)
 * 
 * This layout wraps public pages in the Convex provider without requiring authentication.
 * It's optimized for public-facing pages that don't need auth state.
 */
export default function PublicTenantLayout({
  children,
}: PublicTenantLayoutProps) {
  // If Convex is not configured, render children without provider
  if (!convex) {
    return (
      <div className="min-h-screen bg-background-primary">
        {children}
      </div>
    );
  }

  return (
    <ConvexProvider client={convex}>
      <div className="min-h-screen bg-background-primary">
        {children}
      </div>
    </ConvexProvider>
  );
}
