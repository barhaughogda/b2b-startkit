"use client";

import React, { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTenantPublicData, type WebsiteBuilderPublicData } from "@/hooks/useTenantPublicData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProviderGallery } from "@/components/provider/ProviderGallery";
import { ProviderDetailModal } from "@/components/provider/ProviderDetailModal";
import { SiteRenderer, type SiteRendererProps } from "@/components/website-builder/SiteRenderer";
import { SEOHead } from "@/components/website-builder/SEOHead";
import type { SEOConfig, PageConfig } from "@/lib/website-builder/schema";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Calendar, 
  Users, 
  Building2,
  ArrowRight,
  Clock,
  Heart,
  Sparkles
} from "lucide-react";

/**
 * Public Landing Page for a Tenant
 * 
 * This page supports two rendering modes:
 * 1. Website Builder (new) - Renders from websiteBuilder configuration when published
 * 2. Legacy Landing Page - Falls back to old landingPage config for backwards compatibility
 * 
 * The websiteBuilder takes precedence if it exists and has publishedAt timestamp.
 */
export default function TenantLandingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  
  const { tenant, isLoading, notFound: tenantNotFound } = useTenantPublicData(slug);

  // Fetch providers for care team section
  const providers = useQuery(
    api.publicLanding.getPublicProviderProfiles,
    tenant?.id ? { tenantId: tenant.id, limit: 4 } : "skip"
  );

  // Modal state
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle provider card click
  const handleProviderClick = useCallback((providerId: string) => {
    setSelectedProviderId(providerId);
    setIsModalOpen(true);
  }, []);

  // Handle book click
  const handleBookClick = useCallback((providerId: string) => {
    router.push(`/clinic/${slug}/book?provider=${providerId}`);
  }, [router, slug]);

  // Handle modal book click
  const handleModalBookClick = useCallback(() => {
    if (selectedProviderId) {
      setIsModalOpen(false);
      router.push(`/clinic/${slug}/book?provider=${selectedProviderId}`);
    }
  }, [router, slug, selectedProviderId]);

  // Loading state
  if (isLoading) {
    return <LandingPageSkeleton />;
  }

  // Not found state
  // SECURITY: Query already filters by status="active", so if tenant is null, it doesn't exist or isn't active
  if (tenantNotFound || !tenant) {
    return <TenantNotFound slug={slug} />;
  }

  // Check if landing page is enabled (check both old and new configs)
  const websiteBuilder = tenant.websiteBuilder;
  const hasPublishedWebsiteBuilder = websiteBuilder?.publishedAt != null;
  const legacyEnabled = tenant.landingPage?.enabled !== false;

  if (!hasPublishedWebsiteBuilder && !legacyEnabled) {
    return <LandingPageDisabled tenant={tenant} />;
  }

  // If website builder is published, render using the new SiteRenderer
  if (hasPublishedWebsiteBuilder && websiteBuilder) {
    return (
      <WebsiteBuilderLanding 
        websiteBuilder={websiteBuilder}
        tenant={tenant}
        slug={slug}
      />
    );
  }

  // Fall back to legacy landing page
  const {
    name,
    tagline,
    description,
    branding,
    contactInfo,
    landingPage,
    bookingSettings,
    features,
  } = tenant;

  const isBookingEnabled = features.onlineScheduling && bookingSettings?.mode !== "disabled";

  // Custom CSS variables for tenant branding
  const brandingStyles = {
    "--tenant-primary": branding.primaryColor,
    "--tenant-secondary": branding.secondaryColor,
    "--tenant-accent": branding.accentColor || branding.primaryColor,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen" style={brandingStyles}>
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-border-primary sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {branding.logo ? (
                <img 
                  src={branding.logo} 
                  alt={`${name} logo`}
                  className="h-10 w-auto"
                />
              ) : (
                <div 
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {name.charAt(0)}
                </div>
              )}
              <span className="text-xl font-semibold text-text-primary">{name}</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href={`/clinic/${slug}/login?redirect=${encodeURIComponent('/patient/calendar?tab=today')}`}>
                <Button variant="outline">Sign In</Button>
              </Link>
              {isBookingEnabled && (
                <Link href={`/clinic/${slug}/book`}>
                  <Button 
                    style={{ backgroundColor: branding.primaryColor }}
                    className="text-white hover:opacity-90 shadow-lg shadow-black/10"
                  >
                    Book Appointment
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="relative py-20 lg:py-32 overflow-hidden"
        style={{ 
          background: landingPage?.heroImage 
            ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${landingPage.heroImage}) center/cover`
            : `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`
        }}
      >
        {/* Decorative blur elements */}
        {!landingPage?.heroImage && (
          <>
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          </>
        )}
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
            {landingPage?.heroTitle || `Welcome to ${name}`}
          </h1>
          <p className="text-xl lg:text-2xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
            {landingPage?.heroSubtitle || tagline || description || "Quality healthcare for you and your family"}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isBookingEnabled && (
              <Link href={`/clinic/${slug}/book`}>
                <Button 
                  size="lg"
                  className="bg-white hover:bg-white/95 text-lg px-8 shadow-xl"
                  style={{ color: branding.primaryColor }}
                >
                  <Calendar className="mr-2 h-5 w-5" />
                  {landingPage?.heroCtaText || "Book an Appointment"}
                </Button>
              </Link>
            )}
            <Link href={`/clinic/${slug}/providers`}>
              <Button 
                size="lg" 
                className="text-lg px-8 text-white hover:bg-white/10 border-2 border-white/30"
                variant="ghost"
              >
                <Users className="mr-2 h-5 w-5" />
                Meet Our Team
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Care Team Preview Section - NEW */}
      {landingPage?.showCareTeam !== false && providers && providers.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center mb-12">
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
                style={{ backgroundColor: `${branding.primaryColor}10` }}
              >
                <Sparkles className="h-4 w-4" style={{ color: branding.primaryColor }} />
                <span className="text-sm font-medium" style={{ color: branding.primaryColor }}>
                  Expert Care
                </span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-4">
                Meet Our Care Team
              </h2>
              <p className="text-lg text-text-secondary max-w-2xl mx-auto">
                Our dedicated healthcare professionals are committed to providing you with 
                personalized, compassionate care.
              </p>
            </div>

            {/* Provider Gallery */}
            <ProviderGallery
              providers={providers}
              tenantSlug={slug}
              isBookingEnabled={isBookingEnabled}
              brandingColor={branding.primaryColor}
              onProviderClick={handleProviderClick}
              onBookClick={handleBookClick}
              limit={4}
              showViewAll={providers.length >= 4}
            />
          </div>
        </section>
      )}

      {/* Services Section */}
      {landingPage?.showServices !== false && (
        <section className="py-16 bg-background-secondary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-text-primary text-center mb-12">
              Our Services
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {bookingSettings?.appointmentTypes?.map((type) => (
                <Card key={type.id} className="hover:shadow-lg transition-shadow border-0 bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5" style={{ color: branding.primaryColor }} />
                      {type.name}
                    </CardTitle>
                    {type.description && (
                      <CardDescription>{type.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-text-secondary text-sm">
                      <Clock className="h-4 w-4 mr-2" />
                      {type.duration} minutes
                    </div>
                  </CardContent>
                </Card>
              )) || (
                // Default services if none configured
                <>
                  <ServiceCard 
                    icon={<Heart />}
                    title="Primary Care"
                    description="Comprehensive healthcare for all ages"
                    color={branding.primaryColor}
                  />
                  <ServiceCard 
                    icon={<Users />}
                    title="Family Medicine"
                    description="Care for your entire family"
                    color={branding.primaryColor}
                  />
                  <ServiceCard 
                    icon={<Calendar />}
                    title="Preventive Care"
                    description="Wellness exams and health screenings"
                    color={branding.primaryColor}
                  />
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-text-primary text-center mb-12">
            Contact Us
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ContactCard 
              icon={<MapPin />}
              title="Address"
              content={`${contactInfo.address.street}, ${contactInfo.address.city}, ${contactInfo.address.state} ${contactInfo.address.zipCode}`}
              color={branding.primaryColor}
            />
            <ContactCard 
              icon={<Phone />}
              title="Phone"
              content={contactInfo.phone}
              href={`tel:${contactInfo.phone}`}
              color={branding.primaryColor}
            />
            <ContactCard 
              icon={<Mail />}
              title="Email"
              content={contactInfo.email}
              href={`mailto:${contactInfo.email}`}
              color={branding.primaryColor}
            />
            {contactInfo.website && (
              <ContactCard 
                icon={<Globe />}
                title="Website"
                content={contactInfo.website.replace(/^https?:\/\//, '')}
                href={contactInfo.website}
                color={branding.primaryColor}
              />
            )}
          </div>
        </div>
      </section>

      {/* Quick Links Section */}
      {landingPage?.showClinics !== false && (
        <section className="py-16 bg-background-secondary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Only show care team link card if no preview section */}
              {(landingPage?.showCareTeam === false || !providers || providers.length === 0) && (
                <Card className="hover:shadow-lg transition-shadow border-0 bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-6 w-6" style={{ color: branding.primaryColor }} />
                      Meet Our Care Team
                    </CardTitle>
                    <CardDescription>
                      Get to know our experienced healthcare providers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/clinic/${slug}/providers`}>
                      <Button variant="outline" className="w-full">
                        View Providers
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
              <Card className="hover:shadow-lg transition-shadow border-0 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-6 w-6" style={{ color: branding.primaryColor }} />
                    Our Locations
                  </CardTitle>
                  <CardDescription>
                    Find a clinic near you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/clinic/${slug}/locations`}>
                    <Button variant="outline" className="w-full">
                      View Locations
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer 
        className="py-12"
        style={{ backgroundColor: branding.primaryColor }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between text-white/90">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              {branding.logo ? (
                <img 
                  src={branding.logo} 
                  alt={`${name} logo`}
                  className="h-8 w-auto brightness-0 invert"
                />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold">
                  {name.charAt(0)}
                </div>
              )}
              <span className="text-lg font-semibold">{name}</span>
            </div>
            <div className="text-sm text-center md:text-right">
              <p>© {new Date().getFullYear()} {name}. All rights reserved.</p>
              <p className="mt-1 text-white/70">Powered by <a href="https://zenthea.ai" className="underline hover:no-underline text-white/90">Zenthea</a></p>
            </div>
          </div>
        </div>
      </footer>

      {/* Provider Detail Modal */}
      <ProviderDetailModal
        publicProfileId={selectedProviderId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        viewerType="public"
        tenantSlug={slug}
        isBookingEnabled={isBookingEnabled}
        brandingColor={branding.primaryColor}
        onBookClick={handleModalBookClick}
      />
    </div>
  );
}

// Helper Components

function ServiceCard({ 
  icon, 
  title, 
  description, 
  color 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  color: string;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow border-0 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span style={{ color }}>{icon}</span>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function ContactCard({ 
  icon, 
  title, 
  content, 
  href, 
  color 
}: { 
  icon: React.ReactNode; 
  title: string; 
  content: string; 
  href?: string;
  color: string;
}) {
  const ContentWrapper = href ? 'a' : 'div';
  
  return (
    <Card className="text-center hover:shadow-lg transition-shadow border-0 bg-background-secondary">
      <CardContent className="pt-6">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: `${color}15` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <h3 className="font-semibold text-text-primary mb-2">{title}</h3>
        <ContentWrapper 
          href={href}
          className={href ? "text-text-secondary hover:underline" : "text-text-secondary"}
          target={href?.startsWith('http') ? '_blank' : undefined}
          rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {content}
        </ContentWrapper>
      </CardContent>
    </Card>
  );
}

function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header skeleton */}
      <header className="bg-white border-b border-border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-surface-secondary rounded-lg animate-pulse" />
              <div className="h-6 w-32 bg-surface-secondary rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-20 bg-surface-secondary rounded animate-pulse" />
              <div className="h-10 w-32 bg-surface-secondary rounded animate-pulse" />
            </div>
          </div>
        </div>
      </header>
      
      {/* Hero skeleton */}
      <section className="py-20 lg:py-32 bg-surface-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="h-12 w-3/4 bg-surface-elevated rounded mx-auto mb-6 animate-pulse" />
          <div className="h-8 w-2/3 bg-surface-elevated rounded mx-auto mb-8 animate-pulse" />
          <div className="flex gap-4 justify-center">
            <div className="h-12 w-48 bg-surface-elevated rounded animate-pulse" />
            <div className="h-12 w-48 bg-surface-elevated rounded animate-pulse" />
          </div>
        </div>
      </section>

      {/* Care Team skeleton */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="h-8 w-48 bg-surface-secondary rounded-full mx-auto mb-4 animate-pulse" />
            <div className="h-10 w-64 bg-surface-secondary rounded mx-auto mb-4 animate-pulse" />
            <div className="h-6 w-96 bg-surface-secondary rounded mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-background-secondary rounded-2xl overflow-hidden">
                <div className="aspect-[4/5] bg-surface-secondary animate-pulse" />
                <div className="p-5">
                  <div className="h-6 w-32 bg-surface-secondary rounded mb-2 animate-pulse" />
                  <div className="h-4 w-24 bg-surface-secondary rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function TenantNotFound({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-status-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Building2 className="h-8 w-8 text-status-error" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-4">
          Clinic Not Found
        </h1>
        <p className="text-text-secondary mb-8">
          We couldn&apos;t find a clinic with the identifier &quot;{slug}&quot;. 
          Please check the URL and try again.
        </p>
        <Link href="/">
          <Button>
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

function LandingPageDisabled({ tenant }: { tenant: { name: string; contactInfo: { phone: string; email: string } } }) {
  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-status-warning/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Building2 className="h-8 w-8 text-status-warning" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-4">
          {tenant.name}
        </h1>
        <p className="text-text-secondary mb-8">
          Our online portal is currently unavailable. Please contact us directly.
        </p>
        <div className="space-y-4">
          <a href={`tel:${tenant.contactInfo.phone}`}>
            <Button variant="outline" className="w-full">
              <Phone className="mr-2 h-4 w-4" />
              {tenant.contactInfo.phone}
            </Button>
          </a>
          <a href={`mailto:${tenant.contactInfo.email}`}>
            <Button variant="outline" className="w-full">
              <Mail className="mr-2 h-4 w-4" />
              {tenant.contactInfo.email}
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// WEBSITE BUILDER TYPES AND COMPONENTS
// =============================================================================

/**
 * Tenant data type for WebsiteBuilderLanding
 */
interface TenantData {
  id: string;
  name: string;
  slug?: string | null;
  branding: {
    logo?: string | null;
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string | null;
  };
  contactInfo: {
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    website?: string | null;
  };
  websiteBuilder?: WebsiteBuilderPublicData | null;
  bookingSettings?: {
    mode?: "full" | "request" | "account_required" | "disabled" | null;
    appointmentTypes?: Array<{
      id: string;
      name: string;
      duration: number;
      description?: string | null;
    }> | null;
    welcomeMessage?: string | null;
    confirmationMessage?: string | null;
    requirePhone?: boolean | null;
    requireInsurance?: boolean | null;
    requireDateOfBirth?: boolean | null;
    advanceBookingDays?: number | null;
    minimumNoticeHours?: number | null;
  } | null;
}

/**
 * WebsiteBuilderLanding - Renders the site using the website builder configuration
 */
function WebsiteBuilderLanding({
  websiteBuilder,
  tenant,
  slug,
}: {
  websiteBuilder: WebsiteBuilderPublicData;
  tenant: TenantData;
  slug: string;
}) {
  // Transform the websiteBuilder data to inject tenant-specific URLs
  const transformedWebsiteBuilder = {
    ...websiteBuilder,
    header: {
      ...websiteBuilder.header,
      // Inject tenant-specific URLs for sign in and booking
      signInUrl: `/clinic/${slug}/login?redirect=${encodeURIComponent('/patient/calendar?tab=today')}`,
      bookUrl: `/clinic/${slug}/book`,
    },
  };

  // Transform SEO config to match expected type
  const seoConfig: SEOConfig | undefined = websiteBuilder.seo ? {
    ...websiteBuilder.seo,
    twitterCard: (websiteBuilder.seo.twitterCard === 'summary' || websiteBuilder.seo.twitterCard === 'summary_large_image')
      ? websiteBuilder.seo.twitterCard
      : 'summary_large_image',
    noIndex: websiteBuilder.seo.noIndex ?? false,
  } : undefined;

  return (
    <>
      {/* SEO Head */}
      {seoConfig && (
        <SEOHead
          seo={seoConfig}
          tenantName={tenant.name}
          tenantSlug={slug}
        />
      )}
      
      {/* Site Content */}
      <SiteRenderer
        websiteBuilder={transformedWebsiteBuilder as SiteRendererProps['websiteBuilder']}
        tenantName={tenant.name}
        tenantId={tenant.id}
        logoUrl={tenant.branding.logo ?? undefined}
        contactInfo={tenant.contactInfo}
        basePath={`/clinic/${slug}`}
        tenantFooterData={{
          appointmentTypes: tenant.bookingSettings?.appointmentTypes || null,
          pages: (websiteBuilder.pages || null) as PageConfig[] | null,
          siteStructure: websiteBuilder.siteStructure || 'multi-page',
          basePath: `/clinic/${slug}`,
        }}
      />
    </>
  );
}
