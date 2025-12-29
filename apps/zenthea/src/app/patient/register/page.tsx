'use client';

import React from 'react';
import Link from 'next/link';
import { TenantBranding } from '@/components/patient/TenantBranding';
import { PatientRegistrationForm } from '@/components/patient/PatientRegistrationForm';

export default function PatientRegisterPage() {
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
            Patient Portal Registration
          </h1>
          <p className="text-muted-foreground mt-2">
            Create your account to access your medical records and manage your healthcare
          </p>
        </div>

        {/* Registration Form */}
        <PatientRegistrationForm 
          tenantId="demo-tenant"
          redirectTo="/patient/login?message=registration-success"
        />

        {/* Footer Links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/patient/login"
              className="text-primary hover:underline"
            >
              Sign in
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
