'use client';

/**
 * SEO Head
 * 
 * Component for rendering SEO meta tags.
 * Uses Next.js Metadata API for proper SEO.
 */

import React from 'react';
import Head from 'next/head';
import type { SEOConfig } from '@/lib/website-builder/schema';

export interface SEOHeadProps {
  seo: SEOConfig;
  tenantName: string;
  tenantSlug: string;
  baseUrl?: string;
}

export function SEOHead({
  seo,
  tenantName,
  tenantSlug,
  baseUrl = 'https://zenthea.ai',
}: SEOHeadProps) {
  const title = seo.title || `${tenantName} - Healthcare Services`;
  const description = seo.description || `${tenantName} provides quality healthcare services.`;
  const canonicalUrl = seo.canonicalUrl || `${baseUrl}/clinic/${tenantSlug}`;
  const ogImage = seo.ogImage || `${baseUrl}/og-default.png`;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {seo.keywords && seo.keywords.length > 0 && (
        <meta name="keywords" content={seo.keywords.join(', ')} />
      )}
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots */}
      {seo.noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={seo.ogTitle || title} />
      <meta property="og:description" content={seo.ogDescription || description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={tenantName} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content={seo.twitterCard || 'summary_large_image'} />
      <meta name="twitter:title" content={seo.ogTitle || title} />
      <meta name="twitter:description" content={seo.ogDescription || description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Additional Healthcare-specific Meta */}
      <meta name="format-detection" content="telephone=yes" />
      <meta name="theme-color" content="#5FBFAF" />
    </Head>
  );
}

export default SEOHead;

