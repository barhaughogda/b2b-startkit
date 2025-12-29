"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Hook to fetch public tenant data for landing pages
 * 
 * This hook handles all three routing methods:
 * - Path-based: /clinic/[slug]
 * - Subdomain: [subdomain].zenthea.ai
 * - Custom domain: portal.acmeclinic.com
 */

/**
 * Page configuration for multi-page websites
 */
export interface PagePublicData {
  id: string;
  type: 'home' | 'services' | 'team' | 'locations' | 'contact' | 'custom' | 'terms' | 'privacy';
  title: string;
  slug: string;
  enabled: boolean;
  showInHeader: boolean;
  showInFooter: boolean;
  blocks: Array<{
    id: string;
    type: string;
    props: Record<string, unknown>;
    enabled: boolean;
  }>;
  order: number;
  useDefaultContent?: boolean;
}

/**
 * Site structure type - determines navigation behavior
 * - 'one-pager': Single scrollable page with anchor navigation
 * - 'multi-page': Separate pages with real URL routing
 */
export type SiteStructure = 'one-pager' | 'multi-page';

/**
 * Website Builder configuration returned from public API
 */
export interface WebsiteBuilderPublicData {
  version: string;
  /** Site structure type - determines navigation behavior */
  siteStructure: SiteStructure;
  /** @deprecated Use siteStructure instead */
  templateId: string;
  header: {
    variant: string;
    logoUrl?: string;
    logoAlt?: string;
    navItems: Array<{ id: string; label: string; href: string; isExternal?: boolean; pageId?: string }>;
    showSignIn: boolean;
    signInText: string;
    signInUrl: string;
    showBook: boolean;
    bookText: string;
    bookUrl: string;
    infoBarPhone?: string;
    infoBarHours?: string;
    infoBarText?: string;
    sticky: boolean;
    transparent: boolean;
  };
  footer: {
    variant: string;
    columns: Array<{
      id: string;
      title: string;
      links: Array<{ id: string; label: string; href: string; isExternal?: boolean }>;
    }>;
    showLogo: boolean;
    tagline?: string;
    showSocial: boolean;
    socialLinks: Array<{ id: string; platform: string; url: string }>;
    showNewsletter: boolean;
    newsletterTitle?: string;
    legalLinks: Array<{ id: string; label: string; href: string }>;
    copyrightText?: string;
    poweredByZenthea: boolean;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    fontPair: string;
    headingSize: string;
    sectionSpacing: string;
    cornerRadius: string;
    buttonStyle: string;
    colorMode: string;
    customCss?: string;
  };
  /** Content blocks for home page (one-pager uses all blocks here) */
  blocks: Array<{
    id: string;
    type: string;
    props: Record<string, unknown>;
    enabled: boolean;
  }>;
  /** Pages configuration for multi-page structure */
  pages?: PagePublicData[];
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
    twitterCard?: string;
    canonicalUrl?: string;
    noIndex?: boolean;
  };
  publishedAt?: number;
}

export interface TenantPublicData {
  id: string;
  name: string;
  slug?: string | null;
  tagline?: string | null;
  description?: string | null;
  type: "clinic" | "hospital" | "practice" | "group";
  branding: {
    logo?: string | null;
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string | null;
    favicon?: string | null;
  };
  contactInfo: {
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    website?: string | null;
  };
  landingPage?: {
    enabled?: boolean | null;
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    heroImage?: string | null;
    heroCtaText?: string | null;
    heroCtaLink?: string | null;
    showBooking?: boolean | null;
    showCareTeam?: boolean | null;
    showClinics?: boolean | null;
    showTestimonials?: boolean | null;
    showServices?: boolean | null;
    sectionOrder?: string[] | null;
  } | null;
  /** Website Builder configuration (only returned if published) */
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
  features: {
    onlineScheduling: boolean;
    telehealth: boolean;
    patientPortal: boolean;
  };
}

export function useTenantPublicData(slug: string | null) {
  const tenant = useQuery(
    api.publicLanding.getTenantBySlug,
    slug ? { slug } : "skip"
  );

  return {
    tenant: tenant as TenantPublicData | null | undefined,
    isLoading: tenant === undefined,
    notFound: tenant === null,
  };
}

export function useTenantBySubdomain(subdomain: string | null) {
  const tenant = useQuery(
    api.publicLanding.getTenantBySubdomain,
    subdomain ? { subdomain } : "skip"
  );

  return {
    tenant: tenant as TenantPublicData | null | undefined,
    isLoading: tenant === undefined,
    notFound: tenant === null,
  };
}

export function useTenantByCustomDomain(customDomain: string | null) {
  const tenant = useQuery(
    api.publicLanding.getTenantByCustomDomain,
    customDomain ? { customDomain } : "skip"
  );

  return {
    tenant: tenant as TenantPublicData | null | undefined,
    isLoading: tenant === undefined,
    notFound: tenant === null,
  };
}

/**
 * Check if a tenant's landing page exists and is enabled
 */
export function useTenantLandingPageCheck(options: {
  slug?: string | null;
  subdomain?: string | null;
  customDomain?: string | null;
}) {
  const result = useQuery(api.publicLanding.checkTenantLandingPage, {
    slug: options.slug ?? undefined,
    subdomain: options.subdomain ?? undefined,
    customDomain: options.customDomain ?? undefined,
  });

  return {
    exists: result?.exists ?? false,
    landingPageEnabled: result?.landingPageEnabled ?? false,
    slug: result?.slug,
    tenantId: result?.tenantId,
    isLoading: result === undefined,
  };
}

