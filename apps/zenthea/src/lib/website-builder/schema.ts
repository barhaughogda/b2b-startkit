/**
 * Website Builder Schema and Types
 *
 * Defines the JSON schema for website definitions including:
 * - Templates, Headers, Footers
 * - Block types and configurations
 * - Theme settings
 * - SEO configuration
 */

import { z } from 'zod'

// Import page defaults - lazy loaded to avoid circular dependencies
// Note: These imports are dynamically called in the helper functions below
import {
  createServicesPageBlocks,
  createTeamPageBlocks,
  createLocationsPageBlocks,
  createContactPageBlocks,
  createHomePageBlocks,
} from './page-defaults'
import {
  createTermsOfServiceBlocks,
  createPrivacyPolicyBlocks,
} from './legal-page-defaults'

// =============================================================================
// SITE STRUCTURE TYPES (NEW - Replaces visual templates)
// =============================================================================

/**
 * Site Structure defines how the website navigates:
 * - one-pager: Single scrollable page with anchor navigation (#services, #team)
 * - multi-page: Separate pages with real URL routing (/services, /team)
 */
export const SiteStructures = ['one-pager', 'multi-page'] as const

export type SiteStructure = (typeof SiteStructures)[number]

export const siteStructureSchema = z.enum(SiteStructures)

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
export const SITE_STRUCTURES = SiteStructures

// =============================================================================
// TEMPLATE TYPES (DEPRECATED - kept for backwards compatibility)
// =============================================================================

/**
 * @deprecated Use SiteStructure instead. Visual templates have been removed
 * in favor of flexible blocks + themes. This is kept only for migration.
 */
export const TemplateIds = [
  'classic-stacked',
  'bento-grid',
  'split-hero',
  'multi-location',
  'team-forward',
] as const

/** @deprecated Use SiteStructure instead */
export type TemplateId = (typeof TemplateIds)[number]

/** @deprecated Use siteStructureSchema instead */
export const templateIdSchema = z.enum(TemplateIds)

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

// Alias for backwards compatibility
/** @deprecated */
export const TEMPLATE_METADATA = templateMetadata
/** @deprecated */
export const TEMPLATE_IDS = TemplateIds

/** @deprecated */
export type TemplateMetadata = (typeof templateMetadata)[TemplateId]

// =============================================================================
// HEADER VARIANTS
// =============================================================================

export const HeaderVariants = ['sticky-simple', 'centered', 'info-bar'] as const

export type HeaderVariant = (typeof HeaderVariants)[number]

export const headerVariantSchema = z.enum(HeaderVariants)

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

// Aliases for backwards compatibility
export const HEADER_VARIANTS = HeaderVariants
export const HEADER_METADATA = headerMetadata

// =============================================================================
// FOOTER VARIANTS
// =============================================================================

export const FooterVariants = ['multi-column', 'minimal'] as const

export type FooterVariant = (typeof FooterVariants)[number]

export const footerVariantSchema = z.enum(FooterVariants)

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

// Aliases for backwards compatibility
export const FOOTER_VARIANTS = FooterVariants
export const FOOTER_METADATA = footerMetadata

// =============================================================================
// NAVIGATION ITEMS
// =============================================================================

export const navItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  isExternal: z.boolean().optional(),
  pageId: z.string().optional(), // Link to internal page
})

export type NavItem = z.infer<typeof navItemSchema>

export const socialPlatforms = [
  'facebook',
  'twitter',
  'instagram',
  'linkedin',
  'youtube',
  'tiktok',
] as const

export type SocialPlatform = (typeof socialPlatforms)[number]

export const socialLinkSchema = z.object({
  id: z.string(),
  platform: z.enum(socialPlatforms),
  url: z.string(),
  enabled: z.boolean().default(true),
})

export type SocialLink = z.infer<typeof socialLinkSchema>

export const legalLinkSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
})

export type LegalLink = z.infer<typeof legalLinkSchema>

export const footerColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  links: z.array(navItemSchema),
})

export type FooterColumn = z.infer<typeof footerColumnSchema>

// External link for footer (external URLs)
export const externalLinkSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
  openInNewTab: z.boolean().default(true),
})

export type ExternalLink = z.infer<typeof externalLinkSchema>

// =============================================================================
// FOOTER MENU V2 SCHEMA (Sections in Columns)
// =============================================================================

/**
 * Footer Menu Item - Can be a page link or external link
 * 
 * Page items reference a PageConfig.id and auto-resolve label/href from current page state.
 * External items store label/url directly.
 */
export const footerMenuPageItemSchema = z.object({
  id: z.string(),
  kind: z.literal('page'),
  /** Reference to PageConfig.id - label and href are resolved from page */
  pageId: z.string(),
})

export const footerMenuExternalItemSchema = z.object({
  id: z.string(),
  kind: z.literal('external'),
  label: z.string(),
  url: z.string(),
  openInNewTab: z.boolean().default(true),
})

export const footerMenuItemSchema = z.discriminatedUnion('kind', [
  footerMenuPageItemSchema,
  footerMenuExternalItemSchema,
])

export type FooterMenuPageItem = z.infer<typeof footerMenuPageItemSchema>
export type FooterMenuExternalItem = z.infer<typeof footerMenuExternalItemSchema>
export type FooterMenuItem = z.infer<typeof footerMenuItemSchema>

/**
 * Footer Menu Section - A titled group of menu items within a column
 */
export const footerMenuSectionSchema = z.object({
  id: z.string(),
  /** Section header title (e.g., "Services", "Company", "Support") */
  title: z.string(),
  /** Items in this section */
  items: z.array(footerMenuItemSchema).default([]),
})

export type FooterMenuSection = z.infer<typeof footerMenuSectionSchema>

/**
 * Footer Menu Column - Contains one or more sections
 * Allows multiple "header groups" per column
 */
export const footerMenuColumnSchema = z.object({
  id: z.string(),
  /** Order of this column in the footer (lower = left) */
  layoutOrder: z.number().default(0),
  /** Sections within this column */
  sections: z.array(footerMenuSectionSchema).default([]),
})

export type FooterMenuColumn = z.infer<typeof footerMenuColumnSchema>

// =============================================================================
// PAGE TYPES AND CONFIGURATION
// =============================================================================

/**
 * Page Types:
 * - home: Main landing page (always exists, cannot be disabled)
 * - services: Services page (standard, toggleable)
 * - team: Our Team page (standard, toggleable)
 * - locations: Locations page (standard, toggleable)
 * - contact: Contact page (standard, toggleable)
 * - custom: User-created custom pages (max 2)
 * - terms: Terms of Service (legal page)
 * - privacy: Privacy Policy (legal page)
 */
export const PageTypes = [
  'home',
  'services',
  'team',
  'locations',
  'contact',
  'custom',
  'terms',
  'privacy',
] as const

export type PageType = (typeof PageTypes)[number]

export const pageTypeSchema = z.enum(PageTypes)

// Standard pages that can be toggled
export const StandardPageTypes = [
  'services',
  'team',
  'locations',
  'contact',
] as const
export type StandardPageType = (typeof StandardPageTypes)[number]

// Legal pages
export const LegalPageTypes = ['terms', 'privacy'] as const
export type LegalPageType = (typeof LegalPageTypes)[number]

// Page configuration schema
export const pageConfigSchema = z.object({
  id: z.string(),
  type: pageTypeSchema,
  title: z.string(),
  slug: z.string(),
  enabled: z.boolean().default(true),
  showInHeader: z.boolean().default(true),
  showInFooter: z.boolean().default(true),
  // Blocks for this page (for custom and legal pages)
  blocks: z.array(z.lazy(() => blockInstanceSchema)).default([]),
  // Order in navigation (lower = first)
  order: z.number().default(0),
  // For legal pages - uses default content if not customized
  useDefaultContent: z.boolean().optional(),
})

export type PageConfig = z.infer<typeof pageConfigSchema>

// Page metadata for UI
export const pageMetadata: Record<
  PageType,
  {
    name: string
    description: string
    icon: string
    canDisable: boolean
    canDelete: boolean
    defaultShowInHeader: boolean
    defaultShowInFooter: boolean
  }
> = {
  home: {
    name: 'Home',
    description: 'Main landing page with all sections',
    icon: 'Home',
    canDisable: false,
    canDelete: false,
    defaultShowInHeader: false,
    defaultShowInFooter: false,
  },
  services: {
    name: 'Services',
    description: 'Display your available services',
    icon: 'Heart',
    canDisable: true,
    canDelete: false,
    defaultShowInHeader: true,
    defaultShowInFooter: true,
  },
  team: {
    name: 'Our Team',
    description: 'Showcase your care team members',
    icon: 'Users',
    canDisable: true,
    canDelete: false,
    defaultShowInHeader: true,
    defaultShowInFooter: true,
  },
  locations: {
    name: 'Locations',
    description: 'Show your clinic locations',
    icon: 'MapPin',
    canDisable: true,
    canDelete: false,
    defaultShowInHeader: true,
    defaultShowInFooter: true,
  },
  contact: {
    name: 'Contact',
    description: 'Contact information and form',
    icon: 'Phone',
    canDisable: true,
    canDelete: false,
    defaultShowInHeader: true,
    defaultShowInFooter: true,
  },
  custom: {
    name: 'Custom Page',
    description: 'Create your own custom page',
    icon: 'FileText',
    canDisable: true,
    canDelete: true,
    defaultShowInHeader: true,
    defaultShowInFooter: false,
  },
  terms: {
    name: 'Terms of Service',
    description: 'Legal terms and conditions',
    icon: 'FileText',
    canDisable: false,
    canDelete: false,
    defaultShowInHeader: false,
    defaultShowInFooter: true,
  },
  privacy: {
    name: 'Privacy Policy',
    description: 'Privacy and data handling policy',
    icon: 'Shield',
    canDisable: false,
    canDelete: false,
    defaultShowInHeader: false,
    defaultShowInFooter: true,
  },
}

export const PAGE_METADATA = pageMetadata

// Maximum number of custom pages allowed
export const MAX_CUSTOM_PAGES = 2

// =============================================================================
// HEADER CONFIGURATION
// =============================================================================

export const headerConfigSchema = z.object({
  variant: headerVariantSchema.default('sticky-simple'),
  logoUrl: z.string().optional(),
  logoAlt: z.string().optional(),
  navItems: z.array(navItemSchema).default([
    { id: 'services', label: 'Services', href: '#services' },
    { id: 'team', label: 'Our Team', href: '#team' },
    { id: 'locations', label: 'Locations', href: '#locations' },
    { id: 'contact', label: 'Contact', href: '#contact' },
  ]),
  showSignIn: z.boolean().default(true),
  signInText: z.string().default('Sign In'),
  signInUrl: z.string().default('/login'),
  showBook: z.boolean().default(true),
  bookText: z.string().default('Book Appointment'),
  bookUrl: z.string().default('/book'),
  infoBarPhone: z.string().optional(),
  infoBarHours: z.string().optional(),
  infoBarText: z.string().optional(),
  sticky: z.boolean().default(true),
  transparent: z.boolean().default(false),
  // Color customization
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  mobileBackgroundColor: z.string().optional(),
  mobileTextColor: z.string().optional(),
  useThemeColors: z.boolean().default(true),
})

export type HeaderConfig = z.infer<typeof headerConfigSchema>

// =============================================================================
// FOOTER CONFIGURATION
// =============================================================================

export const footerConfigSchema = z.object({
  variant: footerVariantSchema.default('multi-column'),
  /**
   * Legacy columns (v1) - kept for backwards compatibility.
   * New sites should use menuColumns (v2) instead.
   */
  columns: z.array(footerColumnSchema).default([
    {
      id: 'services',
      title: 'Services',
      links: [
        { id: 'primary-care', label: 'Primary Care', href: '#services' },
        { id: 'urgent-care', label: 'Urgent Care', href: '#services' },
        { id: 'preventive', label: 'Preventive Care', href: '#services' },
      ],
    },
    {
      id: 'company',
      title: 'Company',
      links: [
        { id: 'about', label: 'About Us', href: '#about' },
        { id: 'team', label: 'Our Team', href: '#team' },
        { id: 'careers', label: 'Careers', href: '/careers' },
      ],
    },
    {
      id: 'support',
      title: 'Support',
      links: [
        { id: 'contact', label: 'Contact Us', href: '#contact' },
        { id: 'faq', label: 'FAQ', href: '#faq' },
        { id: 'patient-portal', label: 'Patient Portal', href: '/login' },
      ],
    },
  ]),
  /**
   * V2 menu columns with sections (optional).
   * When present, these take precedence over legacy `columns`.
   * Each column can have multiple sections with headers.
   */
  menuColumns: z.array(footerMenuColumnSchema).optional(),
  showLogo: z.boolean().default(true),
  tagline: z.string().optional(),
  showSocial: z.boolean().default(true),
  socialLinks: z.array(socialLinkSchema).default([]),
  // External links for footer (links to external websites) - legacy, use menuColumns for v2
  externalLinks: z.array(externalLinkSchema).default([]),
  showNewsletter: z.boolean().default(false),
  newsletterTitle: z.string().optional(),
  legalLinks: z.array(legalLinkSchema).default([
    { id: 'privacy', label: 'Privacy Policy', href: '/privacy' },
    { id: 'terms', label: 'Terms of Service', href: '/terms' },
    { id: 'hipaa', label: 'HIPAA Notice', href: '/hipaa' },
  ]),
  copyrightText: z.string().optional(),
  poweredByZenthea: z.boolean().default(true),
  // Color customization
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  useThemeColors: z.boolean().default(true),
})

export type FooterConfig = z.infer<typeof footerConfigSchema>

// =============================================================================
// BLOCK TYPES
// =============================================================================

export const BlockTypes = [
  // Required blocks
  'hero',
  'care-team',
  'clinics',
  'services',
  // Recommended blocks
  'trust-bar',
  'how-it-works',
  'testimonials',
  'faq',
  'contact',
  'cta-band',
  'custom-text',
  'photo-text',
  'media',
] as const

// Alias for backwards compatibility
export const BLOCK_TYPES = BlockTypes

export type BlockType = (typeof BlockTypes)[number]

export const blockTypeSchema = z.enum(BlockTypes)

// Block-specific props schemas
// Inline button appearance schema for Hero buttons (same pattern as CTA Band)
const heroButtonAppearanceSchema = z.object({
  backgroundToken: z.enum(['default', 'primary', 'secondary', 'surface', 'accent', 'accent-light', 'transparent']).optional(),
  backgroundCustom: z.string().optional(),
  textToken: z.enum(['default', 'primary', 'secondary', 'tertiary', 'on-accent', 'accent']).optional(),
  textCustom: z.string().optional(),
})

// Text appearance schema for Hero heading and tagline
const heroTextAppearanceSchema = z.object({
  textToken: z.enum(['default', 'primary', 'secondary', 'tertiary', 'on-accent', 'accent']).optional(),
  textCustom: z.string().optional(),
})

export const heroBlockPropsSchema = z.object({
  headline: z.string().default('Welcome to Our Clinic'),
  tagline: z.string().default('Quality healthcare for you and your family'),
  primaryCtaText: z.string().default('Book Appointment'),
  primaryCtaLink: z.string().optional(),
  secondaryCtaText: z.string().optional(),
  secondaryCtaLink: z.string().optional(),
  // Background configuration
  backgroundType: z.enum(['gradient', 'solid', 'image']).default('gradient'),
  backgroundColor: z.string().default('var(--zenthea-teal)'), // Design system teal
  gradientFrom: z.string().default('var(--zenthea-teal)'), // Design system teal
  gradientTo: z.string().default('var(--zenthea-purple)'), // Design system purple
  gradientDirection: z
    .enum(['to-r', 'to-l', 'to-t', 'to-b', 'to-tr', 'to-tl', 'to-br', 'to-bl'])
    .default('to-br'),
  backgroundImage: z.string().optional(),
  backgroundOverlay: z.number().min(0).max(1).default(0.4),
  alignment: z.enum(['left', 'center', 'right']).default('center'),
  // Button appearance overrides (optional - uses smart defaults when not set)
  primaryButtonAppearance: heroButtonAppearanceSchema.optional(),
  secondaryButtonAppearance: heroButtonAppearanceSchema.optional(),
  // Text appearance overrides (optional - uses smart defaults when not set)
  headingTextAppearance: heroTextAppearanceSchema.optional(),
  taglineTextAppearance: heroTextAppearanceSchema.optional(),
})

export type HeroBlockProps = z.infer<typeof heroBlockPropsSchema>

export const careTeamBlockPropsSchema = z.object({
  title: z.string().default('Meet Our Care Team'),
  subtitle: z.string().optional(),
  maxProviders: z.number().min(1).max(12).default(4),
  showSpecialties: z.boolean().default(true),
  showCredentials: z.boolean().default(true),
  showBookButton: z.boolean().default(true),
  layout: z.enum(['grid', 'carousel']).default('grid'),
})

export type CareTeamBlockProps = z.infer<typeof careTeamBlockPropsSchema>

export const clinicsBlockPropsSchema = z.object({
  title: z.string().default('Our Locations'),
  subtitle: z.string().optional(),
  showMap: z.boolean().default(true),
  showHours: z.boolean().default(true),
  showPhone: z.boolean().default(true),
  layout: z.enum(['grid', 'list', 'map-first']).default('grid'),
})

export type ClinicsBlockProps = z.infer<typeof clinicsBlockPropsSchema>

export const servicesBlockPropsSchema = z.object({
  title: z.string().default('Our Services'),
  subtitle: z.string().optional(),
  showDuration: z.boolean().default(true),
  showDescription: z.boolean().default(true),
  showPrice: z.boolean().default(true),
  layout: z.enum(['grid', 'list']).default('grid'),
  maxServices: z.number().min(1).max(20).optional(),
})

export type ServicesBlockProps = z.infer<typeof servicesBlockPropsSchema>

export const trustBarItemSchema = z.object({
  id: z.string(),
  type: z.enum(['insurance', 'accreditation', 'compliance', 'rating', 'affiliation', 'award', 'custom']),
  presetId: z.string().optional(), // For quick-add presets (e.g., 'bcbs', 'jcaho')
  label: z.string(),
  shortLabel: z.string().optional(), // Compact label for small displays
  imageUrl: z.string().optional(), // Logo/badge image URL
  verifyUrl: z.string().optional(), // Link to verification page
  // Rating-specific fields
  ratingSource: z.string().optional(), // e.g., 'google', 'healthgrades', 'zocdoc'
  ratingValue: z.string().optional(), // e.g., '4.9'
  ratingCount: z.string().optional(), // e.g., '238'
  profileUrl: z.string().optional(), // Link to rating profile page
  // Legacy field (kept for backwards compatibility)
  value: z.string().optional(),
})

export type TrustBarItem = z.infer<typeof trustBarItemSchema>

export const trustBarBlockPropsSchema = z.object({
  items: z.array(trustBarItemSchema).default([]),
  layout: z.enum(['horizontal', 'grid']).default('horizontal'),
  showLabels: z.boolean().default(true), // Show text labels under icons
  grayscaleLogos: z.boolean().default(true), // Apply grayscale filter to logos
  compactMode: z.boolean().default(false), // Use short labels in compact mode
})

export type TrustBarBlockProps = z.infer<typeof trustBarBlockPropsSchema>

/**
 * How It Works Layout Options:
 * - numbered-circles: Icons in colored circles with step number badges (default)
 * - timeline: Vertical timeline with icons on the left
 * - cards: Each step as an elevated card with shadow
 * - minimal: Simple icons without colored backgrounds
 */
export const HowItWorksLayouts = [
  'numbered-circles',
  'timeline',
  'cards',
  'minimal',
] as const

export type HowItWorksLayout = (typeof HowItWorksLayouts)[number]

/**
 * How It Works Icon Shape Options:
 * - circle: Fully round icons (default)
 * - rounded-square: Rounded corners (12px radius)
 * - square: Sharp corners (4px radius)
 */
export const HowItWorksIconShapes = [
  'circle',
  'rounded-square',
  'square',
] as const

export type HowItWorksIconShape = (typeof HowItWorksIconShapes)[number]

/**
 * Available icons for How It Works steps
 */
export const HowItWorksIcons = [
  // Scheduling
  'calendar',
  'clock',
  'calendar-check',
  'timer',
  // Location
  'map-pin',
  'building-2',
  'home',
  'navigation',
  // Medical
  'heart',
  'stethoscope',
  'pill',
  'thermometer',
  'activity',
  'heart-pulse',
  // Communication
  'phone',
  'mail',
  'message-circle',
  'video',
  // General
  'check-circle',
  'star',
  'shield',
  'users',
  'file-text',
  'award',
] as const

export type HowItWorksIcon = (typeof HowItWorksIcons)[number]

export const howItWorksBlockPropsSchema = z.object({
  title: z.string().default('How It Works'),
  subtitle: z.string().optional(),
  layout: z.enum(HowItWorksLayouts).default('numbered-circles'),
  iconShape: z.enum(HowItWorksIconShapes).default('circle'),
  steps: z
    .array(
      z.object({
        id: z.string(),
        number: z.number(),
        title: z.string(),
        description: z.string(),
        icon: z.enum(HowItWorksIcons).optional(),
      })
    )
    .default([
      {
        id: '1',
        number: 1,
        title: 'Book Online',
        description: 'Schedule your appointment in minutes',
        icon: 'calendar',
      },
      {
        id: '2',
        number: 2,
        title: 'Visit Us',
        description: 'Come to your appointment on time',
        icon: 'map-pin',
      },
      {
        id: '3',
        number: 3,
        title: 'Get Care',
        description: 'Receive personalized healthcare',
        icon: 'heart',
      },
    ]),
})

export type HowItWorksBlockProps = z.infer<typeof howItWorksBlockPropsSchema>

/**
 * Testimonials Layout Options:
 * - hero-card: Large featured testimonial with avatar, quote marks, header + body, name/title, rating
 * - carousel-cards: Horizontally scrollable cards
 * - grid-cards: Responsive 1–3 column grid of cards
 * - stacked-list: Vertical list with compact avatars + header/body
 * - centered-quote: Centered quote with subtle background + prominent typography
 */
export const TestimonialsLayouts = [
  'hero-card',
  'carousel-cards',
  'grid-cards',
  'stacked-list',
  'centered-quote',
] as const

export type TestimonialsLayout = (typeof TestimonialsLayouts)[number]

/**
 * Legacy testimonial item shape (for migration)
 */
const legacyTestimonialItemSchema = z.object({
  id: z.string(),
  quote: z.string(),
  authorName: z.string(),
  authorTitle: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
})

/**
 * New testimonial item shape with extended fields
 */
const testimonialItemSchema = z.object({
  id: z.string(),
  // Image fields
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  // Author info
  name: z.string(),
  tagline: z.string().optional(),
  // Content
  rating: z.number().min(1).max(5).optional(),
  header: z.string().optional(),
  testimonial: z.string(),
})

export type TestimonialItem = z.infer<typeof testimonialItemSchema>

/**
 * Migrate legacy testimonial item to new shape
 */
function migrateTestimonialItem(item: unknown): z.infer<typeof testimonialItemSchema> {
  if (!item || typeof item !== 'object') {
    return { id: '', name: '', testimonial: '' }
  }
  
  const obj = item as Record<string, unknown>
  
  // If it's already in new format (has 'testimonial' field), return as-is
  if ('testimonial' in obj && typeof obj.testimonial === 'string') {
    return testimonialItemSchema.parse(item)
  }
  
  // Migrate from legacy format (quote -> testimonial, authorName -> name, authorTitle -> tagline)
  return {
    id: typeof obj.id === 'string' ? obj.id : '',
    imageUrl: typeof obj.imageUrl === 'string' ? obj.imageUrl : undefined,
    imageAlt: typeof obj.imageAlt === 'string' ? obj.imageAlt : undefined,
    name: typeof obj.authorName === 'string' ? obj.authorName : (typeof obj.name === 'string' ? obj.name : ''),
    tagline: typeof obj.authorTitle === 'string' ? obj.authorTitle : (typeof obj.tagline === 'string' ? obj.tagline : undefined),
    rating: typeof obj.rating === 'number' ? obj.rating : undefined,
    header: typeof obj.header === 'string' ? obj.header : undefined,
    testimonial: typeof obj.quote === 'string' ? obj.quote : (typeof obj.testimonial === 'string' ? obj.testimonial : ''),
  }
}

/**
 * Migrate legacy layout values to new layout enum
 */
function migrateTestimonialsLayout(layout: unknown): TestimonialsLayout {
  if (typeof layout !== 'string') return 'carousel-cards'
  
  // Map old layouts to new
  switch (layout) {
    case 'carousel':
      return 'carousel-cards'
    case 'grid':
      return 'grid-cards'
    default:
      // Check if it's already a valid new layout
      if (TestimonialsLayouts.includes(layout as TestimonialsLayout)) {
        return layout as TestimonialsLayout
      }
      return 'carousel-cards'
  }
}

export const testimonialsBlockPropsSchema = z.object({
  title: z.string().default('What Our Patients Say'),
  subtitle: z.string().optional(),
  testimonials: z.preprocess(
    (val) => {
      if (!Array.isArray(val)) return []
      return val.map(migrateTestimonialItem)
    },
    z.array(testimonialItemSchema).default([])
  ),
  layout: z.preprocess(
    migrateTestimonialsLayout,
    z.enum(TestimonialsLayouts).default('carousel-cards')
  ),
  maxVisible: z.number().min(1).max(6).default(3),
})

export type TestimonialsBlockProps = z.infer<
  typeof testimonialsBlockPropsSchema
>

export const faqBlockPropsSchema = z.object({
  title: z.string().default('Frequently Asked Questions'),
  subtitle: z.string().optional(),
  items: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        answer: z.string(),
      })
    )
    .default([]),
  layout: z.enum(['accordion', 'two-column', 'split-panel', 'card-grid']).default('accordion'),
})

export type FAQBlockProps = z.infer<typeof faqBlockPropsSchema>

export const contactBlockPropsSchema = z.object({
  title: z.string().default('Contact Us'),
  subtitle: z.string().optional(),
  showPhone: z.boolean().default(true),
  showEmail: z.boolean().default(true),
  showAddress: z.boolean().default(true),
  showHours: z.boolean().default(true),
  showMap: z.boolean().default(false),
  layout: z.enum(['horizontal', 'vertical', 'card-grid']).default('card-grid'),
})

export type ContactBlockProps = z.infer<typeof contactBlockPropsSchema>

// Inline button appearance schema definition for CTA buttons
// (Defined inline to avoid forward reference issues with BackgroundTokens/TextTokens)
const ctaButtonAppearanceSchema = z.object({
  backgroundToken: z.enum(['default', 'primary', 'secondary', 'surface', 'accent', 'accent-light', 'transparent']).optional(),
  backgroundCustom: z.string().optional(),
  textToken: z.enum(['default', 'primary', 'secondary', 'tertiary', 'on-accent', 'accent']).optional(),
  textCustom: z.string().optional(),
})

export const ctaBandBlockPropsSchema = z.object({
  headline: z.string().default('Ready to Get Started?'),
  subheadline: z.string().optional(),
  primaryCtaText: z.string().default('Book Now'),
  primaryCtaLink: z.string().optional(),
  secondaryCtaText: z.string().optional(),
  secondaryCtaLink: z.string().optional(),
  // Note: backgroundColor is deprecated - use block appearance instead
  backgroundColor: z
    .enum(['primary', 'secondary', 'gradient'])
    .optional(),
  // Button appearance overrides (optional - uses smart defaults when not set)
  primaryButtonAppearance: ctaButtonAppearanceSchema.optional(),
  secondaryButtonAppearance: ctaButtonAppearanceSchema.optional(),
})

export type CTABandBlockProps = z.infer<typeof ctaBandBlockPropsSchema>

export const customTextBlockPropsSchema = z.object({
  title: z.string().default('About Us'),
  content: z.string().default(''),
  alignment: z.enum(['left', 'center', 'right']).default('left'),
  showTitle: z.boolean().default(true),
  backgroundColor: z.string().default('#ffffff'), // Hex color string (white)
  textColor: z.string().default('#000000'), // Hex color string (black)
  maxWidth: z.enum(['narrow', 'normal', 'wide', 'full']).default('normal'),
})

export type CustomTextBlockProps = z.infer<typeof customTextBlockPropsSchema>

// =============================================================================
// PHOTO+TEXT BLOCK
// =============================================================================

export const photoTextBlockPropsSchema = z.object({
  // Image configuration
  imageUrl: z.string().default(''),
  imageAlt: z.string().optional(),
  imageAspect: z.enum(['square', 'portrait-3-4', 'portrait-9-16']).default('square'),
  imagePosition: z.enum(['left', 'right']).default('left'),
  // Text content
  header: z.string().optional(),
  tagline: z.string().optional(),
  body: z.string().optional(),
})

export type PhotoTextBlockProps = z.infer<typeof photoTextBlockPropsSchema>

// =============================================================================
// MEDIA BLOCK
// =============================================================================

const galleryImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  alt: z.string().optional(),
})

export const mediaBlockPropsSchema = z.object({
  // Media type selection
  mediaKind: z.enum(['image', 'video']).default('image'),
  // Aspect ratio for display
  aspect: z.enum(['square', 'landscape-16-9']).default('landscape-16-9'),
  // Image mode (single or gallery)
  imageMode: z.enum(['single', 'gallery']).default('single'),
  // Single image URL
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  // Gallery images (for gallery mode)
  galleryImages: z.array(galleryImageSchema).default([]),
  // Video URL (for video mode) - supports YouTube, Vimeo, direct links
  videoUrl: z.string().optional(),
})

export type MediaBlockProps = z.infer<typeof mediaBlockPropsSchema>

// Union of all block props
export type BlockProps =
  | HeroBlockProps
  | CareTeamBlockProps
  | ClinicsBlockProps
  | ServicesBlockProps
  | TrustBarBlockProps
  | HowItWorksBlockProps
  | TestimonialsBlockProps
  | FAQBlockProps
  | ContactBlockProps
  | CTABandBlockProps
  | CustomTextBlockProps
  | PhotoTextBlockProps
  | MediaBlockProps

// =============================================================================
// BLOCK APPEARANCE CONFIGURATION
// =============================================================================

/**
 * Semantic background tokens available for blocks.
 * These map to CSS variables defined in the theme system.
 */
export const BackgroundTokens = [
  'default', // Use block's default (no override)
  'primary', // --theme-bg-primary (usually white)
  'secondary', // --theme-bg-secondary (usually light gray)
  'surface', // --theme-surface (card background)
  'accent', // --theme-primary-color (brand color)
  'accent-light', // Lighter version of accent
  'transparent', // No background
] as const

export type BackgroundToken = (typeof BackgroundTokens)[number]

/**
 * Semantic text color tokens available for blocks.
 * These map to CSS variables defined in the theme system.
 */
export const TextTokens = [
  'default', // Use block's default (no override)
  'primary', // --theme-text-primary (dark text)
  'secondary', // --theme-text-secondary (medium text)
  'tertiary', // --theme-text-tertiary (light text)
  'on-accent', // White/contrasting text for colored backgrounds
  'accent', // --theme-primary-color (brand color for links/emphasis)
] as const

export type TextToken = (typeof TextTokens)[number]

/**
 * Button appearance schema for CTA buttons
 * Uses same token + custom override pattern as block appearance
 * Note: Uses inline arrays to avoid forward reference issues
 */
export const buttonAppearanceSchema = z.object({
  backgroundToken: z.enum(['default', 'primary', 'secondary', 'surface', 'accent', 'accent-light', 'transparent']).optional(),
  backgroundCustom: z.string().optional(),
  textToken: z.enum(['default', 'primary', 'secondary', 'tertiary', 'on-accent', 'accent']).optional(),
  textCustom: z.string().optional(),
})

export type ButtonAppearance = z.infer<typeof buttonAppearanceSchema>

/**
 * Block appearance configuration schema.
 * Allows per-block background and text color customization.
 *
 * Design: Token-first with optional custom hex overrides.
 * - Tokens provide consistency with the theme system
 * - Custom hex values allow flexibility when needed
 * - If customHex is provided, it takes precedence over token
 */
export const blockAppearanceSchema = z.object({
  // Background configuration
  backgroundToken: z.enum(BackgroundTokens).default('default'),
  backgroundCustom: z.string().optional(), // Custom hex color (e.g., '#f5f5f5')

  // Text color configuration
  textToken: z.enum(TextTokens).default('default'),
  textCustom: z.string().optional(), // Custom hex color (e.g., '#333333')
})

export type BlockAppearance = z.infer<typeof blockAppearanceSchema>

/**
 * Default appearance (uses block's built-in styling)
 */
export const DEFAULT_BLOCK_APPEARANCE: BlockAppearance = {
  backgroundToken: 'default',
  backgroundCustom: undefined,
  textToken: 'default',
  textCustom: undefined,
}

// Block instance schema
export const blockInstanceSchema = z.object({
  id: z.string(),
  type: blockTypeSchema,
  enabled: z.boolean().default(true),
  props: z.record(z.unknown()).default({}),
  // Optional appearance overrides (new)
  appearance: blockAppearanceSchema.optional(),
})

export type BlockInstance = z.infer<typeof blockInstanceSchema>

// Block metadata for the builder UI
export const blockMetadata: Record<
  BlockType,
  {
    name: string
    description: string
    icon: string
    category: 'required' | 'recommended'
    defaultProps: Record<string, unknown>
  }
> = {
  hero: {
    name: 'Hero',
    description:
      'Main banner with headline, tagline, and call-to-action buttons',
    icon: 'Layout',
    category: 'required',
    defaultProps: heroBlockPropsSchema.parse({}),
  },
  'care-team': {
    name: 'Care Team',
    description:
      'Display your healthcare providers with photos and credentials',
    icon: 'Users',
    category: 'required',
    defaultProps: careTeamBlockPropsSchema.parse({}),
  },
  clinics: {
    name: 'Locations',
    description: 'Show clinic locations with addresses, hours, and maps',
    icon: 'MapPin',
    category: 'required',
    defaultProps: clinicsBlockPropsSchema.parse({}),
  },
  services: {
    name: 'Services',
    description: 'List your available services and appointment types',
    icon: 'Heart',
    category: 'required',
    defaultProps: servicesBlockPropsSchema.parse({}),
  },
  'trust-bar': {
    name: 'Trust Bar',
    description: 'Display insurance, accreditations, and ratings',
    icon: 'Shield',
    category: 'recommended',
    defaultProps: trustBarBlockPropsSchema.parse({}),
  },
  'how-it-works': {
    name: 'How It Works',
    description: 'Step-by-step process for patients',
    icon: 'ListOrdered',
    category: 'recommended',
    defaultProps: howItWorksBlockPropsSchema.parse({}),
  },
  testimonials: {
    name: 'Testimonials',
    description: 'Patient reviews and quotes',
    icon: 'MessageSquare',
    category: 'recommended',
    defaultProps: testimonialsBlockPropsSchema.parse({}),
  },
  faq: {
    name: 'FAQ',
    description: 'Frequently asked questions accordion',
    icon: 'HelpCircle',
    category: 'recommended',
    defaultProps: faqBlockPropsSchema.parse({}),
  },
  contact: {
    name: 'Contact & Hours',
    description: 'Contact information and business hours',
    icon: 'Phone',
    category: 'recommended',
    defaultProps: contactBlockPropsSchema.parse({}),
  },
  'cta-band': {
    name: 'CTA Band',
    description: 'Final call-to-action section',
    icon: 'Megaphone',
    category: 'recommended',
    defaultProps: ctaBandBlockPropsSchema.parse({}),
  },
  'custom-text': {
    name: 'Custom Text',
    description: 'Custom text content section',
    icon: 'FileText',
    category: 'recommended',
    defaultProps: customTextBlockPropsSchema.parse({}),
  },
  'photo-text': {
    name: 'Photo + Text',
    description: 'Image alongside header, tagline, and body text',
    icon: 'ImageIcon',
    category: 'recommended',
    defaultProps: photoTextBlockPropsSchema.parse({}),
  },
  media: {
    name: 'Media',
    description: 'Image, video, or gallery showcase',
    icon: 'Play',
    category: 'recommended',
    defaultProps: mediaBlockPropsSchema.parse({}),
  },
}

// Alias for backwards compatibility
export const BLOCK_METADATA = blockMetadata

// =============================================================================
// THEME CONFIGURATION
// =============================================================================

export const fontPairs = [
  {
    id: 'inter-system',
    heading: 'Inter',
    body: 'system-ui',
    name: 'Inter + System',
  },
  {
    id: 'poppins-inter',
    heading: 'Poppins',
    body: 'Inter',
    name: 'Poppins + Inter',
  },
  {
    id: 'playfair-lato',
    heading: 'Playfair Display',
    body: 'Lato',
    name: 'Playfair + Lato',
  },
  {
    id: 'montserrat-opensans',
    heading: 'Montserrat',
    body: 'Open Sans',
    name: 'Montserrat + Open Sans',
  },
  {
    id: 'raleway-roboto',
    heading: 'Raleway',
    body: 'Roboto',
    name: 'Raleway + Roboto',
  },
] as const

export type FontPairId = (typeof fontPairs)[number]['id']

// Create a record version for easy lookup with names
export const FONT_PAIRS: Record<
  string,
  { heading: string; body: string; name: string }
> = Object.fromEntries(
  fontPairs.map((fp) => [
    fp.id,
    { heading: fp.heading, body: fp.body, name: fp.name },
  ])
)

export const themeConfigSchema = z.object({
  // Colors - can override tenant branding
  primaryColor: z.string().default('#5FBFAF'),
  secondaryColor: z.string().default('#5F284A'),
  accentColor: z.string().default('#E8927C'),
  backgroundColor: z.string().default('#ffffff'),
  textColor: z.string().default('#1a1a1a'),

  // Typography
  fontPair: z.string().default('inter-system'),
  headingSize: z.enum(['small', 'medium', 'large']).default('medium'),

  // Spacing and sizing
  sectionSpacing: z.enum(['compact', 'normal', 'spacious']).default('normal'),
  cornerRadius: z
    .enum(['none', 'small', 'medium', 'large', 'full'])
    .default('medium'),
  buttonStyle: z.enum(['solid', 'outline', 'ghost']).default('solid'),

  // Mode
  colorMode: z.enum(['light', 'dark', 'auto']).default('light'),

  // Custom CSS (advanced)
  customCss: z.string().optional(),
})

export type ThemeConfig = z.infer<typeof themeConfigSchema>

// Default theme values
export const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#5FBFAF',
  secondaryColor: '#5F284A',
  accentColor: '#E8927C',
  backgroundColor: '#ffffff',
  textColor: '#1a1a1a',
  fontPair: 'inter-system',
  headingSize: 'medium',
  sectionSpacing: 'normal',
  cornerRadius: 'medium',
  buttonStyle: 'solid',
  colorMode: 'light',
}

// =============================================================================
// SEO CONFIGURATION
// =============================================================================

export const seoConfigSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  ogImage: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  twitterCard: z
    .enum(['summary', 'summary_large_image'])
    .default('summary_large_image'),
  canonicalUrl: z.string().optional(),
  noIndex: z.boolean().default(false),
})

export type SEOConfig = z.infer<typeof seoConfigSchema>

// =============================================================================
// WEBSITE DEFINITION (MAIN SCHEMA)
// =============================================================================

export const websiteDefinitionSchema = z.object({
  // Schema version for migrations
  version: z.string().default('1.0.0'),

  // Site structure - determines navigation behavior
  siteStructure: siteStructureSchema.default('multi-page'),

  // Template selection (deprecated - kept for backwards compatibility)
  templateId: templateIdSchema.default('classic-stacked'),

  // Header configuration
  header: headerConfigSchema.default({}),

  // Footer configuration
  footer: footerConfigSchema.default({}),

  // Theme configuration
  theme: themeConfigSchema.default({}),

  // Content blocks (for home page - backwards compatible)
  blocks: z.array(blockInstanceSchema).default([]),

  // Pages configuration (for multi-page structure)
  pages: z.array(pageConfigSchema).optional(),

  // Active page being edited (for builder state)
  activePageId: z.string().optional(),

  // SEO settings
  seo: seoConfigSchema.default({}),

  // Metadata
  publishedAt: z.number().optional(),
  lastEditedAt: z.number().optional(),
  lastEditedBy: z.string().optional(),
})

export type WebsiteDefinition = z.infer<typeof websiteDefinitionSchema>

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates default pages for a new website
 * Each page now includes pre-built content blocks so tenants can edit
 * rather than starting from scratch.
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
  ]
}

/**
 * Creates a default website definition for a new tenant
 *
 * @param siteStructure - The site structure type (defaults to 'multi-page')
 */
export function createDefaultWebsiteDefinition(
  siteStructure: SiteStructure = 'multi-page'
): WebsiteDefinition {
  const defaultBlocks = [
    {
      id: 'hero-1',
      type: 'hero' as const,
      enabled: true,
      props: blockMetadata['hero'].defaultProps,
    },
    {
      id: 'services-1',
      type: 'services' as const,
      enabled: true,
      props: blockMetadata['services'].defaultProps,
    },
    {
      id: 'care-team-1',
      type: 'care-team' as const,
      enabled: true,
      props: blockMetadata['care-team'].defaultProps,
    },
    {
      id: 'clinics-1',
      type: 'clinics' as const,
      enabled: true,
      props: blockMetadata['clinics'].defaultProps,
    },
    {
      id: 'contact-1',
      type: 'contact' as const,
      enabled: true,
      props: blockMetadata['contact'].defaultProps,
    },
    {
      id: 'cta-band-1',
      type: 'cta-band' as const,
      enabled: true,
      props: blockMetadata['cta-band'].defaultProps,
    },
  ]

  return websiteDefinitionSchema.parse({
    version: '1.0.0',
    siteStructure,
    templateId: 'classic-stacked', // Kept for backwards compatibility
    header: {
      ...headerConfigSchema.parse({}),
      navItems: getDefaultNavItems(siteStructure),
    },
    footer: footerConfigSchema.parse({}),
    theme: themeConfigSchema.parse({}),
    blocks: defaultBlocks,
    // Only include pages for multi-page structure
    pages: siteStructure === 'multi-page' ? getDefaultPages() : undefined,
    seo: seoConfigSchema.parse({}),
    lastEditedAt: Date.now(),
  })
}

/**
 * Validates a website definition
 */
export function validateWebsiteDefinition(data: unknown): {
  success: boolean
  data?: WebsiteDefinition
  error?: z.ZodError
} {
  const result = websiteDefinitionSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * Creates a new block instance with unique ID
 */
export function createBlockInstance(type: BlockType): BlockInstance {
  const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  return {
    id,
    type,
    enabled: true,
    props: blockMetadata[type].defaultProps,
  }
}

/**
 * Gets block props schema by type
 */
export function getBlockPropsSchema(type: BlockType): z.ZodSchema {
  const schemas: Record<BlockType, z.ZodSchema> = {
    hero: heroBlockPropsSchema,
    'care-team': careTeamBlockPropsSchema,
    clinics: clinicsBlockPropsSchema,
    services: servicesBlockPropsSchema,
    'trust-bar': trustBarBlockPropsSchema,
    'how-it-works': howItWorksBlockPropsSchema,
    testimonials: testimonialsBlockPropsSchema,
    faq: faqBlockPropsSchema,
    contact: contactBlockPropsSchema,
    'cta-band': ctaBandBlockPropsSchema,
    'custom-text': customTextBlockPropsSchema,
    'photo-text': photoTextBlockPropsSchema,
    media: mediaBlockPropsSchema,
  }
  return schemas[type]
}

/**
 * Parses and validates block props
 */
export function parseBlockProps<T extends BlockType>(
  type: T,
  props: Record<string, unknown>
): BlockProps {
  const schema = getBlockPropsSchema(type)
  return schema.parse(props) as BlockProps
}

/**
 * Creates default pages configuration
 * Each page now includes pre-built content blocks so tenants can edit
 * rather than starting from scratch.
 */
export function createDefaultPages(): PageConfig[] {
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
      order: 1,
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
      order: 2,
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
      order: 3,
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
      order: 4,
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
  ]
}

/**
 * Creates a new custom page
 */
export function createCustomPage(title: string, slug: string): PageConfig {
  const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  return {
    id,
    type: 'custom',
    title,
    slug,
    enabled: true,
    showInHeader: true,
    showInFooter: false,
    blocks: [
      {
        id: `custom-text-${Date.now()}`,
        type: 'custom-text',
        enabled: true,
        props: {
          title: title,
          content: '',
          alignment: 'left',
          showTitle: true,
          backgroundColor: '#ffffff',
          textColor: '#000000',
          maxWidth: 'normal',
        },
      },
    ],
    order: 50,
  }
}

/**
 * Gets pages that should appear in header navigation
 */
export function getHeaderNavPages(pages: PageConfig[]): PageConfig[] {
  return pages
    .filter((p) => p.enabled && p.showInHeader)
    .sort((a, b) => a.order - b.order)
}

/**
 * Gets pages that should appear in footer navigation
 */
export function getFooterNavPages(pages: PageConfig[]): PageConfig[] {
  return pages
    .filter((p) => p.enabled && p.showInFooter)
    .sort((a, b) => a.order - b.order)
}

/**
 * Generates nav items from pages configuration
 *
 * @param pages - Array of page configurations
 * @param forHeader - Whether generating for header (true) or footer (false)
 * @param siteStructure - Site structure type to determine link format
 *   - 'one-pager': Uses anchor links (#services, #team)
 *   - 'multi-page': Uses page URLs (/services, /team)
 */
export function generateNavItemsFromPages(
  pages: PageConfig[],
  forHeader: boolean = true,
  siteStructure: SiteStructure = 'multi-page'
): NavItem[] {
  const filteredPages = forHeader
    ? getHeaderNavPages(pages)
    : getFooterNavPages(pages)

  return filteredPages.map((page) => {
    // For one-pager, use anchor links that scroll to sections
    if (siteStructure === 'one-pager') {
      return {
        id: page.id,
        label: page.title,
        href: page.type === 'home' ? '#hero' : `#${page.slug}`,
        isExternal: false,
        pageId: page.id,
      }
    }

    // For multi-page, use actual page URLs
    return {
      id: page.id,
      label: page.title,
      href: page.type === 'home' ? '/' : `/${page.slug}`,
      isExternal: false,
      pageId: page.id,
    }
  })
}

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
    ]
  }

  // Multi-page uses real URLs
  return [
    {
      id: 'services',
      label: 'Services',
      href: '/services',
      pageId: 'services',
    },
    { id: 'team', label: 'Our Team', href: '/team', pageId: 'team' },
    {
      id: 'locations',
      label: 'Locations',
      href: '/locations',
      pageId: 'locations',
    },
    { id: 'contact', label: 'Contact', href: '/contact', pageId: 'contact' },
  ]
}

/**
 * Counts custom pages in the pages array
 */
export function countCustomPages(pages: PageConfig[]): number {
  return pages.filter((p) => p.type === 'custom').length
}

/**
 * Checks if more custom pages can be added
 */
export function canAddCustomPage(pages: PageConfig[]): boolean {
  return countCustomPages(pages) < MAX_CUSTOM_PAGES
}
