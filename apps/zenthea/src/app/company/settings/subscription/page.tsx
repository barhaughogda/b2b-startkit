"use client";

import React from "react";
import { useZentheaSession } from "@/hooks/useZentheaSession";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, Loader2, Zap, Shield, Rocket } from "lucide-react";
import { isOwner } from "@/lib/auth-utils";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/back-button";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useSubscriptionUsage } from "@/hooks/useSubscriptionUsage";

export const dynamic = 'force-dynamic';

/**
 * Zenthea Subscription Page
 * 
 * Replaces legacy billing display with the new shared @startkit/billing system.
 * Shows usage tracking for providers and patients.
 */
export default function ClinicSubscriptionPage() {
  const { data: session, status } = useZentheaSession();
  const { usage, isLoading: usageLoading } = useSubscriptionUsage();

  if (status === "loading" || usageLoading) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-zenthea-teal" />
          <p className="ml-3 text-text-secondary">Loading your subscription...</p>
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

  const planInfo = {
    free: { name: "Zenthea Free", icon: Shield, color: "text-text-secondary" },
    pro: { name: "Zenthea Pro with AI", icon: Zap, color: "text-zenthea-teal" },
    enterprise: { name: "Zenthea Enterprise", icon: Rocket, color: "text-zenthea-purple" },
  }[usage?.plan || "free"] || { name: usage?.plan, icon: Shield, color: "text-text-primary" };

  return (
    <ClinicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <BackButton />
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Subscription</h1>
            <p className="text-text-secondary mt-1">
              Manage your clinic&apos;s plan and monitor usage limits
            </p>
          </div>
          {usage?.needsUpgrade && (
            <Button className="bg-zenthea-teal hover:bg-zenthea-teal/90 text-white gap-2">
              <Zap className="h-4 w-4" />
              Upgrade Now
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Plan Card */}
          <Card className="lg:col-span-1 border-zenthea-teal/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <planInfo.icon className={`h-5 w-5 ${planInfo.color}`} />
                Current Plan
              </CardTitle>
              <CardDescription>You are currently on the {planInfo.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Badge variant="outline" className={`capitalize text-lg py-1 px-3 ${planInfo.color} border-current`}>
                  {planInfo.name}
                </Badge>
              </div>
              
              {usage?.plan === 'free' && (
                <div className="space-y-4">
                  <p className="text-sm text-text-secondary">
                    Basic clinic management for small practices.
                  </p>
                  <Button variant="outline" className="w-full border-zenthea-teal text-zenthea-teal hover:bg-zenthea-teal/5">
                    View Plan Comparison
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage Monitoring Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Usage Limits</CardTitle>
              <CardDescription>Track your resource consumption for this billing period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Provider Usage */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-medium text-text-primary">Active Providers</p>
                    <p className="text-xs text-text-secondary">Clinic staff and practitioners</p>
                  </div>
                  <p className="text-sm font-medium">
                    {usage?.activeProviders} / {usage?.providerLimit === Infinity ? 'Unlimited' : usage?.providerLimit}
                  </p>
                </div>
                <Progress 
                  value={usage?.providerLimit === Infinity ? 0 : (usage!.activeProviders / usage!.providerLimit) * 100} 
                  className={usage?.activeProviders! >= usage!.providerLimit! ? 'bg-status-error/20' : ''}
                />
              </div>

              {/* Patient Usage */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-medium text-text-primary">Active Patients</p>
                    <p className="text-xs text-text-secondary">Total patient records in organization</p>
                  </div>
                  <p className="text-sm font-medium">
                    {usage?.activePatients} / {usage?.patientLimit === Infinity ? 'Unlimited' : usage?.patientLimit}
                  </p>
                </div>
                <Progress 
                  value={usage?.patientLimit === Infinity ? 0 : (usage!.activePatients / usage!.patientLimit) * 100}
                  className={usage?.activePatients! >= usage!.patientLimit! ? 'bg-status-error/20' : ''}
                />
              </div>

              {usage?.needsUpgrade && (
                <Alert variant="destructive" className="bg-status-error/5 border-status-error/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Usage Limit Reached</AlertTitle>
                  <AlertDescription>
                    Your clinic has reached the maximum number of {usage.activeProviders >= usage.providerLimit ? 'providers' : 'patients'} allowed on your current plan. Please upgrade to continue adding records.
                  </AlertDescription>
                </Alert>
              )}

              {usage?.isNearLimit && !usage?.needsUpgrade && (
                <Alert className="bg-status-warning/5 border-status-warning/20">
                  <AlertCircle className="h-4 w-4 text-status-warning" />
                  <AlertTitle className="text-status-warning">Approaching Limits</AlertTitle>
                  <AlertDescription className="text-text-secondary">
                    You are nearing your plan&apos;s capacity. Consider upgrading to the Pro plan to avoid any service interruption.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ClinicLayout>
  );
}
