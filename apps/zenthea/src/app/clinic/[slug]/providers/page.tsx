"use client";

import React, { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTenantPublicData } from "@/hooks/useTenantPublicData";
import { Button } from "@/components/ui/button";
import { ProviderGallery } from "@/components/provider/ProviderGallery";
import { ProviderDetailModal } from "@/components/provider/ProviderDetailModal";
import { ArrowLeft, Calendar, Users, Sparkles } from "lucide-react";

/**
 * Public Care Team / Providers Page
 * 
 * A premium gallery page displaying healthcare providers with:
 * - Stunning hero section with animated background
 * - Interactive provider gallery with staggered animations
 * - Detailed provider modal with full profile information
 * - Integrated booking flow
 */
export default function TenantProvidersPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  
  const { tenant, isLoading: tenantLoading, notFound } = useTenantPublicData(slug);
  
  const providers = useQuery(
    api.publicLanding.getPublicProviderProfiles,
    tenant?.id ? { tenantId: tenant.id } : "skip"
  );

  // Modal state
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle provider card click
  const handleProviderClick = useCallback((providerId: string) => {
    setSelectedProviderId(providerId);
    setIsModalOpen(true);
  }, []);

  // Handle book click from gallery card
  const handleBookClick = useCallback((providerId: string) => {
    router.push(`/clinic/${slug}/book?provider=${providerId}`);
  }, [router, slug]);

  // Handle book click from modal
  const handleModalBookClick = useCallback(() => {
    if (selectedProviderId) {
      setIsModalOpen(false);
      router.push(`/clinic/${slug}/book?provider=${selectedProviderId}`);
    }
  }, [router, slug, selectedProviderId]);

  // Loading state
  if (tenantLoading || providers === undefined) {
    return <ProvidersPageSkeleton />;
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

  const { branding, bookingSettings, features } = tenant;
  const isBookingEnabled = features.onlineScheduling && bookingSettings?.mode !== "disabled";

  return (
    <div 
      className="min-h-screen bg-background-primary"
      style={{
        "--tenant-primary": branding.primaryColor,
        "--tenant-secondary": branding.secondaryColor,
      } as React.CSSProperties}
    >
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-border-primary sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href={`/clinic/${slug}`}
              className="inline-flex items-center gap-2 font-medium transition-all hover:gap-3"
              style={{ color: branding.primaryColor }}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to {tenant.name}</span>
            </Link>
            {isBookingEnabled && (
              <Link href={`/clinic/${slug}/book`}>
                <Button 
                  style={{ backgroundColor: branding.primaryColor }}
                  className="text-white hover:opacity-90 shadow-lg shadow-black/10"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Book Appointment
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="relative py-20 lg:py-28 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${branding.primaryColor}08 0%, ${branding.secondaryColor}08 50%, ${branding.primaryColor}05 100%)`
        }}
      >
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: branding.primaryColor }}
          />
          <div 
            className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full opacity-15 blur-3xl"
            style={{ backgroundColor: branding.secondaryColor }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-border-primary mb-6">
            <Sparkles className="h-4 w-4" style={{ color: branding.primaryColor }} />
            <span className="text-sm font-medium text-text-secondary">
              Meet Your Healthcare Team
            </span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-text-primary mb-6 tracking-tight">
            Our Care Team
          </h1>
          
          <p className="text-lg lg:text-xl max-w-3xl mx-auto text-text-secondary leading-relaxed">
            Discover our dedicated healthcare professionals committed to providing you with 
            <span className="font-semibold" style={{ color: branding.primaryColor }}> exceptional, personalized care</span>. 
            Click on any provider to learn more about their expertise and book an appointment.
          </p>

          {/* Stats */}
          {providers && providers.length > 0 && (
            <div className="flex flex-wrap justify-center gap-8 mt-10">
              <div className="text-center">
                <div 
                  className="text-3xl lg:text-4xl font-bold mb-1"
                  style={{ color: branding.primaryColor }}
                >
                  {providers.length}
                </div>
                <div className="text-sm text-text-secondary">Care Providers</div>
              </div>
              <div className="text-center">
                <div 
                  className="text-3xl lg:text-4xl font-bold mb-1"
                  style={{ color: branding.primaryColor }}
                >
                  {new Set(providers.flatMap((p: { specialties?: string[] }) => p.specialties || [])).size}+
                </div>
                <div className="text-sm text-text-secondary">Specialties</div>
              </div>
              <div className="text-center">
                <div 
                  className="text-3xl lg:text-4xl font-bold mb-1"
                  style={{ color: branding.primaryColor }}
                >
                  {providers.filter((p: { acceptingNewPatients?: boolean }) => p.acceptingNewPatients).length}
                </div>
                <div className="text-sm text-text-secondary">Accepting Patients</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Content - Provider Gallery */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <ProviderGallery
          providers={providers || []}
          tenantSlug={slug}
          isBookingEnabled={isBookingEnabled}
          brandingColor={branding.primaryColor}
          onProviderClick={handleProviderClick}
          onBookClick={handleBookClick}
        />
      </main>

      {/* CTA Section */}
      {isBookingEnabled && providers && providers.length > 0 && (
        <section className="py-16 bg-white border-t border-border-primary">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Users 
              className="h-12 w-12 mx-auto mb-4"
              style={{ color: branding.primaryColor }}
            />
            <h2 className="text-2xl lg:text-3xl font-bold text-text-primary mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-text-secondary mb-8 max-w-2xl mx-auto">
              Our team is here to help you on your healthcare journey. 
              Schedule an appointment today and take the first step towards better health.
            </p>
            <Link href={`/clinic/${slug}/book`}>
              <Button 
                size="lg"
                className="text-white shadow-lg"
                style={{ backgroundColor: branding.primaryColor }}
              >
                <Calendar className="mr-2 h-5 w-5" />
                Schedule Your Visit
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer 
        className="py-10"
        style={{ backgroundColor: branding.primaryColor }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white/90">
          <p className="text-sm">
            © {new Date().getFullYear()} {tenant.name}. All rights reserved.
          </p>
          <p className="text-sm mt-2 text-white/70">
            Powered by <a href="https://zenthea.ai" className="underline hover:no-underline text-white/90">Zenthea</a>
          </p>
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

function ProvidersPageSkeleton() {
  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header Skeleton */}
      <header className="bg-white border-b border-border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 bg-surface-secondary rounded animate-pulse" />
            <div className="h-10 w-36 bg-surface-secondary rounded animate-pulse" />
          </div>
        </div>
      </header>

      {/* Hero Skeleton */}
      <section className="py-20 lg:py-28 bg-surface-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="h-8 w-48 bg-surface-secondary rounded-full mx-auto mb-6 animate-pulse" />
          <div className="h-14 w-80 bg-surface-secondary rounded mx-auto mb-6 animate-pulse" />
          <div className="h-6 w-[500px] max-w-full bg-surface-secondary rounded mx-auto mb-3 animate-pulse" />
          <div className="h-6 w-96 max-w-full bg-surface-secondary rounded mx-auto animate-pulse" />
        </div>
      </section>

      {/* Gallery Skeleton */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-border-primary">
              <div className="aspect-[4/5] bg-surface-secondary animate-pulse" />
              <div className="p-5">
                <div className="h-6 w-40 bg-surface-secondary rounded mb-2 animate-pulse" />
                <div className="h-4 w-32 bg-surface-secondary rounded mb-3 animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-5 w-20 bg-surface-secondary rounded animate-pulse" />
                  <div className="h-5 w-24 bg-surface-secondary rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
