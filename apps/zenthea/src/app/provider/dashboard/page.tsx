"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProviderDashboard() {
  const { data: session, status } = useZentheaSession();

  if (status === "loading") {
    return <div className="p-8">Loading...</div>;
  }

  if (status === "unauthenticated") {
    return <div className="p-8">Please sign in to access this page.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Provider Dashboard</h1>
        <p className="text-text-secondary">Welcome back, Dr. {session?.user?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Appointments</CardTitle>
            <CardDescription>View and manage today&apos;s schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">
              Access your daily schedule and patient appointments.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient Records</CardTitle>
            <CardDescription>Access patient medical records</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">
              View and update patient medical information.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voice Assistant</CardTitle>
            <CardDescription>AI-powered voice commands</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">
              Use voice commands for hands-free documentation.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Information</CardTitle>
          <CardDescription>Current user session details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>User ID:</strong> {session?.user?.id}</p>
            <p><strong>Email:</strong> {session?.user?.email}</p>
            <p><strong>Role:</strong> {session?.user?.role}</p>
            <p><strong>Tenant ID:</strong> {session?.user?.tenantId}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}