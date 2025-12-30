"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession"; import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DemoDashboard() {
  const { data: session, status } = useZentheaSession();

  if (status === "loading") {
    return <div className="p-8">Loading...</div>;
  }

  if (status === "unauthenticated") {
    return <div className="p-8">Please sign in to access this page.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Demo Dashboard</h1>
            <p className="text-gray-600">Welcome to the Zenthea demo, {session?.user?.name}</p>
          </div>
          <Button onClick={() => signOut({ redirectUrl: '/' })} variant="outline">
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Demo Features</CardTitle>
              <CardDescription>Explore Zenthea&apos;s capabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Experience the full range of Zenthea&apos;s features in demo mode.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Assistant</CardTitle>
              <CardDescription>Voice-powered AI features</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Try out the AI voice assistant and smart documentation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Patient Management</CardTitle>
              <CardDescription>Mock patient data and workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Explore patient management with realistic demo data.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
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
      </div>
    </div>
  );
}