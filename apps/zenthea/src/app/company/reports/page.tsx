"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClinicReportsPage() {
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
          <h1 className="text-3xl font-bold text-text-primary">Reports</h1>
          <p className="text-text-secondary mt-1">
            Generate and view reports for your clinic
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reports Dashboard</CardTitle>
            <CardDescription>
              Reporting features will be available here. This includes patient reports,
              appointment reports, billing reports, and compliance reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary">
              Reports features are being implemented. Clinic owners can access
              advanced reports in Settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </ClinicLayout>
  );
}

