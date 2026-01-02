/**
 * Website Builder Zod Schemas
 * 
 * Defines validation schemas for all website-related data.
 */

import { z } from 'zod';
import { 
  SiteStructures, 
  TemplateIds, 
  HeaderVariants, 
  FooterVariants, 
  BlockTypes,
  socialPlatforms,
  type BlockType
} from './types';

// =============================================================================
// SHARED SUB-SCHEMAS
// =============================================================================

export const navItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  isExternal: z.boolean().optional(),
  pageId: z.string().optional(),
});

export const socialLinkSchema = z.object({
  id: z.string(),
  platform: z.enum(socialPlatforms),
  url: z.string(),
  enabled: z.boolean().default(true),
});

export const backgroundTokenSchema = z.enum(['default', 'primary', 'secondary', 'surface', 'accent', 'accent-light', 'transparent']);
export const textTokenSchema = z.enum(['default', 'primary', 'secondary', 'tertiary', 'on-accent', 'accent']);

export const blockAppearanceSchema = z.object({
  backgroundColor: z.string().optional(),
  backgroundToken: backgroundTokenSchema.default('default'),
  backgroundCustom: z.string().optional(),
  textColor: z.string().optional(),
  textToken: textTokenSchema.default('default'),
  textCustom: z.string().optional(),
  paddingTop: z.enum(['none', 'small', 'medium', 'large']).default('medium'),
  paddingBottom: z.enum(['none', 'small', 'medium', 'large']).default('medium'),
  borderTop: z.boolean().default(false),
  borderBottom: z.boolean().default(false),
  maxWidth: z.enum(['narrow', 'normal', 'wide', 'full']).default('normal'),
});

// =============================================================================
// BLOCK PROP SCHEMAS
// =============================================================================

const heroButtonAppearanceSchema = z.object({
  backgroundToken: z.enum(['default', 'primary', 'secondary', 'surface', 'accent', 'accent-light', 'transparent']).optional(),
  backgroundCustom: z.string().optional(),
  textToken: z.enum(['default', 'primary', 'secondary', 'tertiary', 'on-accent', 'accent']).optional(),
  textCustom: z.string().optional(),
});

const heroTextAppearanceSchema = z.object({
  textToken: z.enum(['default', 'primary', 'secondary', 'tertiary', 'on-accent', 'accent']).optional(),
  textCustom: z.string().optional(),
});

export const heroBlockPropsSchema = z.object({
  headline: z.string().default('Welcome to Our Clinic'),
  tagline: z.string().default('Quality healthcare for you and your family'),
  primaryCtaText: z.string().default('Book Appointment'),
  primaryCtaLink: z.string().optional(),
  secondaryCtaText: z.string().optional(),
  secondaryCtaLink: z.string().optional(),
  backgroundType: z.enum(['gradient', 'solid', 'image']).default('gradient'),
  backgroundColor: z.string().default('var(--zenthea-teal)'),
  gradientFrom: z.string().default('var(--zenthea-teal)'),
  gradientTo: z.string().default('var(--zenthea-purple)'),
  gradientDirection: z.enum(['to-r', 'to-l', 'to-t', 'to-b', 'to-tr', 'to-tl', 'to-br', 'to-bl']).default('to-br'),
  backgroundImage: z.string().optional(),
  backgroundOverlay: z.number().min(0).max(1).default(0.4),
  alignment: z.enum(['left', 'center', 'right']).default('center'),
  primaryButtonAppearance: heroButtonAppearanceSchema.optional(),
  secondaryButtonAppearance: heroButtonAppearanceSchema.optional(),
  headingTextAppearance: heroTextAppearanceSchema.optional(),
  taglineTextAppearance: heroTextAppearanceSchema.optional(),
});

export const careTeamBlockPropsSchema = z.object({
  title: z.string().default('Meet Our Care Team'),
  subtitle: z.string().optional(),
  maxProviders: z.number().min(1).max(12).default(4),
  showSpecialties: z.boolean().default(true),
  showCredentials: z.boolean().default(true),
  showBookButton: z.boolean().default(true),
  layout: z.enum(['grid', 'carousel']).default('grid'),
});

export const clinicsBlockPropsSchema = z.object({
  title: z.string().default('Our Locations'),
  subtitle: z.string().optional(),
  showMap: z.boolean().default(true),
  showHours: z.boolean().default(true),
  showPhone: z.boolean().default(true),
  layout: z.enum(['grid', 'list', 'map-first']).default('grid'),
});

export const servicesBlockPropsSchema = z.object({
  title: z.string().default('Our Services'),
  subtitle: z.string().optional(),
  showDuration: z.boolean().default(true),
  showDescription: z.boolean().default(true),
  showPrice: z.boolean().default(true),
  layout: z.enum(['grid', 'list']).default('grid'),
  maxServices: z.number().min(1).max(20).optional(),
});

export const trustBarItemSchema = z.object({
  id: z.string(),
  type: z.enum(['insurance', 'accreditation', 'compliance', 'rating', 'affiliation', 'award', 'custom']),
  presetId: z.string().optional(),
  label: z.string(),
  shortLabel: z.string().optional(),
  imageUrl: z.string().optional(),
  verifyUrl: z.string().optional(),
  ratingSource: z.string().optional(),
  ratingValue: z.string().optional(),
  ratingCount: z.string().optional(),
  profileUrl: z.string().optional(),
  value: z.string().optional(),
});

export const trustBarBlockPropsSchema = z.object({
  items: z.array(trustBarItemSchema).default([]),
  layout: z.enum(['horizontal', 'grid']).default('horizontal'),
  showLabels: z.boolean().default(true),
  grayscaleLogos: z.boolean().default(true),
  compactMode: z.boolean().default(false),
});

export const HowItWorksLayouts = ['numbered-circles', 'timeline', 'cards', 'minimal'] as const;
export const HowItWorksIconShapes = ['circle', 'rounded-square', 'square'] as const;
export const HowItWorksIcons = [
  'calendar', 'clock', 'calendar-check', 'timer',
  'map-pin', 'building-2', 'home', 'navigation',
  'heart', 'stethoscope', 'pill', 'thermometer', 'activity', 'heart-pulse',
  'phone', 'mail', 'message-circle', 'video',
  'check-circle', 'star', 'shield', 'users', 'file-text', 'award',
] as const;

export const howItWorksBlockPropsSchema = z.object({
  title: z.string().default('How It Works'),
  subtitle: z.string().optional(),
  layout: z.enum(HowItWorksLayouts).default('numbered-circles'),
  iconShape: z.enum(HowItWorksIconShapes).default('circle'),
  steps: z.array(z.object({
    id: z.string(),
    number: z.number(),
    title: z.string(),
    description: z.string(),
    icon: z.enum(HowItWorksIcons).optional(),
  })).default([]),
});

const testimonialItemSchema = z.object({
  id: z.string(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  name: z.string(),
  tagline: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  header: z.string().optional(),
  testimonial: z.string(),
});

export const TestimonialsLayouts = ['hero-card', 'carousel-cards', 'grid-cards', 'stacked-list', 'centered-quote'] as const;

export const testimonialsBlockPropsSchema = z.object({
  title: z.string().default('What Our Patients Say'),
  subtitle: z.string().optional(),
  testimonials: z.array(testimonialItemSchema).default([]),
  layout: z.enum(TestimonialsLayouts).default('carousel-cards'),
  maxVisible: z.number().min(1).max(6).default(3),
});

export const faqBlockPropsSchema = z.object({
  title: z.string().default('Frequently Asked Questions'),
  subtitle: z.string().optional(),
  items: z.array(z.object({
    id: z.string(),
    question: z.string(),
    answer: z.string(),
  })).default([]),
  layout: z.enum(['accordion', 'two-column', 'split-panel', 'card-grid']).default('accordion'),
});

export const contactBlockPropsSchema = z.object({
  title: z.string().default('Contact Us'),
  subtitle: z.string().optional(),
  showPhone: z.boolean().default(true),
  showEmail: z.boolean().default(true),
  showAddress: z.boolean().default(true),
  showHours: z.boolean().default(true),
  showMap: z.boolean().default(false),
  layout: z.enum(['horizontal', 'vertical', 'card-grid']).default('card-grid'),
});

export const ctaBandBlockPropsSchema = z.object({
  headline: z.string().default('Ready to Get Started?'),
  subheadline: z.string().optional(),
  primaryCtaText: z.string().default('Book Now'),
  primaryCtaLink: z.string().optional(),
  secondaryCtaText: z.string().optional(),
  secondaryCtaLink: z.string().optional(),
  backgroundColor: z.enum(['primary', 'secondary', 'gradient']).optional(),
  primaryButtonAppearance: heroButtonAppearanceSchema.optional(),
  secondaryButtonAppearance: heroButtonAppearanceSchema.optional(),
});

export const customTextBlockPropsSchema = z.object({
  title: z.string().default('About Us'),
  content: z.string().default(''),
  alignment: z.enum(['left', 'center', 'right']).default('left'),
  showTitle: z.boolean().default(true),
  backgroundColor: z.string().default('#ffffff'),
  textColor: z.string().default('#000000'),
  maxWidth: z.enum(['narrow', 'normal', 'wide', 'full']).default('normal'),
});

export const photoTextBlockPropsSchema = z.object({
  imageUrl: z.string().default(''),
  imageAlt: z.string().optional(),
  imageAspect: z.enum(['square', 'portrait-3-4', 'portrait-9-16']).default('square'),
  imagePosition: z.enum(['left', 'right']).default('left'),
  header: z.string().optional(),
  tagline: z.string().optional(),
  body: z.string().optional(),
});

const galleryImageSchema = z.object({
  id: z.string(),
  url: z.string(),
});

export const mediaBlockPropsSchema = z.object({
  mediaKind: z.enum(['image', 'video']).default('image'),
  aspect: z.enum(['square', 'landscape-16-9']).default('landscape-16-9'),
  imageMode: z.enum(['single', 'gallery']).default('single'),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  galleryImages: z.array(galleryImageSchema).default([]),
  videoUrl: z.string().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the Zod schema for a specific block type's props
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
  };
  return schemas[type];
}

/**
 * Parses and validates block props
 */
export function parseBlockProps<T extends BlockType>(
  type: T,
  props: Record<string, unknown>
): any {
  const schema = getBlockPropsSchema(type);
  return schema.parse(props);
}

// =============================================================================
// MAIN SCHEMAS
// =============================================================================

export const siteStructureSchema = z.enum(SiteStructures);
export const templateIdSchema = z.enum(TemplateIds);
export const headerVariantSchema = z.enum(HeaderVariants);
export const footerVariantSchema = z.enum(FooterVariants);
export const blockTypeSchema = z.enum(BlockTypes);

export const blockInstanceSchema = z.object({
  id: z.string(),
  type: blockTypeSchema,
  enabled: z.boolean().default(true),
  props: z.record(z.any()),
  appearance: blockAppearanceSchema.optional(),
});

export const pageTypeSchema = z.enum([
  'home', 'services', 'team', 'locations', 'contact', 'terms', 'privacy', 'custom'
]);

export const pageConfigSchema = z.object({
  id: z.string(),
  type: pageTypeSchema,
  title: z.string(),
  slug: z.string(),
  enabled: z.boolean().default(true),
  showInHeader: z.boolean().default(true),
  showInFooter: z.boolean().default(true),
  blocks: z.array(blockInstanceSchema).default([]),
  order: z.number().default(0),
  useDefaultContent: z.boolean().optional(),
});

export const footerColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  links: z.array(navItemSchema),
});

export const footerMenuPageItemSchema = z.object({
  id: z.string(),
  kind: z.literal('page'),
  pageId: z.string(),
});

export const footerMenuExternalItemSchema = z.object({
  id: z.string(),
  kind: z.literal('external'),
  label: z.string(),
  url: z.string(),
  openInNewTab: z.boolean().optional(),
});

export const footerMenuItemSchema = z.union([
  footerMenuPageItemSchema,
  footerMenuExternalItemSchema
]);

export const footerMenuSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(footerMenuItemSchema),
});

export const footerMenuColumnSchema = z.object({
  id: z.string(),
  layoutOrder: z.number(),
  sections: z.array(footerMenuSectionSchema),
});

export const headerConfigSchema = z.object({
  variant: headerVariantSchema.default('sticky-simple'),
  logoUrl: z.string().optional(),
  logoAlt: z.string().optional(),
  navItems: z.array(navItemSchema).default([]),
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
  transparent: z.boolean().default(true),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  mobileBackgroundColor: z.string().optional(),
  mobileTextColor: z.string().optional(),
  headerBackgroundColor: z.string().optional(),
  headerTextColor: z.string().optional(),
  headerMobileBackgroundColor: z.string().optional(),
  headerMobileTextColor: z.string().optional(),
  useThemeColors: z.boolean().optional(),
});

export const footerConfigSchema = z.object({
  variant: footerVariantSchema.default('multi-column'),
  columns: z.array(footerColumnSchema).default([]),
  menuColumns: z.array(footerMenuColumnSchema).optional(),
  showLogo: z.boolean().default(true),
  tagline: z.string().optional(),
  showSocial: z.boolean().default(true),
  socialLinks: z.array(socialLinkSchema).default([]),
  showNewsletter: z.boolean().default(true),
  newsletterTitle: z.string().optional(),
  newsletterHeadline: z.string().optional(),
  legalLinks: z.array(z.object({ id: z.string(), label: z.string(), href: z.string() })).default([]),
  copyrightText: z.string().optional(),
  poweredByZenthea: z.boolean().default(true),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  footerBackgroundColor: z.string().optional(),
  footerTextColor: z.string().optional(),
  useThemeColors: z.boolean().optional(),
  externalLinks: z.array(z.object({
    id: z.string(),
    label: z.string(),
    url: z.string(),
    openInNewTab: z.boolean().optional(),
  })).optional(),
});

export const themeConfigSchema = z.object({
  primaryColor: z.string().default('#5FBFAF'),
  secondaryColor: z.string().default('#5F284A'),
  accentColor: z.string().default('#FF8C42'),
  backgroundColor: z.string().default('#FFFFFF'),
  textColor: z.string().default('#1A1A1A'),
  fontPair: z.string().default('inter-outfit'),
  headingSize: z.enum(['small', 'medium', 'large']).default('medium'),
  sectionSpacing: z.enum(['compact', 'normal', 'spacious']).default('normal'),
  cornerRadius: z.enum(['none', 'small', 'medium', 'large', 'full']).default('medium'),
  buttonStyle: z.enum(['solid', 'outline', 'ghost']).default('solid'),
  colorMode: z.enum(['light', 'dark', 'auto']).default('light'),
});

export const seoConfigSchema = z.object({
  titleTemplate: z.string().default('%s | Zenthea Healthcare'),
  defaultDescription: z.string().default('Quality healthcare services provided by Zenthea clinics.'),
  faviconUrl: z.string().optional(),
  ogImageUrl: z.string().optional(),
});

export const websiteDefinitionSchema = z.object({
  version: z.string().default('1.0.0'),
  siteStructure: siteStructureSchema.default('multi-page'),
  templateId: templateIdSchema.default('classic-stacked'),
  theme: themeConfigSchema,
  header: headerConfigSchema,
  footer: footerConfigSchema,
  blocks: z.array(blockInstanceSchema).default([]),
  pages: z.array(pageConfigSchema).default([]),
  seo: seoConfigSchema,
});

// =============================================================================
// BLOCK METADATA
// =============================================================================

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
    name: 'Hero Section',
    description: 'The main introduction at the top of the page',
    icon: 'Layout',
    category: 'required',
    defaultProps: heroBlockPropsSchema.parse({}),
  },
  'care-team': {
    name: 'Care Team',
    description: 'Display your team of healthcare providers',
    icon: 'Users',
    category: 'required',
    defaultProps: careTeamBlockPropsSchema.parse({}),
  },
  clinics: {
    name: 'Our Locations',
    description: 'Showcase your clinic locations and contact info',
    icon: 'MapPin',
    category: 'required',
    defaultProps: clinicsBlockPropsSchema.parse({}),
  },
  services: {
    name: 'Services',
    description: 'List the medical services you provide',
    icon: 'Heart',
    category: 'required',
    defaultProps: servicesBlockPropsSchema.parse({}),
  },
  'trust-bar': {
    name: 'Trust Bar',
    description: 'Badges, awards, or partners to build credibility',
    icon: 'Shield',
    category: 'recommended',
    defaultProps: trustBarBlockPropsSchema.parse({}),
  },
  'how-it-works': {
    name: 'How It Works',
    description: 'Step-by-step guide for patients',
    icon: 'ListOrdered',
    category: 'recommended',
    defaultProps: howItWorksBlockPropsSchema.parse({}),
  },
  testimonials: {
    name: 'Testimonials',
    description: 'Patient reviews and feedback',
    icon: 'MessageSquare',
    category: 'recommended',
    defaultProps: testimonialsBlockPropsSchema.parse({}),
  },
  faq: {
    name: 'FAQ',
    description: 'Frequently asked questions',
    icon: 'HelpCircle',
    category: 'recommended',
    defaultProps: faqBlockPropsSchema.parse({}),
  },
  contact: {
    name: 'Contact Info',
    description: 'Main contact information and business hours',
    icon: 'Phone',
    category: 'recommended',
    defaultProps: contactBlockPropsSchema.parse({}),
  },
  'cta-band': {
    name: 'Call to Action',
    description: 'Large band to encourage appointment booking',
    icon: 'Sparkles',
    category: 'recommended',
    defaultProps: ctaBandBlockPropsSchema.parse({}),
  },
  'custom-text': {
    name: 'Custom Text',
    description: 'Free-form text area with rich formatting',
    icon: 'FileText',
    category: 'recommended',
    defaultProps: customTextBlockPropsSchema.parse({}),
  },
  'photo-text': {
    name: 'Photo & Text',
    description: 'Side-by-side image and text layout',
    icon: 'Image',
    category: 'recommended',
    defaultProps: photoTextBlockPropsSchema.parse({}),
  },
  media: {
    name: 'Media (Video)',
    description: 'Video embed or custom media content',
    icon: 'Video',
    category: 'recommended',
    defaultProps: mediaBlockPropsSchema.parse({}),
  },
}
