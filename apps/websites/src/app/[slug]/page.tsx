import React from 'react';
import { notFound } from 'next/navigation';
import { convexHttp } from '@/lib/convex';
import { api } from '@/convex/_generated/api';
import { SiteRenderer } from '@/components/website-builder/SiteRenderer';
import { Metadata } from 'next';

interface PublicClinicPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PublicClinicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const siteData = await convexHttp.query(api.websiteBuilder.getPublishedWebsiteBySlug, { slug });

  if (!siteData || !siteData.websiteBuilder.seo) {
    return {};
  }

  const { websiteBuilder, tenantName } = siteData;
  const seo = websiteBuilder.seo;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenthea.ai';

  return {
    title: seo.title || `${tenantName} - Healthcare Services`,
    description: seo.description || `${tenantName} provides quality healthcare services.`,
    keywords: seo.keywords,
    alternates: {
      canonical: seo.canonicalUrl || `${baseUrl}/clinic/${slug}`,
    },
    robots: seo.noIndex ? 'noindex, nofollow' : 'index, follow',
    openGraph: {
      title: seo.ogTitle || seo.title || `${tenantName} - Healthcare Services`,
      description: seo.ogDescription || seo.description,
      images: [seo.ogImage || `${baseUrl}/og-default.png`],
      type: 'website',
      siteName: tenantName,
    },
    twitter: {
      card: seo.twitterCard === 'summary_large_image' ? 'summary_large_image' : 'summary',
      title: seo.ogTitle || seo.title,
      description: seo.ogDescription || seo.description,
      images: [seo.ogImage || `${baseUrl}/og-default.png`],
    },
  };
}

export default async function PublicClinicPage({ params }: PublicClinicPageProps) {
  const { slug } = await params;

  // Fetch published site data from Convex using the HTTP client for server components
  const siteData = await convexHttp.query(api.websiteBuilder.getPublishedWebsiteBySlug, { slug });

  if (!siteData) {
    notFound();
  }

  const { websiteBuilder, tenantName, tenantId, logoUrl, contactInfo } = siteData;

  return (
    <SiteRenderer
      websiteBuilder={websiteBuilder}
      tenantName={tenantName}
      tenantId={tenantId}
      tenantSlug={slug}
      logoUrl={logoUrl}
      contactInfo={contactInfo}
      basePath={`/${slug}`}
    />
  );
}
