"use client"

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useRouter, usePathname } from 'next/navigation';
import { PatientNavigationLayout } from "@/components/navigation/PatientNavigationLayout"
import { ZentheaThemeProvider } from "@/lib/theme-context"
import { usePatientProfileData } from "@/hooks/usePatientProfileData"
import { CardSystemProvider } from "@/components/cards/CardSystemProvider"

/**
 * Minimal type for intake form validation
 * Only includes fields needed to check if intake is completed
 */
interface IntakeFormData {
  gender?: string;
  primaryLanguage?: string;
  email?: string;
  phone?: string;
  emergencyContacts?: Array<{
    name?: string;
    phone?: string;
  }>;
}

/**
 * Check if patient has completed required intake form fields
 * Required fields:
 * - Demographics: gender AND primaryLanguage
 * - Contact: email OR phone
 * - Emergency: at least one emergency contact with name and phone
 */
function isIntakeCompleted(patientProfile: IntakeFormData | null | undefined): boolean {
  if (!patientProfile) {
    return false;
  }

  // Check demographics (required)
  const hasDemographics = !!(patientProfile.gender && patientProfile.primaryLanguage);
  
  // Check contact (required - email OR phone)
  const hasContact = !!(patientProfile.email || patientProfile.phone);
  
  // Check emergency contacts (required - at least one with name and phone)
  const hasEmergencyContacts = !!(
    patientProfile.emergencyContacts &&
    patientProfile.emergencyContacts.length > 0 &&
    patientProfile.emergencyContacts.some((ec) => ec.name && ec.phone)
  );

  return hasDemographics && hasContact && hasEmergencyContacts;
}

/**
 * Routes that should bypass intake form requirement check
 */
const BYPASS_INTAKE_CHECK_ROUTES = [
  '/patient/onboarding/intake',
  '/patient/login',
  '/patient/register',
];

function shouldBypassIntakeCheck(pathname: string): boolean {
  return BYPASS_INTAKE_CHECK_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

export default function PatientPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useZentheaSession();
  const router = useRouter();
  const pathname = usePathname();
  const { patientProfile, isLoading: profileLoading } = usePatientProfileData();

  // Check if intake form is required and redirect if needed
  useEffect(() => {
    // Only check for patient users
    if (session?.user?.role !== 'patient') {
      return;
    }

    // Bypass check for certain routes (intake form itself, login, register)
    if (shouldBypassIntakeCheck(pathname)) {
      return;
    }

    // Wait for profile to load before checking
    if (profileLoading) {
      return;
    }

    // Check if intake is completed
    const intakeCompleted = isIntakeCompleted(patientProfile);

    // Redirect to intake form if not completed
    if (!intakeCompleted) {
      router.push('/patient/onboarding/intake');
    }
  }, [session, patientProfile, profileLoading, pathname, router]);

  return (
    <ZentheaThemeProvider>
      <CardSystemProvider>
        <PatientNavigationLayout>
          <div className="flex flex-1 flex-col px-4 lg:px-6 xl:px-8">
            {children}
          </div>
        </PatientNavigationLayout>
      </CardSystemProvider>
    </ZentheaThemeProvider>
  )
}
