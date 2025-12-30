'use client';

import React from 'react';
import Link from 'next/link';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { PatientProfileDashboard } from '@/components/patient/PatientProfileDashboard';
import { Button } from '@/components/ui/button';

export default function PatientProfilePage() {
  const { data: session, status } = useZentheaSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'patient') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Please sign in to access your patient profile.</p>
          <div className="pt-4">
            <Button asChild>
              <Link href="/patient/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <PatientProfileDashboard />;
}
