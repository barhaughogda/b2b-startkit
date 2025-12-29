"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import { isOwner } from "@/lib/auth-utils";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = 'force-dynamic';

/**
 * Clinic Subscription Page
 * 
 * Task 6.1: Move Clinic Subscription Page
 * Task 6.3: Add Access Control for Subscription Page
 * 
 * This page allows clinic owners/admins to manage their Zenthea subscription:
 * - View current subscription plan
 * - View billing history
 * - Manage payment methods
 * - Upgrade/downgrade plans
 * 
 * Access Control (Task 6.3):
 * - Only clinic owners (isOwner: true) and admins (role: 'admin') can access this page
 * - Unauthorized users see an access denied message
 * 
 * Note: This is a placeholder page. Full subscription management features
 * will be implemented in future tasks.
 */
export default function ClinicSubscriptionPage() {
  const { data: session, status } = useSession();

  // Get tenant subscription data (hooks must be called before conditional returns)
  const tenantId = session?.user?.tenantId;
  const tenantQueryArgs = useMemo(
    () => (tenantId ? { tenantId } : "skip"),
    [tenantId]
  );
  const tenant = useQuery(api.tenants.getTenant, tenantQueryArgs);

  if (status === "loading") {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-text-secondary">Loading...</p>
        </div>
      </ClinicLayout>
    );
  }

  if (status === "unauthenticated") {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Please sign in to access this page.</AlertDescription>
          </Alert>
        </div>
      </ClinicLayout>
    );
  }

  // Task 6.3: Restrict access to clinic owners only
  // Note: All clinic staff now use 'clinic_user' role, ownership is determined by isOwner flag
  const userIsOwner = session?.user ? isOwner(session.user) : false;

  if (!userIsOwner) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Access denied. Only clinic owners can manage subscription settings.
            </AlertDescription>
          </Alert>
        </div>
      </ClinicLayout>
    );
  }

  return (
    <ClinicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <BackButton />
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Subscription</h1>
          <p className="text-text-secondary mt-1">
            View your clinic&apos;s subscription plan and limits
          </p>
        </div>

        {tenant === undefined ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zenthea-teal" />
              <span className="ml-3 text-text-secondary">Loading subscription information...</span>
            </CardContent>
          </Card>
        ) : tenant ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription>
                  Your current Zenthea subscription plan and limits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-text-secondary text-sm">Plan:</span>
                    <div className="mt-1">
                      <Badge variant="outline" className="capitalize text-base font-medium">
                        {tenant.subscription?.plan || "N/A"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-text-secondary text-sm">Status:</span>
                    <div className="mt-1">
                      <Badge 
                        variant={tenant.subscription?.status === "active" ? "default" : "secondary"}
                        className="capitalize text-base font-medium"
                      >
                        {tenant.subscription?.status || "N/A"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-text-secondary text-sm">Maximum Users:</span>
                    <p className="font-semibold text-text-primary text-lg mt-1">
                      {tenant.subscription?.maxUsers?.toLocaleString() || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-secondary text-sm">Maximum Patients:</span>
                    <p className="font-semibold text-text-primary text-lg mt-1">
                      {tenant.subscription?.maxPatients?.toLocaleString() || "N/A"}
                    </p>
                  </div>
                </div>

                {tenant.subscription?.startDate && (
                  <div className="pt-4 border-t border-border-primary">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-text-secondary text-sm">Start Date:</span>
                        <p className="font-medium text-text-primary mt-1">
                          {new Date(tenant.subscription.startDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      {tenant.subscription?.endDate && (
                        <div>
                          <span className="text-text-secondary text-sm">End Date:</span>
                          <p className="font-medium text-text-primary mt-1">
                            {new Date(tenant.subscription.endDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Alert className="mt-6 border-border-primary bg-surface-elevated">
                  <AlertCircle className="h-4 w-4 text-text-secondary" />
                  <AlertDescription className="text-text-secondary">
                    To change your subscription plan or limits, please contact support.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Unable to load subscription information. Please try again later.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </ClinicLayout>
  );
}

