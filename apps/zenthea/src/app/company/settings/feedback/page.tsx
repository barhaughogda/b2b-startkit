"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = 'force-dynamic';

export default function ClientFeedbackPage() {
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
          <h1 className="text-3xl font-bold text-text-primary">Client Feedback & Ratings</h1>
          <p className="text-text-secondary mt-1">
            View clinic and provider ratings, testimonials, and reviews
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Feedback & Ratings Overview</CardTitle>
            <CardDescription>
              Clinic overall rating and provider ratings overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary">
              Client feedback and ratings management features are being implemented.
              This page will display:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2 text-text-secondary">
              <li>Clinic overall rating (aggregate)</li>
              <li>Provider ratings overview</li>
              <li>Recent testimonials/reviews</li>
              <li>Pending testimonials requiring approval</li>
              <li>Low ratings requiring attention</li>
              <li>Rating trends</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ClinicLayout>
  );
}

