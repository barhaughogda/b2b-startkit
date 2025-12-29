'use client';

import React from 'react';
import Link from 'next/link';
import { TenantBranding } from '@/components/patient/TenantBranding';
import { PatientLoginForm } from '@/components/patient/PatientLoginForm';

export default function PatientLoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <TenantBranding 
            tenantId="demo-tenant"
            size="lg"
            className="justify-center mb-6"
          />
          <h1 className="text-2xl font-bold text-foreground">
            Patient Portal
          </h1>
          <p className="text-muted-foreground mt-2">
            Access your medical records and manage your healthcare
          </p>
        </div>

        {/* Login Form */}
        <PatientLoginForm 
          tenantId="demo-tenant"
          redirectTo="/patient/calendar?tab=today"
        />

        {/* Footer Links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/patient/register"
              className="text-primary hover:underline"
            >
              Request access
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            Having trouble?{' '}
            <Link
              href="/patient/support"
              className="text-primary hover:underline"
            >
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}