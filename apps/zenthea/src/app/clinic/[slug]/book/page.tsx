"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTenantPublicData } from "@/hooks/useTenantPublicData";
import { useCareTeam } from "@/hooks/useCareTeam";
import { usePatientProfileData } from "@/hooks/usePatientProfileData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppointmentBookingWizard, PatientAppointmentFormData } from "@/components/scheduling/AppointmentBookingWizard";
import { PublicBookingWizard, PublicBookingFormData } from "@/components/scheduling/PublicBookingWizard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getThemeStyles, getFontUrl } from "@/lib/website-builder/theme-utils";
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  User,
  Phone,
  Mail,
  Clock,
  UserPlus,
  LogIn,
  Users
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

// Constants
const MAX_PREFERRED_DATES = 5;

/**
 * Public Booking Page
 * 
 * Authentication-aware booking flow:
 * - Authenticated patients with care team: Full booking wizard
 * - Authenticated patients without care team: Redirect to intake
 * - Unauthenticated: Show login/register options (account_required mode)
 * - Request mode: Show booking request form (no auth required)
 * - Disabled mode: Show unavailable message
 */
export default function TenantBookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params?.slug as string;
  
  const { data: session, status: authStatus } = useSession();
  const { tenant, isLoading: tenantLoading, notFound } = useTenantPublicData(slug);
  const { patientId, patientProfile, isLoading: patientLoading } = usePatientProfileData();
  const { careTeam, isLoading: careTeamLoading } = useCareTeam();
  
  const preselectedProvider = searchParams?.get('provider');
  const preselectedClinic = searchParams?.get('clinic');

  // Booking wizard state for authenticated patients (account_required mode)
  const [wizardFormData, setWizardFormData] = useState<PatientAppointmentFormData>({
    providerId: preselectedProvider || '',
    providerName: '',
    scheduledAt: 0,
    duration: 30,
    type: 'consultation',
    locationId: preselectedClinic || undefined,
    notes: '',
  });
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);
  const [wizardSaveError, setWizardSaveError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Public booking wizard state for unauthenticated users (full mode)
  const bookingStateParam = searchParams?.get('bookingState');
  const initialPublicFormData = React.useMemo<PublicBookingFormData>(() => {
    // Try to restore state from URL param (after login redirect)
    if (bookingStateParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(bookingStateParam));
        // Clear sessionStorage since we got state from URL
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(`zenthea-booking-${slug}`);
        }
        return {
          serviceId: parsed.serviceId || '',
          serviceName: parsed.serviceName || '',
          serviceDuration: parsed.serviceDuration || 30,
          providerId: parsed.providerId || '',
          providerName: parsed.providerName || '',
          providerUserId: parsed.providerUserId,
          providerTableId: parsed.providerTableId,
          scheduledAt: parsed.time || 0,
          notes: parsed.notes || '',
        };
      } catch {
        // Invalid state, try sessionStorage fallback
      }
    }
    
    // Fallback: Try sessionStorage (for cases where URL params get lost)
    if (typeof window !== 'undefined') {
      try {
        const storedState = sessionStorage.getItem(`zenthea-booking-${slug}`);
        if (storedState) {
          const parsed = JSON.parse(storedState);
          sessionStorage.removeItem(`zenthea-booking-${slug}`); // Clear after restoring
          return {
            serviceId: parsed.serviceId || '',
            serviceName: parsed.serviceName || '',
            serviceDuration: parsed.serviceDuration || 30,
            providerId: parsed.providerId || '',
            providerName: parsed.providerName || '',
            providerUserId: parsed.providerUserId,
            providerTableId: parsed.providerTableId,
            scheduledAt: parsed.time || 0,
            notes: parsed.notes || '',
          };
        }
      } catch {
        // Invalid stored state
      }
    }
    
    return {
      serviceId: '',
      serviceName: '',
      serviceDuration: 30,
      providerId: preselectedProvider || '',
      providerName: '',
      scheduledAt: 0,
      notes: '',
    };
  }, [bookingStateParam, preselectedProvider, slug]);
  
  const [publicFormData, setPublicFormData] = useState<PublicBookingFormData>(initialPublicFormData);

  // Request form state (for "request" mode)
  const [formData, setFormData] = useState({
    patientName: "",
    patientEmail: "",
    patientPhone: "",
    preferredDates: [""],
    preferredTimeOfDay: "any" as "morning" | "afternoon" | "evening" | "any",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBookingRequest = useMutation(api.bookingRequests.createBookingRequest);
  const createAppointment = useMutation(api.appointments.createAppointment);

  // Determine which theme to use: website builder theme (if published) or fallback to branding
  // This must be calculated before conditional returns to ensure hooks are called consistently
  const websiteBuilder = tenant?.websiteBuilder;
  const hasPublishedWebsiteBuilder = websiteBuilder?.publishedAt != null;
  const theme = hasPublishedWebsiteBuilder && websiteBuilder?.theme 
    ? websiteBuilder.theme 
    : null;

  // Load Google Fonts if website builder theme is available
  // This hook must be called unconditionally at the top level
  useEffect(() => {
    if (theme?.fontPair) {
      const fontUrl = getFontUrl(theme.fontPair);
      const fontLinkId = 'booking-page-google-fonts';
      let link = document.getElementById(fontLinkId) as HTMLLinkElement | null;
      
      if (!link) {
        link = document.createElement('link');
        link.id = fontLinkId;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      
      link.href = fontUrl;
    }
  }, [theme?.fontPair]);

  // Handle wizard save for authenticated patients
  const handleWizardSave = useCallback(async () => {
    if (!patientId || !session?.user?.id) {
      setWizardSaveError('Patient record not found');
      return;
    }

    if (!wizardFormData.providerId) {
      setWizardSaveError('Please select a provider');
      return;
    }

    if (!wizardFormData.scheduledAt) {
      setWizardSaveError('Please select a date and time');
      return;
    }

    setIsSavingAppointment(true);
    setWizardSaveError(null);

    try {
      // Map appointment type
      const appointmentType = wizardFormData.type === 'telehealth' 
        ? 'consultation' 
        : wizardFormData.type;

      // IMPORTANT: userId must be the PROVIDER's user ID for conflict checking
      // The appointments.userId field represents who owns the appointment slot (the provider)
      // The patient's ID is tracked via patientId, not userId
      const providerUserId = wizardFormData.userId;
      if (!providerUserId) {
        throw new Error('Provider user ID is required for appointment creation');
      }

      await createAppointment({
        patientId: patientId as Id<'patients'>,
        userId: providerUserId as Id<'users'>, // Provider's user ID for conflict checking
        providerId: wizardFormData.providerId as Id<'providers'>,
        scheduledAt: wizardFormData.scheduledAt,
        duration: wizardFormData.duration,
        type: appointmentType,
        notes: wizardFormData.notes,
        locationId: wizardFormData.locationId 
          ? (wizardFormData.locationId as Id<'locations'>) 
          : undefined,
        clinicId: wizardFormData.clinicId
          ? (wizardFormData.clinicId as Id<'clinics'>)
          : undefined,
        createdBy: session.user.id as Id<'users'>, // createdBy is the patient who initiated
        tenantId: session.user.tenantId || tenant?.id || '',
      });

      setBookingSuccess(true);
      toast.success('Appointment scheduled successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to book appointment';
      setWizardSaveError(errorMessage);
      toast.error('Booking failed', { description: errorMessage });
    } finally {
      setIsSavingAppointment(false);
    }
  }, [patientId, session, wizardFormData, createAppointment, tenant]);

  const handleWizardCancel = useCallback(() => {
    router.push(`/clinic/${slug}`);
  }, [router, slug]);

  // Handle public booking wizard confirmation (for authenticated users after login redirect)
  const handlePublicBookingConfirm = useCallback(async () => {
    if (!patientId || !session?.user?.id) {
      setWizardSaveError('Patient record not found');
      return;
    }

    if (!publicFormData.providerId) {
      setWizardSaveError('Please select a provider');
      return;
    }

    if (!publicFormData.scheduledAt) {
      setWizardSaveError('Please select a date and time');
      return;
    }

    setIsSavingAppointment(true);
    setWizardSaveError(null);

    try {
      // Use providerTableId (providers table ID) if available, otherwise leave undefined
      // providerTableId is resolved from publicProviderProfile -> providerProfile -> providers table
      const appointmentProviderId = publicFormData.providerTableId 
        ? (publicFormData.providerTableId as Id<'providers'>)
        : undefined;

      // IMPORTANT: userId must be the PROVIDER's user ID for conflict checking
      // The appointments.userId field represents who owns the appointment slot (the provider)
      // providerUserId is the user ID from the public provider profile
      const providerUserId = publicFormData.providerUserId;
      if (!providerUserId) {
        throw new Error('Provider user ID is required for appointment creation');
      }

      await createAppointment({
        patientId: patientId as Id<'patients'>,
        userId: providerUserId as Id<'users'>, // Provider's user ID for conflict checking
        providerId: appointmentProviderId, // providers table ID for appointment creation
        scheduledAt: publicFormData.scheduledAt,
        duration: publicFormData.serviceDuration,
        type: 'consultation', // Default type for services
        notes: publicFormData.notes,
        createdBy: session.user.id as Id<'users'>, // createdBy is the patient who initiated
        tenantId: session.user.tenantId || tenant?.id || '',
      });

      setBookingSuccess(true);
      toast.success('Appointment scheduled successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to book appointment';
      setWizardSaveError(errorMessage);
      toast.error('Booking failed', { description: errorMessage });
    } finally {
      setIsSavingAppointment(false);
    }
  }, [patientId, session, publicFormData, createAppointment, tenant]);

  // Loading state
  if (tenantLoading || (authStatus === 'loading')) {
    return <BookingPageSkeleton />;
  }

  // Not found state
  if (notFound || !tenant) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Clinic Not Found</h1>
          <Link href="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { branding, bookingSettings } = tenant;
  const bookingMode = bookingSettings?.mode ?? "disabled";

  // Use website builder theme if available, otherwise fallback to branding
  const primaryColor = theme?.primaryColor || branding.primaryColor;
  const secondaryColor = theme?.secondaryColor || branding.secondaryColor;
  const accentColor = theme?.accentColor || branding.accentColor || branding.primaryColor;
  const backgroundColor = theme?.backgroundColor || '#ffffff';
  const textColor = theme?.textColor || '#1a1a1a';
  
  // Generate theme CSS variables if website builder theme is available
  const themeStyles = theme ? getThemeStyles(theme) : {};
  
  // Custom CSS variables for theme/branding
  const brandingStyles = {
    ...themeStyles,
    "--tenant-primary": primaryColor,
    "--tenant-secondary": secondaryColor,
    "--tenant-accent": accentColor,
    "--primary": primaryColor, // Override shadcn/ui primary color
    "--primary-foreground": "#ffffff", // Ensure white text on tenant primary color
    backgroundColor: backgroundColor,
    color: textColor,
  } as React.CSSProperties;

  // Check if booking is disabled
  if (bookingMode === "disabled" || !tenant.features.onlineScheduling) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center" style={brandingStyles}>
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="h-16 w-16 text-status-warning mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            Online Booking Unavailable
          </h1>
          <p className="text-text-secondary mb-8">
            Online booking is not currently available. Please contact us directly to schedule an appointment.
          </p>
          <div className="space-y-4">
            <a href={`tel:${tenant.contactInfo.phone}`}>
              <Button className="w-full" style={{ backgroundColor: primaryColor }}>
                <Phone className="mr-2 h-4 w-4" />
                Call {tenant.contactInfo.phone}
              </Button>
            </a>
            <Link href={`/clinic/${slug}`}>
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Full booking mode - browse-first, login at confirm
  if (bookingMode === "full") {
    const isPatient = session?.user?.role === 'patient';
    const isAuthenticated = authStatus === 'authenticated' && isPatient;

    // Booking success state
    if (bookingSuccess) {
      return (
        <div 
          className="min-h-screen bg-background-primary flex items-center justify-center"
          style={brandingStyles}
        >
          <div className="text-center max-w-md mx-auto px-4">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <CheckCircle className="h-10 w-10" style={{ color: primaryColor }} />
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-4">
              Appointment Booked!
            </h1>
            <p className="mb-8" style={{ color: primaryColor }}>
              Your appointment has been successfully scheduled. You can view and manage your appointments in your patient portal.
            </p>
            <div className="space-y-4">
              <Link href="/patient/appointments">
                <Button className="w-full" style={{ backgroundColor: primaryColor }}>
                  View My Appointments
                </Button>
              </Link>
              <Link href={`/clinic/${slug}`}>
                <Button variant="outline" className="w-full">
                  Return to {tenant.name}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // Show public booking wizard (browse-first experience)
    // Both authenticated and unauthenticated users see this
    return (
      <div className="min-h-screen bg-background-primary flex flex-col" style={brandingStyles}>
        <header className="border-b border-border-primary" style={{ backgroundColor: backgroundColor }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link 
              href={`/clinic/${slug}`}
              className="inline-flex items-center transition-colors hover:opacity-80"
              style={{ color: primaryColor }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {tenant.name}
            </Link>
          </div>
        </header>

        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <div className="text-center mb-8">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Calendar className="h-8 w-8" style={{ color: primaryColor }} />
            </div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Book an Appointment
            </h1>
            <p style={{ color: primaryColor }}>
              Select a service, choose a provider, and pick a convenient time.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <ErrorBoundary
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                fallback={({ error: _error, resetError }) => (
                  <div className="p-6 text-center">
                    <AlertCircle className="h-12 w-12 text-status-error mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      Booking Error
                    </h3>
                    <p className="text-text-secondary mb-4">
                      We encountered an error while loading the booking wizard. Please try again.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={resetError} variant="outline">
                        Try Again
                      </Button>
                      <Button onClick={handleWizardCancel} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              >
                <PublicBookingWizard
                  tenantId={tenant.id}
                  slug={slug}
                  formData={publicFormData}
                  onFormDataChange={setPublicFormData}
                  onCancel={handleWizardCancel}
                  primaryColor={primaryColor}
                  tenantName={tenant.name}
                  isAuthenticated={isAuthenticated && !!patientId}
                  onConfirmBooking={isAuthenticated ? handlePublicBookingConfirm : undefined}
                  isSaving={isSavingAppointment}
                  saveError={wizardSaveError}
                />
              </ErrorBoundary>
            </CardContent>
          </Card>
        </main>

        <footer 
          className="py-8 mt-auto"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white/90">
            <p>© {new Date().getFullYear()} {tenant.name}. Powered by <a href="https://zenthea.ai" className="underline hover:no-underline">Zenthea</a></p>
          </div>
        </footer>
      </div>
    );
  }

  // Account required mode - requires auth upfront (existing patient direct scheduling)
  if (bookingMode === "account_required") {
    const isPatient = session?.user?.role === 'patient';
    const isAuthenticated = authStatus === 'authenticated' && isPatient;

    // Not authenticated - show login/register options
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-background-primary flex flex-col" style={brandingStyles}>
          {/* Header */}
          <header className="border-b border-border-primary" style={{ backgroundColor: backgroundColor }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <Link 
                href={`/clinic/${slug}`}
                className="inline-flex items-center transition-colors hover:opacity-80"
                style={{ color: primaryColor }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {tenant.name}
              </Link>
            </div>
          </header>

          {/* Login/Register Options */}
          <main className="flex-1 flex items-center justify-center px-4 py-12">
            <div className="text-center max-w-md mx-auto">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <Calendar className="h-10 w-10" style={{ color: primaryColor }} />
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-4">
                Book an Appointment
              </h1>
              <p className="mb-8" style={{ color: primaryColor }}>
                Sign in to your patient account or create a new one to book an appointment with {tenant.name}.
              </p>
              
              <div className="space-y-4">
                <Link href={`/clinic/${slug}/login?redirect=${encodeURIComponent(`/clinic/${slug}/book`)}`}>
                  <Button 
                    className="w-full" 
                    style={{ backgroundColor: primaryColor }}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In to Book
                  </Button>
                </Link>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border-primary" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background-primary px-2 text-text-tertiary">
                      New patient?
                    </span>
                  </div>
                </div>
                
                <Link href={`/clinic/${slug}/register?redirect=${encodeURIComponent(`/clinic/${slug}/book`)}`}>
                  <Button variant="outline" className="w-full">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Patient Account
                  </Button>
                </Link>
              </div>
              
              <p className="text-sm text-text-tertiary mt-6">
                Need help? Contact us at{" "}
                <a 
                  href={`tel:${tenant.contactInfo.phone}`}
                  className="underline hover:no-underline"
                  style={{ color: primaryColor }}
                >
                  {tenant.contactInfo.phone}
                </a>
              </p>
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-border-primary py-6" style={{ backgroundColor: backgroundColor }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-text-secondary">
              <p>© {new Date().getFullYear()} {tenant.name}. Powered by <a href="https://zenthea.ai" className="hover:underline">Zenthea</a></p>
            </div>
          </footer>
        </div>
      );
    }

    // Authenticated - check for patient profile loading
    if (patientLoading || careTeamLoading) {
      return <BookingPageSkeleton />;
    }

    // Authenticated but no patient record - redirect to intake
    if (!patientId) {
      router.push(`/patient/onboarding/intake?redirect=${encodeURIComponent(`/clinic/${slug}/book`)}`);
      return <BookingPageSkeleton />;
    }

    // Check if patient has a care team
    const hasCareTeam = careTeam && careTeam.length > 0;

    // No care team - show message and redirect to intake
    if (!hasCareTeam) {
      return (
        <div className="min-h-screen bg-background-primary flex flex-col" style={brandingStyles}>
          <header className="border-b border-border-primary" style={{ backgroundColor: backgroundColor }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <Link 
                href={`/clinic/${slug}`}
                className="inline-flex items-center transition-colors hover:opacity-80"
                style={{ color: primaryColor }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {tenant.name}
              </Link>
            </div>
          </header>

          <main className="flex-1 flex items-center justify-center px-4 py-12">
            <div className="text-center max-w-md mx-auto">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <Users className="h-10 w-10" style={{ color: primaryColor }} />
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-4">
                Complete Your Profile
              </h1>
              <p className="mb-8" style={{ color: primaryColor }}>
                Before booking an appointment, please complete your patient intake form and select a primary care provider.
              </p>
              
              <div className="space-y-4">
                <Link href={`/patient/onboarding/intake?redirect=${encodeURIComponent(`/clinic/${slug}/book`)}`}>
                  <Button 
                    className="w-full" 
                    style={{ backgroundColor: primaryColor }}
                  >
                    Complete Intake Form
                  </Button>
                </Link>
                <Link href={`/clinic/${slug}`}>
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Return to Home
                  </Button>
                </Link>
              </div>
            </div>
          </main>

          <footer className="border-t border-border-primary py-6" style={{ backgroundColor: backgroundColor }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-text-secondary">
              <p>© {new Date().getFullYear()} {tenant.name}. Powered by <a href="https://zenthea.ai" className="hover:underline">Zenthea</a></p>
            </div>
          </footer>
        </div>
      );
    }

    // Booking success state
    if (bookingSuccess) {
      return (
        <div 
          className="min-h-screen bg-background-primary flex items-center justify-center"
          style={brandingStyles}
        >
          <div className="text-center max-w-md mx-auto px-4">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <CheckCircle className="h-10 w-10" style={{ color: primaryColor }} />
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-4">
              Appointment Booked!
            </h1>
            <p className="mb-8" style={{ color: primaryColor }}>
              Your appointment has been successfully scheduled. You can view and manage your appointments in your patient portal.
            </p>
            <div className="space-y-4">
              <Link href="/patient/appointments">
                <Button className="w-full" style={{ backgroundColor: primaryColor }}>
                  View My Appointments
                </Button>
              </Link>
              <Link href={`/clinic/${slug}`}>
                <Button variant="outline" className="w-full">
                  Return to {tenant.name}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // Authenticated with care team - show booking wizard
    return (
      <div className="min-h-screen bg-background-primary flex flex-col" style={brandingStyles}>
          <header className="border-b border-border-primary" style={{ backgroundColor: backgroundColor }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link 
              href={`/clinic/${slug}`}
              className="inline-flex items-center transition-colors hover:opacity-80"
              style={{ color: primaryColor }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {tenant.name}
            </Link>
          </div>
        </header>

        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <div className="text-center mb-8">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Calendar className="h-8 w-8" style={{ color: primaryColor }} />
            </div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Book an Appointment
            </h1>
            <p style={{ color: primaryColor }}>
              Select a provider from your care team and choose a convenient time.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <ErrorBoundary
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                fallback={({ error: _error, resetError }) => (
                  <div className="p-6 text-center">
                    <AlertCircle className="h-12 w-12 text-status-error mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      Booking Error
                    </h3>
                    <p className="text-text-secondary mb-4">
                      We encountered an error while loading the booking wizard. Please try again.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={resetError} variant="outline">
                        Try Again
                      </Button>
                      <Button onClick={handleWizardCancel} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              >
                <AppointmentBookingWizard
                  tenantId={session?.user?.tenantId || tenant.id}
                  formData={wizardFormData}
                  onFormDataChange={setWizardFormData}
                  onSave={handleWizardSave}
                  onCancel={handleWizardCancel}
                  isSaving={isSavingAppointment}
                  saveError={wizardSaveError}
                />
              </ErrorBoundary>
            </CardContent>
          </Card>
        </main>

        <footer 
          className="py-8 mt-auto"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white/90">
            <p>© {new Date().getFullYear()} {tenant.name}. Powered by <a href="https://zenthea.ai" className="underline hover:no-underline">Zenthea</a></p>
          </div>
        </footer>
      </div>
    );
  }

  // Request mode - show booking request form (original behavior)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const validDates = formData.preferredDates.filter(d => d.trim() !== "");
      
      if (validDates.length === 0) {
        throw new Error("Please select at least one preferred date");
      }

      await createBookingRequest({
        tenantSlug: slug,
        clinicId: preselectedClinic || undefined,
        providerId: preselectedProvider ? preselectedProvider as Id<"publicProviderProfiles"> : undefined,
        patientName: formData.patientName,
        patientEmail: formData.patientEmail,
        patientPhone: formData.patientPhone || undefined,
        preferredDates: validDates,
        preferredTimeOfDay: formData.preferredTimeOfDay,
        notes: formData.notes || undefined,
        source: "landing_page",
        sourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      });

      setSubmitSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit booking request";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addDateField = () => {
    if (formData.preferredDates.length < MAX_PREFERRED_DATES) {
      setFormData(prev => ({
        ...prev,
        preferredDates: [...prev.preferredDates, ""]
      }));
    }
  };

  const updateDate = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      preferredDates: prev.preferredDates.map((d, i) => i === index ? value : d)
    }));
  };

  // Success state for request mode
  if (submitSuccess) {
    return (
      <div 
        className="min-h-screen bg-background-primary flex items-center justify-center"
        style={brandingStyles}
      >
        <div className="text-center max-w-md mx-auto px-4">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <CheckCircle className="h-10 w-10" style={{ color: primaryColor }} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            Request Submitted!
          </h1>
          <p className="mb-8" style={{ color: primaryColor }}>
            {bookingSettings?.confirmationMessage || 
              "Thank you for your booking request. Our team will contact you shortly to confirm your appointment."}
          </p>
          <div className="space-y-4">
            <Link href={`/clinic/${slug}`}>
              <Button className="w-full" style={{ backgroundColor: primaryColor }}>
                Return to {tenant.name}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Request mode form
  return (
    <div 
      className="min-h-screen bg-background-primary"
      style={brandingStyles}
    >
      <header className="bg-white border-b border-border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href={`/clinic/${slug}`}
            className="inline-flex items-center transition-colors hover:opacity-80"
            style={{ color: primaryColor }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {tenant.name}
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <Calendar className="h-8 w-8" style={{ color: primaryColor }} />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Request an Appointment
          </h1>
          <p style={{ color: primaryColor }}>
            {bookingSettings?.welcomeMessage || 
              "Fill out the form below and we'll contact you to confirm your appointment."}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
            <CardDescription>
              Please provide your contact details so we can reach you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-status-error/10 border border-status-error/20 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-status-error flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-status-error">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-status-error">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Smith"
                    value={formData.patientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-status-error">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.patientEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientEmail: e.target.value }))}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number
                  {bookingSettings?.requirePhone && <span className="text-status-error"> *</span>}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.patientPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientPhone: e.target.value }))}
                    required={bookingSettings?.requirePhone ?? false}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Preferred Date(s) <span className="text-status-error">*</span>
                </Label>
                <p className="text-sm text-text-secondary mb-2">
                  Select up to 5 preferred dates for your appointment.
                </p>
                {formData.preferredDates.map((date, index) => (
                  <div key={index} className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => updateDate(index, e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="pl-10"
                    />
                  </div>
                ))}
                {formData.preferredDates.length < MAX_PREFERRED_DATES && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addDateField}
                  >
                    + Add Another Date
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeOfDay">Preferred Time of Day</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <select
                    id="timeOfDay"
                    value={formData.preferredTimeOfDay}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      preferredTimeOfDay: e.target.value as typeof formData.preferredTimeOfDay
                    }))}
                    className="w-full pl-10 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="any">Any time</option>
                    <option value="morning">Morning (8am - 12pm)</option>
                    <option value="afternoon">Afternoon (12pm - 5pm)</option>
                    <option value="evening">Evening (5pm - 8pm)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Reason for Visit / Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Please describe the reason for your visit..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                style={{ backgroundColor: primaryColor }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Submit Appointment Request
                  </>
                )}
              </Button>

              <p className="text-xs text-text-tertiary text-center">
                By submitting this form, you agree to be contacted by {tenant.name} regarding your appointment request.
              </p>
            </form>
          </CardContent>
        </Card>
      </main>

      <footer 
        className="py-8 mt-auto"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white/90">
          <p>© {new Date().getFullYear()} {tenant.name}. Powered by <a href="https://zenthea.ai" className="underline hover:no-underline">Zenthea</a></p>
        </div>
      </footer>
    </div>
  );
}

function BookingPageSkeleton() {
  return (
    <div className="min-h-screen bg-background-primary animate-pulse">
      <header className="bg-white border-b border-border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="h-6 w-32 bg-surface-secondary rounded" />
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-surface-secondary rounded-full mx-auto mb-4" />
          <div className="h-8 w-64 bg-surface-secondary rounded mx-auto mb-2" />
          <div className="h-4 w-80 bg-surface-secondary rounded mx-auto" />
        </div>
        <div className="bg-white rounded-lg p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-4 w-24 bg-surface-secondary rounded mb-2" />
                <div className="h-10 bg-surface-secondary rounded" />
              </div>
            ))}
            <div className="h-12 bg-surface-secondary rounded" />
          </div>
        </div>
      </main>
    </div>
  );
}
