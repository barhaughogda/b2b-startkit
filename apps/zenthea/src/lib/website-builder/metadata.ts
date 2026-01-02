/**
 * Website Builder Metadata
 * 
 * Static metadata for UI components, templates, and variants.
 */

import { 
  type SiteStructure, 
  type TemplateId, 
  type HeaderVariant, 
  type FooterVariant,
  type BlockType
} from './types';

export const siteStructureMetadata: Record<
  SiteStructure,
  {
    name: string
    description: string
    icon: string
    features: string[]
  }
> = {
  'one-pager': {
    name: 'One-Page Site',
    description:
      'All content on a single scrollable page with smooth anchor navigation',
    icon: 'FileText',
    features: [
      'Single scrollable page',
      'Smooth scroll navigation',
      'Perfect for simple sites',
      'Fast, lightweight',
    ],
  },
  'multi-page': {
    name: 'Multi-Page Site',
    description: 'Separate pages for each section with dedicated URLs',
    icon: 'Files',
    features: [
      'Separate page for each section',
      'Dedicated URLs for better SEO',
      'Page management in builder',
      'Custom pages support',
    ],
  },
}

export const SITE_STRUCTURE_METADATA = siteStructureMetadata

/**
 * @deprecated Visual template metadata is no longer used.
 * Kept for backwards compatibility during migration.
 */
export const templateMetadata: Record<
  TemplateId,
  {
    name: string
    description: string
    thumbnail: string
    defaultBlocks: BlockType[]
    recommendedBlocks: BlockType[]
  }
> = {
  'classic-stacked': {
    name: 'Classic Stacked',
    description: 'Conversion-focused landing page with stacked sections',
    thumbnail: '/templates/classic-stacked.png',
    defaultBlocks: [
      'hero',
      'services',
      'care-team',
      'clinics',
      'contact',
      'cta-band',
    ],
    recommendedBlocks: ['trust-bar', 'how-it-works', 'testimonials', 'faq'],
  },
  'bento-grid': {
    name: 'Bento Grid',
    description: 'Modern modular card-based layout',
    thumbnail: '/templates/bento-grid.png',
    defaultBlocks: [
      'hero',
      'services',
      'care-team',
      'clinics',
      'contact',
      'cta-band',
    ],
    recommendedBlocks: ['trust-bar', 'how-it-works', 'testimonials', 'faq'],
  },
  'split-hero': {
    name: 'Split Hero',
    description: 'Copy on the left, visual/widget on the right',
    thumbnail: '/templates/split-hero.png',
    defaultBlocks: [
      'hero',
      'services',
      'care-team',
      'clinics',
      'contact',
      'cta-band',
    ],
    recommendedBlocks: ['trust-bar', 'how-it-works', 'testimonials', 'faq'],
  },
  'multi-location': {
    name: 'Multi-Location',
    description: 'Clinic finder prioritized for multiple locations',
    thumbnail: '/templates/multi-location.png',
    defaultBlocks: [
      'hero',
      'clinics',
      'services',
      'care-team',
      'contact',
      'cta-band',
    ],
    recommendedBlocks: ['trust-bar', 'how-it-works', 'testimonials', 'faq'],
  },
  'team-forward': {
    name: 'Team Forward',
    description: 'Team-first layout emphasizing trust and expertise',
    thumbnail: '/templates/team-forward.png',
    defaultBlocks: [
      'hero',
      'care-team',
      'services',
      'clinics',
      'contact',
      'cta-band',
    ],
    recommendedBlocks: ['trust-bar', 'how-it-works', 'testimonials', 'faq'],
  },
}

export const TEMPLATE_METADATA = templateMetadata

export const headerMetadata: Record<
  HeaderVariant,
  {
    name: string
    description: string
    thumbnail: string
  }
> = {
  'sticky-simple': {
    name: 'Sticky Simple',
    description: 'Logo left, nav center, Sign in + Book right',
    thumbnail: '/headers/sticky-simple.png',
  },
  centered: {
    name: 'Centered Nav',
    description: 'Logo center, nav links with Book always visible',
    thumbnail: '/headers/centered.png',
  },
  'info-bar': {
    name: 'Info Bar',
    description: 'Top bar with phone/hours, main nav below',
    thumbnail: '/headers/info-bar.png',
  },
}

export const HEADER_METADATA = headerMetadata

export const footerMetadata: Record<
  FooterVariant,
  {
    name: string
    description: string
    thumbnail: string
  }
> = {
  'multi-column': {
    name: 'Multi-Column',
    description: '3-4 column footer with clinics, services, support, legal',
    thumbnail: '/footers/multi-column.png',
  },
  minimal: {
    name: 'Minimal',
    description: 'Address, hours, social links, and legal',
    thumbnail: '/footers/minimal.png',
  },
}

export const FOOTER_METADATA = footerMetadata
