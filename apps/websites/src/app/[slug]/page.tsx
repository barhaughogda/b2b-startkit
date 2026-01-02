import React from 'react';
import { notFound } from 'next/navigation';
import { convex } from '@/lib/convex';
import { api } from '@/convex/_generated/api';
import { SiteRenderer } from '@/components/website-builder/SiteRenderer';
import { SEOHead } from '@/components/website-builder/SEOHead';

interface PublicClinicPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicClinicPage({ params }: PublicClinicPageProps) {
  const { slug } = await params;

  // Fetch published site data from Convex
  // We use the HttpClient for server-side fetching in Next.js App Router
  // Note: We'll need a public query for this
  const siteData = await (convex as any).query(api.websiteBuilder.getPublishedWebsiteBySlug, { slug });

  if (!siteData) {
    notFound();
  }

  const { websiteBuilder, tenantName, tenantId, logoUrl, contactInfo, bookingSettings } = siteData;

  return (
    <>
      {websiteBuilder.seo && (
        <SEOHead
          seo={websiteBuilder.seo}
          tenantName={tenantName}
          tenantSlug={slug}
        />
      )}
      <SiteRenderer
        websiteBuilder={websiteBuilder}
        tenantName={tenantName}
        tenantId={tenantId}
        tenantSlug={slug}
        logoUrl={logoUrl}
        contactInfo={contactInfo}
        basePath={`/${slug}`}
      />
    </>
  );
}
