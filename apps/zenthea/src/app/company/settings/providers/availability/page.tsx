"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = 'force-dynamic';

export default function ProviderAvailabilityPage() {
  const { data: session, status } = useZentheaSession();

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

  return (
    <ClinicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <BackButton />
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Provider Availability & Capacity</h1>
          <p className="text-text-secondary mt-1">
            View provider schedules, capacity utilization, and available appointment slots
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Provider Availability Overview</CardTitle>
            <CardDescription>
              Current provider availability status and capacity metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary">
              Provider availability and capacity management features are being implemented.
              This page will display:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2 text-text-secondary">
              <li>Current provider availability status</li>
              <li>Provider schedules overview</li>
              <li>Capacity utilization metrics</li>
              <li>Available appointment slots</li>
              <li>Forward-looking capacity (next 7/30 days)</li>
              <li>Provider workload indicators</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ClinicLayout>
  );
}

