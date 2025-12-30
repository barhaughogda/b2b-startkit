"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClinicAnalyticsPage() {
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
          <p className="text-text-secondary">Please sign in to access this page.</p>
        </div>
      </ClinicLayout>
    );
  }

  return (
    <ClinicLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Analytics</h1>
          <p className="text-text-secondary mt-1">
            View analytics and insights for your clinic
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Analytics Dashboard</CardTitle>
            <CardDescription>
              Analytics features will be available here. This includes patient metrics,
              appointment statistics, provider performance, and clinic-wide insights.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary">
              Analytics features are being implemented. Clinic owners can access
              advanced analytics in Settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </ClinicLayout>
  );
}

