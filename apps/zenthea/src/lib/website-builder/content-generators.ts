/**
 * Content Generators for Website Builder
 * 
 * Functions to create default content, pages, and website definitions.
 */

import { 
  type BlockType,
  type SiteStructure, 
  type WebsiteDefinition, 
  type PageConfig, 
  type BlockInstance,
  type NavItem,
  type ThemeConfig,
  DEFAULT_BLOCK_APPEARANCE
} from './types';

import {
  createServicesPageBlocks,
  createTeamPageBlocks,
  createLocationsPageBlocks,
  createContactPageBlocks,
  createHomePageBlocks,
} from './page-defaults';

import {
  createTermsOfServiceBlocks,
  createPrivacyPolicyBlocks,
} from './legal-page-defaults';

/**
 * Gets default nav items for the header based on site structure
 */
export function getDefaultNavItems(
  siteStructure: SiteStructure = 'multi-page'
): NavItem[] {
  if (siteStructure === 'one-pager') {
    return [
      { id: 'services', label: 'Services', href: '#services' },
      { id: 'team', label: 'Our Team', href: '#team' },
      { id: 'locations', label: 'Locations', href: '#locations' },
      { id: 'contact', label: 'Contact', href: '#contact' },
    ];
  }

  return [
    { id: 'services', label: 'Services', href: '/services', pageId: 'services' },
    { id: 'team', label: 'Our Team', href: '/team', pageId: 'team' },
    { id: 'locations', label: 'Locations', href: '/locations', pageId: 'locations' },
    { id: 'contact', label: 'Contact', href: '/contact', pageId: 'contact' },
  ];
}

/**
 * Creates default pages for a new website
 */
export function getDefaultPages(): PageConfig[] {
  return [
    {
      id: 'home',
      type: 'home',
      title: 'Home',
      slug: '',
      enabled: true,
      showInHeader: false,
      showInFooter: false,
      blocks: createHomePageBlocks(),
      order: 0,
    },
    {
      id: 'services',
      type: 'services',
      title: 'Services',
      slug: 'services',
      enabled: true,
      showInHeader: true,
      showInFooter: true,
      blocks: createServicesPageBlocks(),
      order: 10,
    },
    {
      id: 'team',
      type: 'team',
      title: 'Our Team',
      slug: 'team',
      enabled: true,
      showInHeader: true,
      showInFooter: true,
      blocks: createTeamPageBlocks(),
      order: 20,
    },
    {
      id: 'locations',
      type: 'locations',
      title: 'Locations',
      slug: 'locations',
      enabled: true,
      showInHeader: true,
      showInFooter: true,
      blocks: createLocationsPageBlocks(),
      order: 30,
    },
    {
      id: 'contact',
      type: 'contact',
      title: 'Contact',
      slug: 'contact',
      enabled: true,
      showInHeader: true,
      showInFooter: true,
      blocks: createContactPageBlocks(),
      order: 40,
    },
    {
      id: 'terms',
      type: 'terms',
      title: 'Terms of Service',
      slug: 'terms',
      enabled: true,
      showInHeader: false,
      showInFooter: true,
      blocks: createTermsOfServiceBlocks(),
      order: 100,
      useDefaultContent: true,
    },
    {
      id: 'privacy',
      type: 'privacy',
      title: 'Privacy Policy',
      slug: 'privacy',
      enabled: true,
      showInHeader: false,
      showInFooter: true,
      blocks: createPrivacyPolicyBlocks(),
      order: 101,
      useDefaultContent: true,
    },
  ];
}

export const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#5FBFAF',
  secondaryColor: '#5F284A',
  accentColor: '#FF8C42',
  backgroundColor: '#FFFFFF',
  textColor: '#1A1A1A',
  fontPair: 'inter-outfit',
  headingSize: 'medium',
  sectionSpacing: 'normal',
  cornerRadius: 'medium',
  buttonStyle: 'solid',
  colorMode: 'light',
};

/**
 * Creates a default website definition for a new tenant
 */
export function createDefaultWebsiteDefinition(
  siteStructure: SiteStructure = 'multi-page'
): WebsiteDefinition {
  return {
    version: '1.0.0',
    siteStructure,
    templateId: 'classic-stacked',
    theme: DEFAULT_THEME,
    header: {
      variant: 'sticky-simple',
      navItems: getDefaultNavItems(siteStructure),
      showBookingButton: true,
      bookingButtonText: 'Book Appointment',
      showLoginButton: true,
      isSticky: true,
      transparentOnHero: true,
    },
    footer: {
      variant: 'multi-column',
      showSocial: true,
      socialLinks: [
        { id: '1', platform: 'facebook', url: '#', enabled: true },
        { id: '2', platform: 'twitter', url: '#', enabled: true },
        { id: '3', platform: 'instagram', url: '#', enabled: true },
      ],
      showNewsletter: true,
      newsletterHeadline: 'Stay healthy with our updates',
      copyrightText: `© ${new Date().getFullYear()} Zenthea Healthcare. All rights reserved.`,
    },
    blocks: createHomePageBlocks(),
    pages: siteStructure === 'multi-page' ? getDefaultPages() : [],
    seo: {
      titleTemplate: '%s | Zenthea Healthcare',
      defaultDescription: 'Quality healthcare services provided by Zenthea clinics.',
    },
  };
}

/**
 * Simple helper to create a new block instance
 */
export function createBlockInstance(type: BlockType): BlockInstance {
  // Use lazy loading to get blockMetadata from zod-schemas
  // to break the circular dependency between types -> zod-schemas -> content-generators
  const { blockMetadata } = require('./zod-schemas');
  
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    enabled: true,
    props: JSON.parse(JSON.stringify(blockMetadata[type].defaultProps)),
    appearance: { ...DEFAULT_BLOCK_APPEARANCE },
  };
}
