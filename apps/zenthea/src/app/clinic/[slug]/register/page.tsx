"use client";

import React from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTenantPublicData } from "@/hooks/useTenantPublicData";
import { PatientRegistrationForm } from "@/components/patient/PatientRegistrationForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

/**
 * Tenant-Specific Patient Registration Page
 * 
 * This page allows new patients to register with a specific clinic/tenant.
 * It uses the tenant's branding and passes the correct tenant ID to the
 * registration form, ensuring patients are associated with the right clinic.
 * 
 * After successful registration, patients are redirected to the intake form
 * where they can select their primary provider and complete their profile.
 */
export default function TenantPatientRegistrationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  
  const { tenant, isLoading, notFound } = useTenantPublicData(slug);
  
  // Get redirect destination after registration (default to intake form with booking redirect)
  const redirectAfterIntake = searchParams?.get('redirect') || `/clinic/${slug}/book`;
  const redirectTo = `/patient/onboarding/intake?redirect=${encodeURIComponent(redirectAfterIntake)}`;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  // Not found state
  if (notFound || !tenant) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Clinic Not Found</h1>
          <p className="text-text-secondary mb-6">
            The clinic you&apos;re looking for doesn&apos;t exist or is no longer available.
          </p>
          <Link href="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { branding } = tenant;

  return (
    <div 
      className="min-h-screen bg-background-primary flex flex-col"
      style={{
        "--tenant-primary": branding.primaryColor,
        "--tenant-secondary": branding.secondaryColor,
      } as React.CSSProperties}
    >
      {/* Header */}
      <header className="bg-white border-b border-border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href={`/clinic/${slug}`}
            className="inline-flex items-center transition-colors hover:opacity-80"
            style={{ color: branding.primaryColor }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {tenant.name}
          </Link>
        </div>
      </header>

      {/* Registration Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {branding.logo ? (
                <img 
                  src={branding.logo} 
                  alt={`${tenant.name} logo`}
                  className="h-12 w-auto"
                />
              ) : (
                <div 
                  className="h-12 w-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {tenant.name.charAt(0)}
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold text-text-primary">
              Create Your Patient Account
            </h1>
            <p className="mt-2" style={{ color: branding.primaryColor }}>
              Join {tenant.name} to book appointments and manage your healthcare
            </p>
          </div>

          {/* Registration Form Component */}
          <PatientRegistrationForm 
            tenantId={tenant.id}
            redirectTo={redirectTo}
            primaryColor={branding.primaryColor}
          />

          {/* Footer Links */}
          <div className="text-center space-y-3">
            <p className="text-sm" style={{ color: branding.primaryColor }}>
              Already have an account?{" "}
              <Link 
                href={`/clinic/${slug}/login?redirect=${encodeURIComponent(redirectAfterIntake)}`}
                className="font-medium hover:underline"
                style={{ color: branding.primaryColor }}
              >
                Sign in
              </Link>
            </p>
            <p className="text-sm text-text-tertiary">
              By registering, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-text-secondary">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-text-secondary">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border-primary py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-text-secondary">
          <p>
            © {new Date().getFullYear()} {tenant.name}. Powered by{" "}
            <a href="https://zenthea.ai" className="hover:underline">
              Zenthea
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

