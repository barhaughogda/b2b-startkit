"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClinicDashboard() {
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
          <h1 className="text-3xl font-bold text-text-primary">Clinic Dashboard</h1>
          <p className="text-text-secondary mt-1">
            Welcome back, {session?.user?.name || 'User'}
          </p>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Welcome</CardTitle>
              <CardDescription>Clinic management dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary">
                This is the unified clinic dashboard. More features will be added here.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session Information</CardTitle>
              <CardDescription>Current user session details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-text-primary">
                  <strong>User ID:</strong> {session?.user?.id}
                </p>
                <p className="text-text-primary">
                  <strong>Email:</strong> {session?.user?.email}
                </p>
                <p className="text-text-primary">
                  <strong>Role:</strong> {session?.user?.role}
                </p>
                {session?.user?.tenantId && (
                  <p className="text-text-primary">
                    <strong>Tenant ID:</strong> {session?.user?.tenantId}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-text-secondary">
                  Quick actions will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ClinicLayout>
  );
}

