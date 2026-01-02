/**
 * Website Builder Types and Constants
 */

// =============================================================================
// SITE STRUCTURE TYPES
// =============================================================================

export const SiteStructures = ['one-pager', 'multi-page'] as const;
export type SiteStructure = (typeof SiteStructures)[number];

// =============================================================================
// TEMPLATE TYPES (DEPRECATED)
// =============================================================================

export const TemplateIds = [
  'classic-stacked',
  'bento-grid',
  'split-hero',
  'multi-location',
  'team-forward',
] as const;
export type TemplateId = (typeof TemplateIds)[number];

// =============================================================================
// HEADER & FOOTER VARIANTS
// =============================================================================

export const HeaderVariants = ['sticky-simple', 'centered', 'info-bar'] as const;
export type HeaderVariant = (typeof HeaderVariants)[number];

export const FooterVariants = ['multi-column', 'minimal'] as const;
export type FooterVariant = (typeof FooterVariants)[number];

// =============================================================================
// BLOCK TYPES
// =============================================================================

export const BlockTypes = [
  'hero',
  'care-team',
  'clinics',
  'services',
  'trust-bar',
  'how-it-works',
  'testimonials',
  'faq',
  'contact',
  'cta-band',
  'custom-text',
  'photo-text',
  'media',
] as const;

export type BlockType = (typeof BlockTypes)[number];

export const BLOCK_TYPES = BlockTypes;

// =============================================================================
// INTERFACES & PROP TYPES
// =============================================================================

export interface NavItem {
  id: string;
  label: string;
  href: string;
  isExternal?: boolean;
  pageId?: string;
}

export const socialPlatforms = [
  'facebook',
  'twitter',
  'instagram',
  'linkedin',
  'youtube',
  'tiktok',
] as const;

export type SocialPlatform = (typeof socialPlatforms)[number];

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
  enabled: boolean;
}

export interface HeroBlockProps {
  headline: string;
  tagline: string;
  primaryCtaText: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  backgroundType: 'gradient' | 'solid' | 'image';
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
  gradientDirection: 'to-r' | 'to-l' | 'to-t' | 'to-b' | 'to-tr' | 'to-tl' | 'to-br' | 'to-bl';
  backgroundImage?: string;
  backgroundOverlay: number;
  alignment: 'left' | 'center' | 'right';
}

export interface CareTeamBlockProps {
  title: string;
  subtitle?: string;
  maxProviders: number;
  showSpecialties: boolean;
  showCredentials: boolean;
  showBookButton: boolean;
  layout: 'grid' | 'carousel';
}

export interface ClinicsBlockProps {
  title: string;
  subtitle?: string;
  showMap: boolean;
  showHours: boolean;
  showPhone: boolean;
  layout: 'grid' | 'list' | 'map-first';
}

export interface ServicesBlockProps {
  title: string;
  subtitle?: string;
  showDuration: boolean;
  showDescription: boolean;
  showPrice: boolean;
  layout: 'grid' | 'list';
  maxServices?: number;
}

export interface TrustBarItem {
  id: string;
  type: 'insurance' | 'accreditation' | 'compliance' | 'rating' | 'affiliation' | 'award' | 'custom';
  presetId?: string;
  label: string;
  shortLabel?: string;
  imageUrl?: string;
  verifyUrl?: string;
  ratingSource?: string;
  ratingValue?: string;
  ratingCount?: string;
  profileUrl?: string;
  value?: string;
}

export interface TrustBarBlockProps {
  items: TrustBarItem[];
  layout: 'horizontal' | 'grid';
  showLabels: boolean;
  grayscaleLogos: boolean;
  compactMode: boolean;
}

export interface HowItWorksStep {
  id: string;
  number: number;
  title: string;
  description: string;
  icon?: string;
}

export interface HowItWorksBlockProps {
  title: string;
  subtitle?: string;
  layout: 'numbered-circles' | 'timeline' | 'cards' | 'minimal';
  iconShape: 'circle' | 'rounded-square' | 'square';
  steps: HowItWorksStep[];
}

export interface TestimonialItem {
  id: string;
  imageUrl?: string;
  imageAlt?: string;
  name: string;
  tagline?: string;
  rating?: number;
  header?: string;
  testimonial: string;
}

export interface TestimonialsBlockProps {
  title: string;
  subtitle?: string;
  testimonials: TestimonialItem[];
  layout: 'hero-card' | 'carousel-cards' | 'grid-cards' | 'stacked-list' | 'centered-quote';
  maxVisible: number;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FAQBlockProps {
  title: string;
  subtitle?: string;
  items: FAQItem[];
  layout: 'accordion' | 'two-column' | 'split-panel' | 'card-grid';
}

export interface ContactBlockProps {
  title: string;
  subtitle?: string;
  showPhone: boolean;
  showEmail: boolean;
  showAddress: boolean;
  showHours: boolean;
  showMap: boolean;
  layout: 'horizontal' | 'vertical' | 'card-grid';
}

export interface CTABandBlockProps {
  headline: string;
  subheadline?: string;
  primaryCtaText: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  backgroundColor?: 'primary' | 'secondary' | 'gradient';
}

export interface CustomTextBlockProps {
  title: string;
  content: string;
  alignment: 'left' | 'center' | 'right';
  showTitle: boolean;
  backgroundColor: string;
  textColor: string;
  maxWidth: 'narrow' | 'normal' | 'wide' | 'full';
}

export interface PhotoTextBlockProps {
  imageUrl: string;
  imageAlt?: string;
  imageAspect: 'square' | 'portrait-3-4' | 'portrait-9-16';
  imagePosition: 'left' | 'right';
  header?: string;
  tagline?: string;
  body?: string;
}

export interface MediaBlockProps {
  mediaKind: 'image' | 'video';
  aspect: 'square' | 'landscape-16-9';
  imageMode: 'single' | 'gallery';
  imageUrl?: string;
  imageAlt?: string;
  galleryImages: { id: string; url: string }[];
  videoUrl?: string;
}

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
  | MediaBlockProps;

export const BackgroundTokens = ['default', 'primary', 'secondary', 'surface', 'accent', 'accent-light', 'transparent'] as const;
export type BackgroundToken = (typeof BackgroundTokens)[number];

export const TextTokens = ['default', 'primary', 'secondary', 'tertiary', 'on-accent', 'accent'] as const;
export type TextToken = (typeof TextTokens)[number];

export interface ButtonAppearance {
  backgroundToken?: BackgroundToken;
  backgroundCustom?: string;
  textToken?: TextToken;
  textCustom?: string;
}

export interface BlockAppearance {
  backgroundColor?: string;
  backgroundToken: BackgroundToken;
  backgroundCustom?: string;
  textColor?: string;
  textToken: TextToken;
  textCustom?: string;
  paddingTop?: 'none' | 'small' | 'medium' | 'large';
  paddingBottom?: 'none' | 'small' | 'medium' | 'large';
  borderTop?: boolean;
  borderBottom?: boolean;
  maxWidth?: 'narrow' | 'normal' | 'wide' | 'full';
}

export const DEFAULT_BLOCK_APPEARANCE: BlockAppearance = {
  backgroundToken: 'default',
  textToken: 'default',
  paddingTop: 'medium',
  paddingBottom: 'medium',
  maxWidth: 'normal',
};

export interface BlockInstance {
  id: string;
  type: BlockType;
  enabled: boolean;
  props: Record<string, any>;
  appearance?: BlockAppearance;
}

export type PageType = 'home' | 'services' | 'team' | 'locations' | 'contact' | 'terms' | 'privacy' | 'custom';

export interface PageConfig {
  id: string;
  type: PageType;
  title: string;
  slug: string;
  enabled: boolean;
  showInHeader: boolean;
  showInFooter: boolean;
  blocks: BlockInstance[];
  order: number;
  useDefaultContent?: boolean;
}

export interface HeaderConfig {
  variant: HeaderVariant;
  navItems: NavItem[];
  showBookingButton: boolean;
  bookingButtonText: string;
  showLoginButton: boolean;
  isSticky: boolean;
  transparentOnHero: boolean;
  backgroundColor?: string;
  textColor?: string;
}

export interface FooterConfig {
  variant: FooterVariant;
  showSocial: boolean;
  socialLinks: SocialLink[];
  showNewsletter: boolean;
  newsletterHeadline?: string;
  copyrightText?: string;
  backgroundColor?: string;
  textColor?: string;
  externalLinks?: { id: string; label: string; url: string; openInNewTab?: boolean }[];
}

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontPair: string;
  headingSize: 'small' | 'medium' | 'large';
  sectionSpacing: 'compact' | 'normal' | 'spacious';
  cornerRadius: 'none' | 'small' | 'medium' | 'large' | 'full';
  buttonStyle: 'solid' | 'outline' | 'ghost';
  colorMode: 'light' | 'dark' | 'auto';
}

export interface SEOConfig {
  titleTemplate: string;
  defaultDescription: string;
  faviconUrl?: string;
  ogImageUrl?: string;
}

export interface WebsiteDefinition {
  version: string;
  siteStructure: SiteStructure;
  templateId: TemplateId;
  theme: ThemeConfig;
  header: HeaderConfig;
  footer: FooterConfig;
  blocks: BlockInstance[]; // Home page blocks (legacy/one-pager)
  pages: PageConfig[];    // Multi-page configuration
  seo: SEOConfig;
}
