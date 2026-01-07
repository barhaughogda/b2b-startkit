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

export interface TemplateMetadata {
  name: string;
  description: string;
  thumbnail: string;
  defaultBlocks: BlockType[];
  recommendedBlocks: BlockType[];
}

// =============================================================================
// HEADER & FOOTER VARIANTS
// =============================================================================

export const HeaderVariants = ['sticky-simple', 'centered', 'info-bar'] as const;
export type HeaderVariant = (typeof HeaderVariants)[number];

export const FooterVariants = ['multi-column', 'minimal'] as const;
export type FooterVariant = (typeof FooterVariants)[number];

export interface ExternalLink {
  id: string;
  label: string;
  url: string;
  openInNewTab?: boolean;
}

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
export const HEADER_VARIANTS = HeaderVariants;
export const FOOTER_VARIANTS = FooterVariants;
export const SITE_STRUCTURES = SiteStructures;
export const TEMPLATE_IDS = TemplateIds;

export const FONT_PAIRS: Record<string, { name: string; heading: string; body: string }> = {
  'inter-system': { name: 'Modern Sans', heading: 'Inter', body: 'System Sans' },
  'poppins-inter': { name: 'Geometric', heading: 'Poppins', body: 'Inter' },
  'playfair-lato': { name: 'Classic Serif', heading: 'Playfair Display', body: 'Lato' },
  'montserrat-opensans': { name: 'Professional', heading: 'Montserrat', body: 'Open Sans' },
  'raleway-roboto': { name: 'Elegant Sans', heading: 'Raleway', body: 'Roboto' },
};

export const MAX_CUSTOM_PAGES = 5;

/**
 * Metadata for standard page types
 */
export const PAGE_METADATA: Record<PageType, { name: string; description: string; icon: string; canDisable?: boolean; canDelete?: boolean }> = {
  home: { name: 'Home', description: 'Main landing page', icon: 'Home', canDisable: false, canDelete: false },
  services: { name: 'Services', description: 'List of services offered', icon: 'Briefcase', canDisable: true, canDelete: false },
  team: { name: 'Our Team', description: 'Meet the providers', icon: 'Users', canDisable: true, canDelete: false },
  locations: { name: 'Locations', description: 'Clinic locations and maps', icon: 'MapPin', canDisable: true, canDelete: false },
  contact: { name: 'Contact', description: 'Contact information and hours', icon: 'Mail', canDisable: true, canDelete: false },
  terms: { name: 'Terms of Service', description: 'Legal terms and conditions', icon: 'FileText', canDisable: true, canDelete: false },
  privacy: { name: 'Privacy Policy', description: 'Data protection and privacy', icon: 'ShieldCheck', canDisable: true, canDelete: false },
  custom: { name: 'Custom Page', description: 'Flexible custom content page', icon: 'FilePlus', canDisable: true, canDelete: true },
};

/**
 * Checks if more custom pages can be added
 */
export function canAddCustomPage(pages: PageConfig[]): boolean {
  const customPages = pages.filter(p => p.type === 'custom');
  return customPages.length < 5; // Limit to 5 custom pages
}

/**
 * Gets pages that should appear in header navigation
 */
export function getHeaderNavPages(pages: PageConfig[]): PageConfig[] {
  return pages
    .filter((p) => p.enabled && p.showInHeader)
    .sort((a, b) => a.order - b.order);
}

/**
 * Gets pages that should appear in footer navigation
 */
export function getFooterNavPages(pages: PageConfig[]): PageConfig[] {
  return pages
    .filter((p) => p.enabled && p.showInFooter)
    .sort((a, b) => a.order - b.order);
}

/**
 * Generates navigation items from pages configuration
 */
export function generateNavItemsFromPages(
  pages: PageConfig[],
  includeHidden: boolean = false,
  siteStructure: SiteStructure = 'multi-page'
): NavItem[] {
  const navPages = pages
    .filter(p => (p.enabled && p.showInHeader) || includeHidden)
    .sort((a, b) => a.order - b.order);

  return navPages.map(page => ({
    id: page.id,
    label: page.title,
    href: siteStructure === 'one-pager' 
      ? (page.type === 'home' ? '#' : `#${page.slug || page.type}`)
      : (page.type === 'home' ? '/' : `/${page.slug || page.type}`),
    pageId: page.id,
  }));
}

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
  primaryButtonAppearance?: ButtonAppearance;
  secondaryButtonAppearance?: ButtonAppearance;
  headingTextAppearance?: {
    textToken?: TextToken;
    textCustom?: string;
  };
  taglineTextAppearance?: {
    textToken?: TextToken;
    textCustom?: string;
  };
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

export type HowItWorksLayout = 'numbered-circles' | 'timeline' | 'cards' | 'minimal';
export type HowItWorksIconShape = 'circle' | 'rounded-square' | 'square';
export type HowItWorksIcon =
  | 'calendar' | 'clock' | 'calendar-check' | 'timer'
  | 'map-pin' | 'building-2' | 'home' | 'navigation'
  | 'heart' | 'stethoscope' | 'pill' | 'thermometer' | 'activity' | 'heart-pulse'
  | 'phone' | 'mail' | 'message-circle' | 'video'
  | 'check-circle' | 'star' | 'shield' | 'users' | 'file-text' | 'award';

export interface HowItWorksBlockProps {
  title: string;
  subtitle?: string;
  layout: HowItWorksLayout;
  iconShape: HowItWorksIconShape;
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

export type TestimonialsLayout = 'hero-card' | 'carousel-cards' | 'grid-cards' | 'stacked-list' | 'centered-quote';

export interface TestimonialsBlockProps {
  title: string;
  subtitle?: string;
  testimonials: TestimonialItem[];
  layout: TestimonialsLayout;
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
  primaryButtonAppearance?: ButtonAppearance;
  secondaryButtonAppearance?: ButtonAppearance;
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
  galleryImages: { id: string; url: string; alt?: string }[];
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
  logoUrl?: string;
  logoAlt?: string;
  navItems: NavItem[];
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
  backgroundColor?: string;
  textColor?: string;
  mobileBackgroundColor?: string;
  mobileTextColor?: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  headerMobileBackgroundColor?: string;
  headerMobileTextColor?: string;
  useThemeColors?: boolean;
  // Legacy/Compatibility fields
  showBookingButton?: boolean;
  bookingButtonText?: string;
  showLoginButton?: boolean;
  isSticky?: boolean;
  transparentOnHero?: boolean;
}

export interface FooterColumn {
  id: string;
  title: string;
  links: NavItem[];
}

export interface FooterMenuPageItem {
  id: string;
  kind: 'page';
  pageId: string;
}

export interface FooterMenuExternalItem {
  id: string;
  kind: 'external';
  label: string;
  url: string;
  openInNewTab?: boolean;
}

export type FooterMenuItem = FooterMenuPageItem | FooterMenuExternalItem;

export interface FooterMenuSection {
  id: string;
  title: string;
  items: FooterMenuItem[];
}

export interface FooterMenuColumn {
  id: string;
  layoutOrder: number;
  sections: FooterMenuSection[];
}

export interface FooterConfig {
  variant: FooterVariant;
  columns: FooterColumn[];
  menuColumns?: FooterMenuColumn[];
  showLogo: boolean;
  tagline?: string;
  showSocial: boolean;
  socialLinks: SocialLink[];
  externalLinks?: ExternalLink[];
  showNewsletter: boolean;
  newsletterTitle?: string;
  legalLinks: { id: string; label: string; href: string }[];
  copyrightText?: string;
  poweredByZenthea: boolean;
  backgroundColor?: string;
  textColor?: string;
  footerBackgroundColor?: string;
  footerTextColor?: string;
  useThemeColors?: boolean;
  // Legacy/Compatibility fields
  newsletterHeadline?: string;
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
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  canonicalUrl?: string;
  noIndex?: boolean;
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
