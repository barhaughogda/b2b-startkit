"use client";

import React from "react";
import { useParams, notFound, redirect } from "next/navigation";
import { useTenantPublicData, type PagePublicData } from "@/hooks/useTenantPublicData";
import { SiteRenderer, type SiteRendererProps } from "@/components/website-builder/SiteRenderer";
import { SEOHead } from "@/components/website-builder/SEOHead";
import type { SEOConfig, PageConfig } from "@/lib/website-builder/schema";

/**
 * Dynamic Page Route for Multi-Page Websites
 * 
 * Handles routes like:
 * - /clinic/[slug]/services
 * - /clinic/[slug]/team
 * - /clinic/[slug]/locations
 * - /clinic/[slug]/contact
 * - /clinic/[slug]/terms
 * - /clinic/[slug]/privacy
 * - /clinic/[slug]/[custom-page]
 */
export default function TenantSubPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const pageSlug = params?.pageSlug as string;
  
  const { tenant, isLoading, notFound: tenantNotFound } = useTenantPublicData(slug);

  // Loading state
  if (isLoading) {
    return <PageSkeleton />;
  }

  // Tenant not found
  if (tenantNotFound || !tenant) {
    notFound();
  }

  // Check if website builder is published
  const websiteBuilder = tenant.websiteBuilder;
  const hasPublishedWebsiteBuilder = websiteBuilder?.publishedAt != null;

  // If no website builder or it's one-pager, redirect to home
  if (!hasPublishedWebsiteBuilder || websiteBuilder?.siteStructure === 'one-pager') {
    redirect(`/clinic/${slug}`);
  }

  // Find the requested page
  const pages = websiteBuilder.pages || [];
  const page = pages.find(p => p.slug === pageSlug);

  // Page not found
  if (!page) {
    notFound();
  }

  // Page is disabled, redirect to home
  if (!page.enabled) {
    redirect(`/clinic/${slug}`);
  }

  return (
    <SubPageRenderer
      websiteBuilder={websiteBuilder}
      page={page}
      tenant={tenant}
      slug={slug}
    />
  );
}

// =============================================================================
// SUB PAGE RENDERER
// =============================================================================

interface SubPageRendererProps {
  websiteBuilder: NonNullable<ReturnType<typeof useTenantPublicData>['tenant']>['websiteBuilder'];
  page: PagePublicData;
  tenant: NonNullable<ReturnType<typeof useTenantPublicData>['tenant']>;
  slug: string;
}

function SubPageRenderer({
  websiteBuilder,
  page,
  tenant,
  slug,
}: SubPageRendererProps) {
  if (!websiteBuilder) return null;

  // Transform the websiteBuilder data to inject tenant-specific URLs
  const transformedWebsiteBuilder = {
    ...websiteBuilder,
    header: {
      ...websiteBuilder.header,
      // Inject tenant-specific URLs for sign in and booking
      signInUrl: `/clinic/${slug}/login?redirect=${encodeURIComponent('/patient/calendar?tab=today')}`,
      bookUrl: `/clinic/${slug}/book`,
    },
    // Use the page's blocks instead of the main blocks
    blocks: page.blocks,
  };

  // Generate page-specific SEO
  const pageSeo: SEOConfig = {
    title: `${page.title} | ${tenant.name}`,
    description: websiteBuilder.seo?.description || tenant.description || undefined,
    twitterCard: 'summary_large_image' as const,
    noIndex: websiteBuilder.seo?.noIndex ?? false,
  };

  return (
    <>
      {/* SEO Head */}
      <SEOHead
        seo={pageSeo}
        tenantName={tenant.name}
        tenantSlug={slug}
      />
      
      {/* Site Content */}
      <SiteRenderer
        websiteBuilder={transformedWebsiteBuilder as any}
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

// =============================================================================
// LOADING SKELETON
// =============================================================================

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Header skeleton */}
      <div className="h-16 bg-surface-secondary animate-pulse" />
      
      {/* Hero skeleton */}
      <div className="h-64 bg-surface-secondary animate-pulse" />
      
      {/* Content skeleton */}
      <div className="container mx-auto px-4 py-12">
        <div className="space-y-8">
          <div className="h-8 w-48 bg-surface-secondary rounded animate-pulse" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-surface-secondary rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

