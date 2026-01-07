"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, Building2, Home } from "lucide-react";

/**
 * Wrong Portal Error Page
 * 
 * Shown when a user tries to login at a tenant portal they don't belong to.
 * Provides a helpful message and redirect to their correct portal.
 */
function WrongPortalContent() {
  const searchParams = useSearchParams();
  
  const correctPortalUrl = searchParams?.get('redirect');
  const tenantName = searchParams?.get('tenant');
  const userEmail = searchParams?.get('email');

  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-status-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-status-warning" />
          </div>
          <CardTitle className="text-2xl">Wrong Login Portal</CardTitle>
          <CardDescription className="text-base mt-2">
            {userEmail ? (
              <>Your account (<span className="font-medium">{userEmail}</span>) is not associated with this organization.</>
            ) : (
              <>Your account is not associated with this organization.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-surface-secondary rounded-lg p-4">
            <p className="text-sm text-text-secondary">
              Each organization has its own login portal. Please use the correct portal for your account.
            </p>
          </div>

          <div className="space-y-3">
            {correctPortalUrl && (
              <Link href={correctPortalUrl} className="block">
                <Button className="w-full bg-zenthea-teal hover:bg-zenthea-teal/90">
                  <Building2 className="mr-2 h-4 w-4" />
                  {tenantName ? `Go to ${tenantName}` : "Go to Your Portal"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
            
            <Link href="/" className="block">
              <Button variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Return to Home
              </Button>
            </Link>
          </div>

          <div className="text-center text-sm text-text-tertiary">
            <p>
              Need help? Contact your organization&apos;s administrator or{" "}
              <a 
                href="mailto:support@zenthea.ai" 
                className="text-zenthea-teal hover:underline"
              >
                Zenthea Support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WrongPortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <WrongPortalContent />
    </Suspense>
  );
}

