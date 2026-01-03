import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { QueryCtx, MutationCtx } from './_generated/server'
import { verifyClinicUserAccess } from './utils/authorization'
import { api } from './_generated/api'
import { Id } from './_generated/dataModel'

/**
 * Website Builder - Queries and Mutations
 *
 * Handles website builder configuration including:
 * - Get/Update website definition
 * - Template, header, footer configuration
 * - Block management
 * - Theme and SEO settings
 */

// =============================================================================
// ERROR MESSAGES
// =============================================================================

const ERROR_MESSAGES = {
  UNAUTHORIZED:
    "You don't have permission to modify website settings. Please check your access permissions.",
  TENANT_NOT_FOUND:
    'Organization not found. Please check your access permissions or contact support if this issue persists.',
  BUILDER_NOT_INITIALIZED:
    'Website builder has not been initialized. Please initialize the website builder first.',
  PAGE_NOT_FOUND: 'Page not found. Please check the page ID and try again.',
  MAX_CUSTOM_PAGES: 'Maximum of 2 custom pages allowed.',
  DUPLICATE_SLUG:
    'A page with this slug already exists. Please choose a different slug.',
  INVALID_SLUG:
    'Invalid page slug. Slugs can only contain lowercase letters, numbers, and hyphens.',
  RESERVED_SLUG:
    'This slug is reserved and cannot be used. Please choose a different slug.',
} as const

// Constants
const CUSTOM_PAGE_DEFAULT_ORDER = 50
const MAX_CUSTOM_PAGES = 2
const RESERVED_SLUGS = [
  'admin',
  'api',
  'app',
  'dashboard',
  'login',
  'logout',
  'settings',
  'account',
  'profile',
  'help',
  'support',
  'contact',
  'about',
  'home',
  'index',
  'www',
  'mail',
  'email',
  'ftp',
  'localhost',
  'test',
  'dev',
  'staging',
  'production',
  'blog',
  'news',
  'docs',
  'documentation',
]

// Slug validation regex: lowercase letters, numbers, and hyphens only
const SLUG_REGEX = /^[a-z0-9-]+$/

// =============================================================================
// VALIDATORS
// =============================================================================

// Site structure validator - determines navigation behavior
const siteStructureValidator = v.union(
  v.literal('one-pager'),
  v.literal('multi-page')
)

// Template ID validator (deprecated - kept for backwards compatibility)
const templateIdValidator = v.union(
  v.literal('classic-stacked'),
  v.literal('bento-grid'),
  v.literal('split-hero'),
  v.literal('multi-location'),
  v.literal('team-forward')
)

const headerVariantValidator = v.union(
  v.literal('sticky-simple'),
  v.literal('centered'),
  v.literal('info-bar')
)

const footerVariantValidator = v.union(
  v.literal('multi-column'),
  v.literal('minimal')
)

const blockTypeValidator = v.union(
  v.literal('hero'),
  v.literal('care-team'),
  v.literal('clinics'),
  v.literal('services'),
  v.literal('trust-bar'),
  v.literal('how-it-works'),
  v.literal('testimonials'),
  v.literal('faq'),
  v.literal('contact'),
  v.literal('cta-band'),
  v.literal('custom-text'),
  v.literal('photo-text'),
  v.literal('media')
)

const navItemValidator = v.object({
  id: v.string(),
  label: v.string(),
  href: v.string(),
  isExternal: v.optional(v.boolean()),
  pageId: v.optional(v.string()), // Link to internal page for multi-page sites
})

const socialPlatformValidator = v.union(
  v.literal('facebook'),
  v.literal('twitter'),
  v.literal('instagram'),
  v.literal('linkedin'),
  v.literal('youtube'),
  v.literal('tiktok')
)

const socialLinkValidator = v.object({
  id: v.string(),
  platform: socialPlatformValidator,
  url: v.string(),
  enabled: v.optional(v.boolean()),
})

const legalLinkValidator = v.object({
  id: v.string(),
  label: v.string(),
  href: v.string(),
})

const footerColumnValidator = v.object({
  id: v.string(),
  title: v.string(),
  links: v.array(navItemValidator),
})

const externalLinkValidator = v.object({
  id: v.string(),
  label: v.string(),
  url: v.string(),
  openInNewTab: v.optional(v.boolean()),
})

// Footer menu item validators (v2 menuColumns)
const footerMenuPageItemValidator = v.object({
  id: v.string(),
  kind: v.literal('page'),
  pageId: v.string(),
})

const footerMenuExternalItemValidator = v.object({
  id: v.string(),
  kind: v.literal('external'),
  label: v.string(),
  url: v.string(),
  openInNewTab: v.optional(v.boolean()),
})

const footerMenuItemValidator = v.union(
  footerMenuPageItemValidator,
  footerMenuExternalItemValidator
)

const footerMenuSectionValidator = v.object({
  id: v.string(),
  title: v.string(),
  items: v.array(footerMenuItemValidator),
})

const footerMenuColumnValidator = v.object({
  id: v.string(),
  layoutOrder: v.number(),
  sections: v.array(footerMenuSectionValidator),
})

// Page type validator
const pageTypeValidator = v.union(
  v.literal('home'),
  v.literal('services'),
  v.literal('team'),
  v.literal('locations'),
  v.literal('contact'),
  v.literal('custom'),
  v.literal('terms'),
  v.literal('privacy')
)

// Background design system values
const backgroundTokenValidator = v.union(
  v.literal('default'),
  v.literal('primary'),
  v.literal('secondary'),
  v.literal('surface'),
  v.literal('accent'),
  v.literal('accent-light'),
  v.literal('transparent')
)

// Text color design system values
const textTokenValidator = v.union(
  v.literal('default'),
  v.literal('primary'),
  v.literal('secondary'),
  v.literal('tertiary'),
  v.literal('on-accent'),
  v.literal('accent')
)

// Block appearance configuration
const blockAppearanceValidator = v.object({
  backgroundColor: v.optional(v.string()),
  backgroundToken: backgroundTokenValidator,
  backgroundCustom: v.optional(v.string()),
  textColor: v.optional(v.string()),
  textToken: textTokenValidator,
  textCustom: v.optional(v.string()),
  paddingTop: v.optional(
    v.union(
      v.literal('none'),
      v.literal('small'),
      v.literal('medium'),
      v.literal('large')
    )
  ),
  paddingBottom: v.optional(
    v.union(
      v.literal('none'),
      v.literal('small'),
      v.literal('medium'),
      v.literal('large')
    )
  ),
  maxWidth: v.optional(
    v.union(
      v.literal('narrow'),
      v.literal('normal'),
      v.literal('wide'),
      v.literal('full')
    )
  ),
  borderTop: v.optional(v.boolean()),
  borderBottom: v.optional(v.boolean()),
})

// Page configuration validator
const pageConfigValidator = v.object({
  id: v.string(),
  type: pageTypeValidator,
  title: v.string(),
  slug: v.string(),
  enabled: v.boolean(),
  showInHeader: v.boolean(),
  showInFooter: v.boolean(),
  blocks: v.array(
    v.object({
      id: v.string(),
      type: blockTypeValidator,
      props: v.any(),
      enabled: v.boolean(),
      appearance: v.optional(blockAppearanceValidator),
    })
  ),
  order: v.number(),
  useDefaultContent: v.optional(v.boolean()),
})

const headerConfigValidator = v.object({
  variant: headerVariantValidator,
  logoUrl: v.optional(v.string()),
  logoAlt: v.optional(v.string()),
  navItems: v.array(navItemValidator),
  showSignIn: v.boolean(),
  signInText: v.string(),
  signInUrl: v.string(),
  showBook: v.boolean(),
  bookText: v.string(),
  bookUrl: v.string(),
  infoBarPhone: v.optional(v.string()),
  infoBarHours: v.optional(v.string()),
  infoBarText: v.optional(v.string()),
  sticky: v.boolean(),
  transparent: v.boolean(),
  // Navigation color customization
  backgroundColor: v.optional(v.string()), // Primary name for frontend
  textColor: v.optional(v.string()),
  mobileBackgroundColor: v.optional(v.string()),
  mobileTextColor: v.optional(v.string()),
  headerBackgroundColor: v.optional(v.string()), // Legacy/Secondary names
  headerTextColor: v.optional(v.string()),
  headerMobileBackgroundColor: v.optional(v.string()),
  headerMobileTextColor: v.optional(v.string()),
  useThemeColors: v.optional(v.boolean()), // Toggle to use global theme colors instead of custom
})

const footerConfigValidator = v.object({
  variant: footerVariantValidator,
  columns: v.array(footerColumnValidator),
  menuColumns: v.optional(v.array(footerMenuColumnValidator)),
  showLogo: v.boolean(),
  tagline: v.optional(v.string()),
  showSocial: v.boolean(),
  socialLinks: v.array(socialLinkValidator),
  externalLinks: v.optional(v.array(externalLinkValidator)),
  showNewsletter: v.boolean(),
  newsletterTitle: v.optional(v.string()),
  legalLinks: v.array(legalLinkValidator),
  copyrightText: v.optional(v.string()),
  poweredByZenthea: v.boolean(),
  // Navigation color customization
  backgroundColor: v.optional(v.string()), // Primary name for frontend
  textColor: v.optional(v.string()),
  footerBackgroundColor: v.optional(v.string()), // Legacy/Secondary names
  footerTextColor: v.optional(v.string()),
  useThemeColors: v.optional(v.boolean()), // Toggle to use global theme colors instead of custom
})

const themeConfigValidator = v.object({
  primaryColor: v.string(),
  secondaryColor: v.string(),
  accentColor: v.string(),
  backgroundColor: v.string(),
  textColor: v.string(),
  fontPair: v.string(),
  headingSize: v.union(
    v.literal('small'),
    v.literal('medium'),
    v.literal('large')
  ),
  sectionSpacing: v.union(
    v.literal('compact'),
    v.literal('normal'),
    v.literal('spacious')
  ),
  cornerRadius: v.union(
    v.literal('none'),
    v.literal('small'),
    v.literal('medium'),
    v.literal('large'),
    v.literal('full')
  ),
  buttonStyle: v.union(
    v.literal('solid'),
    v.literal('outline'),
    v.literal('ghost')
  ),
  colorMode: v.union(v.literal('light'), v.literal('dark'), v.literal('auto')),
  customCss: v.optional(v.string()),
})

const blockValidator = v.object({
  id: v.string(),
  type: blockTypeValidator,
  props: v.any(),
  enabled: v.boolean(),
  appearance: v.optional(blockAppearanceValidator),
})

const seoConfigValidator = v.object({
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  keywords: v.optional(v.array(v.string())),
  ogImage: v.optional(v.string()),
  ogTitle: v.optional(v.string()),
  ogDescription: v.optional(v.string()),
  twitterCard: v.optional(
    v.union(v.literal('summary'), v.literal('summary_large_image'))
  ),
  canonicalUrl: v.optional(v.string()),
  noIndex: v.optional(v.boolean()),
})

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get or create a tenant record in development
 */
async function getOrCreateTenant(ctx: MutationCtx, tenantId: string) {
  let tenant = await ctx.db
    .query('tenants')
    .withIndex('by_tenant_id', (q) => q.eq('id', tenantId))
    .first()

  if (!tenant) {
    // Auto-provision tenant record in development if it's missing
    const now = Date.now();
    await ctx.db.insert("tenants", {
      id: tenantId,
      name: "New Clinic",
      slug: tenantId.split('_')[1] || "new-clinic",
      type: "clinic",
      status: "active",
      subscription: {
        plan: "basic",
        status: "active",
        startDate: new Date(now).toISOString(),
        maxUsers: 10,
        maxPatients: 1000,
      },
      branding: {
        primaryColor: "#008080",
        secondaryColor: "#5F284A",
      },
      contactInfo: {
        phone: "555-0100",
        email: "contact@example.com",
        address: {
          street: "123 Medical Way",
          city: "Health City",
          state: "CA",
          zipCode: "90210",
          country: "USA",
        },
      },
      features: {
        onlineScheduling: true,
        telehealth: true,
        prescriptionRefills: true,
        labResults: true,
        messaging: true,
        billing: true,
        patientPortal: true,
        mobileApp: true,
      },
      settings: {
        timezone: "UTC",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12h",
        currency: "USD",
        language: "en",
        appointmentDuration: 30,
        reminderSettings: {
          email: true,
          sms: true,
          phone: false,
          advanceNoticeHours: 24,
        },
      },
      createdAt: now,
      updatedAt: now,
    });
    
    // Re-fetch the newly created tenant
    tenant = await ctx.db
      .query('tenants')
      .withIndex('by_tenant_id', (q) => q.eq('id', tenantId))
      .first();
    
    if (!tenant) {
      throw new Error(ERROR_MESSAGES.TENANT_NOT_FOUND);
    }
  }
  return tenant;
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get website builder configuration for a tenant
 */
export const getWebsiteBuilder = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query('tenants')
      .withIndex('by_tenant_id', (q) => q.eq('id', args.tenantId))
      .first()

    if (!tenant) {
      return null
    }

    return {
      tenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      branding: tenant.branding,
      contactInfo: tenant.contactInfo,
      features: tenant.features,
      websiteBuilder: tenant.websiteBuilder || null,
      bookingSettings: tenant.bookingSettings,
    }
  },
})

/**
 * Check if tenant has website builder configured
 */
export const hasWebsiteBuilder = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query('tenants')
      .withIndex('by_tenant_id', (q) => q.eq('id', args.tenantId))
      .first()

    if (!tenant) {
      return { exists: false, configured: false }
    }

    return {
      exists: true,
      configured: !!tenant.websiteBuilder,
    }
  },
})

/**
 * Get published website configuration by tenant slug
 */
export const getPublishedWebsiteBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query('tenants')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first()

    if (!tenant || !tenant.websiteBuilder?.publishedAt) {
      return null
    }

    return {
      websiteBuilder: tenant.websiteBuilder,
      tenantName: tenant.name,
      tenantId: tenant.id,
      logoUrl: tenant.branding.logo,
      contactInfo: tenant.contactInfo,
      bookingSettings: tenant.bookingSettings,
    }
  },
})

// =============================================================================
// AUDIT LOGGING HELPER
// =============================================================================

/**
 * Helper function to log audit events for website builder changes
 */
async function logWebsiteBuilderAudit(
  ctx: MutationCtx,
  tenantId: string,
  userId: Id<'users'> | undefined,
  action: string,
  details?: Record<string, unknown>
) {
  try {
    await ctx.runMutation(api.auditLogs.create, {
      tenantId,
      userId,
      action,
      resource: 'website_builder',
      resourceId: tenantId,
      details: {
        ...details,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    })
  } catch (error) {
    // Non-blocking: audit logging failures shouldn't break the operation
    console.error('Failed to log website builder audit event:', error)
  }
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Initialize website builder for a tenant with defaults
 *
 * @param siteStructure - The site structure type:
 *   - 'one-pager': Single scrollable page with anchor navigation
 *   - 'multi-page': Separate pages with real URL routing (default)
 */
export const initializeWebsiteBuilder = mutation({
  args: {
    tenantId: v.string(),
    userEmail: v.string(),
    siteStructure: v.optional(siteStructureValidator),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);
    return await initializeHandler(ctx, args, tenant, authResult.userId);
  },
})

/**
 * Shared handler for website builder initialization logic
 */
async function initializeHandler(ctx: MutationCtx, args: any, tenant: any, userId?: Id<'users'>) {
    // Default to multi-page if not specified
    const siteStructure = args.siteStructure || 'multi-page'

    // Generate nav items based on site structure
    const navItems =
      siteStructure === 'one-pager'
        ? [
            { id: 'services', label: 'Services', href: '#services' },
            { id: 'team', label: 'Our Team', href: '#team' },
            { id: 'locations', label: 'Locations', href: '#locations' },
            { id: 'contact', label: 'Contact', href: '#contact' },
          ]
        : [
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
            {
              id: 'contact',
              label: 'Contact',
              href: '/contact',
              pageId: 'contact',
            },
          ]

    // Create default website builder config using tenant branding
    const defaultWebsiteBuilder = {
      version: '1.0.0',
      siteStructure,
      templateId: 'classic-stacked' as const, // Deprecated but kept for backwards compat
      header: {
        variant: 'sticky-simple' as const,
        logoUrl: tenant.branding.logo || undefined,
        logoAlt: tenant.name,
        navItems,
        showSignIn: true,
        signInText: 'Sign In',
        signInUrl: '/login',
        showBook: true,
        bookText: 'Book Appointment',
        bookUrl: '/book',
        sticky: true,
        transparent: false,
      },
      footer: {
        variant: 'multi-column' as const,
        columns: [
          {
            id: 'services',
            title: 'Services',
            links: [
              { id: 'primary-care', label: 'Primary Care', href: '#services' },
              { id: 'urgent-care', label: 'Urgent Care', href: '#services' },
            ],
          },
          {
            id: 'company',
            title: 'Company',
            links: [
              { id: 'about', label: 'About Us', href: '#about' },
              { id: 'team', label: 'Our Team', href: '#team' },
            ],
          },
          {
            id: 'support',
            title: 'Support',
            links: [
              { id: 'contact', label: 'Contact Us', href: '#contact' },
              { id: 'patient-portal', label: 'Patient Portal', href: '/login' },
            ],
          },
        ],
        showLogo: true,
        tagline: tenant.tagline || undefined,
        showSocial: false,
        socialLinks: [],
        showNewsletter: false,
        legalLinks: [
          { id: 'privacy', label: 'Privacy Policy', href: '/privacy' },
          { id: 'terms', label: 'Terms of Service', href: '/terms' },
        ],
        poweredByZenthea: true,
      },
      theme: {
        primaryColor: tenant.branding.primaryColor,
        secondaryColor: tenant.branding.secondaryColor,
        accentColor: tenant.branding.accentColor || '#E8927C',
        backgroundColor: '#ffffff',
        textColor: '#1a1a1a',
        fontPair: 'inter-system',
        headingSize: 'medium' as const,
        sectionSpacing: 'normal' as const,
        cornerRadius: 'medium' as const,
        buttonStyle: 'solid' as const,
        colorMode: 'light' as const,
      },
      blocks: [
        {
          id: 'hero-1',
          type: 'hero' as const,
          enabled: true,
          props: {
            headline: `Welcome to ${tenant.name}`,
            tagline:
              tenant.tagline || 'Quality healthcare for you and your family',
            primaryCtaText: 'Book Appointment',
            secondaryCtaText: 'Learn More',
            alignment: 'center',
          },
        },
        {
          id: 'services-1',
          type: 'services' as const,
          enabled: true,
          props: {
            title: 'Our Services',
            showDuration: true,
            showDescription: true,
            layout: 'grid',
          },
        },
        {
          id: 'care-team-1',
          type: 'care-team' as const,
          enabled: true,
          props: {
            title: 'Meet Our Care Team',
            maxProviders: 4,
            showSpecialties: true,
            showCredentials: true,
            showBookButton: true,
            layout: 'grid',
          },
        },
        {
          id: 'clinics-1',
          type: 'clinics' as const,
          enabled: true,
          props: {
            title: 'Our Locations',
            showMap: true,
            showHours: true,
            showPhone: true,
            layout: 'grid',
          },
        },
        {
          id: 'contact-1',
          type: 'contact' as const,
          enabled: true,
          props: {
            title: 'Contact Us',
            showPhone: true,
            showEmail: true,
            showAddress: true,
            showHours: true,
            layout: 'card-grid',
          },
        },
        {
          id: 'cta-band-1',
          type: 'cta-band' as const,
          enabled: true,
          props: {
            headline: 'Ready to Get Started?',
            subheadline: 'Book your appointment today',
            primaryCtaText: 'Book Now',
            backgroundColor: 'primary',
          },
        },
      ],
      seo: {
        title: tenant.name,
        description: tenant.description || tenant.tagline,
      },
      // Only include pages for multi-page structure
      pages:
        siteStructure === 'multi-page'
          ? [
              {
                id: 'home',
                type: 'home' as const,
                title: 'Home',
                slug: '',
                enabled: true,
                showInHeader: false,
                showInFooter: false,
                blocks: [], // Home page uses the main blocks array
                order: 0,
              },
              {
                id: 'services',
                type: 'services' as const,
                title: 'Services',
                slug: 'services',
                enabled: true,
                showInHeader: true,
                showInFooter: true,
                blocks: [
                  {
                    id: 'services-page-hero',
                    type: 'hero' as const,
                    enabled: true,
                    props: {
                      headline: 'Our Services',
                      tagline:
                        'Comprehensive healthcare services for you and your family',
                      alignment: 'center',
                    },
                  },
                  {
                    id: 'services-page-services',
                    type: 'services' as const,
                    enabled: true,
                    props: {
                      title: 'What We Offer',
                      showDuration: true,
                      showDescription: true,
                      layout: 'grid',
                    },
                  },
                ],
                order: 10,
              },
              {
                id: 'team',
                type: 'team' as const,
                title: 'Our Team',
                slug: 'team',
                enabled: true,
                showInHeader: true,
                showInFooter: true,
                blocks: [
                  {
                    id: 'team-page-hero',
                    type: 'hero' as const,
                    enabled: true,
                    props: {
                      headline: 'Meet Our Team',
                      tagline:
                        'Dedicated healthcare professionals here to help you',
                      alignment: 'center',
                    },
                  },
                  {
                    id: 'team-page-care-team',
                    type: 'care-team' as const,
                    enabled: true,
                    props: {
                      title: 'Our Care Team',
                      maxProviders: 12,
                      showSpecialties: true,
                      showCredentials: true,
                      showBookButton: true,
                      layout: 'grid',
                    },
                  },
                ],
                order: 20,
              },
              {
                id: 'locations',
                type: 'locations' as const,
                title: 'Locations',
                slug: 'locations',
                enabled: true,
                showInHeader: true,
                showInFooter: true,
                blocks: [
                  {
                    id: 'locations-page-hero',
                    type: 'hero' as const,
                    enabled: true,
                    props: {
                      headline: 'Our Locations',
                      tagline: 'Find a clinic near you',
                      alignment: 'center',
                    },
                  },
                  {
                    id: 'locations-page-clinics',
                    type: 'clinics' as const,
                    enabled: true,
                    props: {
                      title: 'Clinic Locations',
                      showMap: true,
                      showHours: true,
                      showPhone: true,
                      layout: 'grid',
                    },
                  },
                ],
                order: 30,
              },
              {
                id: 'contact',
                type: 'contact' as const,
                title: 'Contact',
                slug: 'contact',
                enabled: true,
                showInHeader: true,
                showInFooter: true,
                blocks: [
                  {
                    id: 'contact-page-hero',
                    type: 'hero' as const,
                    enabled: true,
                    props: {
                      headline: 'Contact Us',
                      tagline: "We're here to help",
                      alignment: 'center',
                    },
                  },
                  {
                    id: 'contact-page-contact',
                    type: 'contact' as const,
                    enabled: true,
                    props: {
                      title: 'Get in Touch',
                      showPhone: true,
                      showEmail: true,
                      showAddress: true,
                      showHours: true,
                      layout: 'card-grid',
                    },
                  },
                ],
                order: 40,
              },
              {
                id: 'terms',
                type: 'terms' as const,
                title: 'Terms of Service',
                slug: 'terms',
                enabled: true,
                showInHeader: false,
                showInFooter: true,
                blocks: [],
                order: 100,
                useDefaultContent: true,
              },
              {
                id: 'privacy',
                type: 'privacy' as const,
                title: 'Privacy Policy',
                slug: 'privacy',
                enabled: true,
                showInHeader: false,
                showInFooter: true,
                blocks: [],
                order: 101,
                useDefaultContent: true,
              },
            ]
          : undefined,
      lastEditedAt: Date.now(),
    }

    await ctx.db.patch(tenant._id, {
      websiteBuilder: defaultWebsiteBuilder,
      updatedAt: Date.now(),
    })

    // Log audit event
    await logWebsiteBuilderAudit(
      ctx,
      args.tenantId,
      userId,
      'website_builder_initialized',
      {
        siteStructure: defaultWebsiteBuilder.siteStructure,
        templateId: defaultWebsiteBuilder.templateId,
        version: defaultWebsiteBuilder.version,
      }
    )

    return { success: true, websiteBuilder: defaultWebsiteBuilder }
}

/**
 * Update site structure (one-pager vs multi-page)
 */
export const updateSiteStructure = mutation({
  args: {
    tenantId: v.string(),
    siteStructure: siteStructureValidator,
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      // If website builder not initialized yet, initialize it with the requested structure
      return await initializeHandler(ctx, args, tenant, authResult.userId);
    }

    const previousStructure =
      tenant.websiteBuilder.siteStructure || 'multi-page'

    /**
     * Convert URL to anchor link for one-pager structure
     */
    function convertToAnchor(href: string): string {
      // Skip external URLs
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return href
      }

      // Handle root path
      if (href === '/' || href === '') {
        return '#hero'
      }

      // Skip booking and login URLs
      if (href.startsWith('/book') || href.startsWith('/login')) {
        return href
      }

      // Extract slug from path (remove leading slash, query params, hash)
      const slug = href.replace(/^\//, '').split('?')[0].split('#')[0]
      return `#${slug || 'hero'}`
    }

    /**
     * Convert anchor link to page URL for multi-page structure
     */
    function convertToPageUrl(href: string): { href: string; pageId?: string } {
      // Skip external URLs
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return { href }
      }

      // Handle root anchor
      if (href === '#' || href === '#hero') {
        return { href: '/', pageId: 'home' }
      }

      // Skip booking and login URLs
      if (href.startsWith('/book') || href.startsWith('/login')) {
        return { href }
      }

      // Extract slug from anchor (remove leading #, query params)
      if (href.startsWith('#')) {
        const slug = href.substring(1).split('?')[0].split('#')[0]
        return {
          href: `/${slug || ''}`,
          pageId: slug === 'hero' || slug === '' ? 'home' : slug,
        }
      }

      // Already a page URL
      const slug = href.replace(/^\//, '').split('?')[0].split('#')[0]
      return {
        href: `/${slug || ''}`,
        pageId: slug === '' ? 'home' : slug,
      }
    }

    // Update nav items based on new structure
    const currentNavItems = tenant.websiteBuilder.header?.navItems || []
    const updatedNavItems = currentNavItems.map((item) => {
      if (args.siteStructure === 'one-pager') {
        // Convert page URLs to anchors
        const anchorHref = convertToAnchor(item.href)
        return { ...item, href: anchorHref, pageId: undefined }
      } else {
        // Convert anchors to page URLs
        const { href: pageHref, pageId } = convertToPageUrl(item.href)
        return { ...item, href: pageHref, pageId }
      }
    })

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        siteStructure: args.siteStructure,
        header: {
          ...tenant.websiteBuilder.header,
          navItems: updatedNavItems,
        },
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    // Log audit event
    await logWebsiteBuilderAudit(
      ctx,
      args.tenantId,
      authResult.userId,
      'website_builder_structure_updated',
      {
        previousStructure,
        newStructure: args.siteStructure,
      }
    )

    return { success: true }
  },
})

/**
 * Update template selection
 * @deprecated Use updateSiteStructure instead
 */
export const updateTemplate = mutation({
  args: {
    tenantId: v.string(),
    templateId: templateIdValidator,
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    const previousTemplateId = tenant.websiteBuilder.templateId

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        templateId: args.templateId,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    // Log audit event
    await logWebsiteBuilderAudit(
      ctx,
      args.tenantId,
      authResult.userId,
      'website_builder_template_updated',
      {
        previousTemplateId,
        newTemplateId: args.templateId,
      }
    )

    return { success: true }
  },
})

/**
 * Update header configuration
 */
export const updateHeader = mutation({
  args: {
    tenantId: v.string(),
    header: headerConfigValidator,
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        header: args.header,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    // Log audit event
    await logWebsiteBuilderAudit(
      ctx,
      args.tenantId,
      authResult.userId,
      'website_builder_header_updated',
      {
        headerVariant: args.header.variant,
      }
    )

    return { success: true }
  },
})

/**
 * Update footer configuration
 */
export const updateFooter = mutation({
  args: {
    tenantId: v.string(),
    footer: footerConfigValidator,
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        footer: args.footer,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    // Log audit event
    await logWebsiteBuilderAudit(
      ctx,
      args.tenantId,
      authResult.userId,
      'website_builder_footer_updated',
      {
        footerVariant: args.footer.variant,
      }
    )

    return { success: true }
  },
})

/**
 * Update theme configuration
 */
export const updateTheme = mutation({
  args: {
    tenantId: v.string(),
    theme: themeConfigValidator,
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        theme: args.theme,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    // Log audit event
    await logWebsiteBuilderAudit(
      ctx,
      args.tenantId,
      authResult.userId,
      'website_builder_theme_updated',
      {
        colorMode: args.theme.colorMode,
        primaryColor: args.theme.primaryColor,
      }
    )

    return { success: true }
  },
})

/**
 * Update all blocks at once
 */
export const updateBlocks = mutation({
  args: {
    tenantId: v.string(),
    blocks: v.array(blockValidator),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        blocks: args.blocks,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    // Log audit event
    await logWebsiteBuilderAudit(
      ctx,
      args.tenantId,
      authResult.userId,
      'website_builder_blocks_updated',
      {
        blockCount: args.blocks.length,
        blockTypes: args.blocks.map((b) => b.type),
      }
    )

    return { success: true }
  },
})

/**
 * Add a new block
 */
export const addBlock = mutation({
  args: {
    tenantId: v.string(),
    block: blockValidator,
    position: v.optional(v.number()),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    const blocks = [...tenant.websiteBuilder.blocks]
    const position = args.position ?? blocks.length
    blocks.splice(position, 0, args.block)

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        blocks,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    return { success: true, blockId: args.block.id }
  },
})

/**
 * Update a single block
 */
export const updateBlock = mutation({
  args: {
    tenantId: v.string(),
    blockId: v.string(),
    updates: v.object({
      props: v.optional(v.any()),
      enabled: v.optional(v.boolean()),
    }),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    const blocks = tenant.websiteBuilder.blocks.map((block) => {
      if (block.id === args.blockId) {
        return {
          ...block,
          ...(args.updates.props !== undefined && {
            props: args.updates.props,
          }),
          ...(args.updates.enabled !== undefined && {
            enabled: args.updates.enabled,
          }),
        }
      }
      return block
    })

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        blocks,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Remove a block
 */
export const removeBlock = mutation({
  args: {
    tenantId: v.string(),
    blockId: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    const blocks = tenant.websiteBuilder.blocks.filter(
      (block) => block.id !== args.blockId
    )

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        blocks,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Reorder blocks
 */
export const reorderBlocks = mutation({
  args: {
    tenantId: v.string(),
    blockIds: v.array(v.string()),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    // Create a map of existing blocks
    const blockMap = new Map(
      tenant.websiteBuilder.blocks.map((block) => [block.id, block])
    )

    // Reorder blocks based on provided IDs
    const reorderedBlocks = args.blockIds
      .map((id) => blockMap.get(id))
      .filter(
        (block): block is NonNullable<typeof block> => block !== undefined
      )

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        blocks: reorderedBlocks,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Update SEO configuration
 */
export const updateSEO = mutation({
  args: {
    tenantId: v.string(),
    seo: seoConfigValidator,
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        seo: args.seo,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Publish website (mark as published)
 * Also creates a version snapshot for the published state
 */
export const publishWebsite = mutation({
  args: {
    tenantId: v.string(),
    createdBy: v.optional(v.string()),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    const publishedAt = Date.now()

    // TODO: Version history functionality requires websiteBuilderVersions table in schema
    // Version snapshot creation temporarily disabled until table is added
    // const latestVersion = await ctx.db
    //   .query('websiteBuilderVersions')
    //   .withIndex('by_tenant_created', (q) => q.eq('tenantId', args.tenantId))
    //   .order('desc')
    //   .first()
    // const newVersionNumber = (latestVersion?.versionNumber ?? 0) + 1
    // const version = `1.${newVersionNumber}.0`
    const version = '1.0.0'

    // Update the tenant with new published state
    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        version,
        publishedAt,
        lastEditedAt: publishedAt,
      },
      // Also enable the landing page
      landingPage: {
        ...tenant.landingPage,
        enabled: true,
      },
      updatedAt: publishedAt,
    })

    // Log audit event
    await logWebsiteBuilderAudit(
      ctx,
      args.tenantId,
      authResult.userId,
      'website_builder_published',
      {
        version,
        templateId: tenant.websiteBuilder.templateId,
      }
    )

    return {
      success: true,
      publishedAt,
      version,
    }
  },
})

/**
 * Unpublish website
 */
export const unpublishWebsite = mutation({
  args: {
    tenantId: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        publishedAt: undefined,
        lastEditedAt: Date.now(),
      },
      landingPage: {
        ...tenant.landingPage,
        enabled: false,
      },
      updatedAt: Date.now(),
    })

    // Log audit event
    await logWebsiteBuilderAudit(
      ctx,
      args.tenantId,
      authResult.userId,
      'website_builder_unpublished',
      {
        previousVersion: tenant.websiteBuilder.version,
      }
    )

    return { success: true }
  },
})

/**
 * Save entire website builder configuration at once
 */
export const saveWebsiteBuilder = mutation({
  args: {
    tenantId: v.string(),
    websiteBuilder: v.object({
      version: v.string(),
      siteStructure: v.optional(siteStructureValidator),
      templateId: templateIdValidator,
      header: headerConfigValidator,
      footer: footerConfigValidator,
      theme: themeConfigValidator,
      blocks: v.array(blockValidator),
      seo: seoConfigValidator,
      publishedAt: v.optional(v.number()),
      lastEditedAt: v.number(),
      lastEditedBy: v.optional(v.string()),
    }),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...args.websiteBuilder,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

// =============================================================================
// PAGE MANAGEMENT
// =============================================================================

/**
 * Update pages configuration
 */
export const updatePages = mutation({
  args: {
    tenantId: v.string(),
    pages: v.array(pageConfigValidator),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        pages: args.pages,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    // Log audit event
    await logWebsiteBuilderAudit(
      ctx,
      args.tenantId,
      authResult.userId,
      'website_builder_pages_updated',
      {
        pageCount: args.pages.length,
        pageTypes: args.pages.map((p) => p.type),
      }
    )

    return { success: true }
  },
})

/**
 * Update a single page configuration
 */
export const updatePage = mutation({
  args: {
    tenantId: v.string(),
    pageId: v.string(),
    updates: v.object({
      title: v.optional(v.string()),
      slug: v.optional(v.string()),
      enabled: v.optional(v.boolean()),
      showInHeader: v.optional(v.boolean()),
      showInFooter: v.optional(v.boolean()),
      blocks: v.optional(
        v.array(
          v.object({
            id: v.string(),
            type: blockTypeValidator,
            props: v.any(),
            enabled: v.boolean(),
          })
        )
      ),
      order: v.optional(v.number()),
      useDefaultContent: v.optional(v.boolean()),
    }),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    const pages = tenant.websiteBuilder.pages || []
    const pageIndex = pages.findIndex((p) => p.id === args.pageId)

    if (pageIndex === -1) {
      throw new Error(ERROR_MESSAGES.PAGE_NOT_FOUND)
    }

    // Validate slug if being updated
    if (args.updates.slug !== undefined) {
      if (!SLUG_REGEX.test(args.updates.slug)) {
        throw new Error(ERROR_MESSAGES.INVALID_SLUG)
      }
      if (RESERVED_SLUGS.includes(args.updates.slug.toLowerCase())) {
        throw new Error(ERROR_MESSAGES.RESERVED_SLUG)
      }
      // Check for duplicate slug (excluding current page)
      if (
        pages.some((p) => p.id !== args.pageId && p.slug === args.updates.slug)
      ) {
        throw new Error(ERROR_MESSAGES.DUPLICATE_SLUG)
      }
    }

    const updatedPages = [...pages]
    updatedPages[pageIndex] = {
      ...pages[pageIndex],
      ...args.updates,
    }

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        pages: updatedPages,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Add a new custom page
 */
export const addCustomPage = mutation({
  args: {
    tenantId: v.string(),
    title: v.string(),
    slug: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    const pages = tenant.websiteBuilder.pages || []

    // Validate slug format
    if (!SLUG_REGEX.test(args.slug)) {
      throw new Error(ERROR_MESSAGES.INVALID_SLUG)
    }

    // Check for reserved slugs
    if (RESERVED_SLUGS.includes(args.slug.toLowerCase())) {
      throw new Error(ERROR_MESSAGES.RESERVED_SLUG)
    }

    // Check custom page limit
    const customPageCount = pages.filter((p) => p.type === 'custom').length
    if (customPageCount >= MAX_CUSTOM_PAGES) {
      throw new Error(ERROR_MESSAGES.MAX_CUSTOM_PAGES)
    }

    // Check for duplicate slug
    if (pages.some((p) => p.slug === args.slug)) {
      throw new Error(ERROR_MESSAGES.DUPLICATE_SLUG)
    }

    const newPage = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom' as const,
      title: args.title,
      slug: args.slug,
      enabled: true,
      showInHeader: true,
      showInFooter: false,
      blocks: [
        {
          id: `custom-text-${Date.now()}`,
          type: 'custom-text' as const,
          enabled: true,
          props: {
            title: args.title,
            content: '',
            alignment: 'left',
            showTitle: true,
            backgroundColor: 'default',
            maxWidth: 'normal',
          },
        },
      ],
      order: CUSTOM_PAGE_DEFAULT_ORDER,
    }

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        pages: [...pages, newPage],
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    // Log audit event
    await logWebsiteBuilderAudit(
      ctx,
      args.tenantId,
      authResult.userId,
      'website_builder_page_added',
      {
        pageId: newPage.id,
        pageType: 'custom',
        pageTitle: args.title,
      }
    )

    return { success: true, pageId: newPage.id }
  },
})

/**
 * Delete a custom page
 */
export const deleteCustomPage = mutation({
  args: {
    tenantId: v.string(),
    pageId: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    const pages = tenant.websiteBuilder.pages || []
    const pageToDelete = pages.find((p) => p.id === args.pageId)

    if (!pageToDelete) {
      throw new Error(`Page ${args.pageId} not found`)
    }

    // Only custom pages can be deleted
    if (pageToDelete.type !== 'custom') {
      throw new Error('Only custom pages can be deleted')
    }

    const updatedPages = pages.filter((p) => p.id !== args.pageId)

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        pages: updatedPages,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    // Log audit event
    await logWebsiteBuilderAudit(
      ctx,
      args.tenantId,
      authResult.userId,
      'website_builder_page_deleted',
      {
        pageId: args.pageId,
        pageTitle: pageToDelete.title,
      }
    )

    return { success: true }
  },
})

/**
 * Reorder pages
 */
export const reorderPages = mutation({
  args: {
    tenantId: v.string(),
    pageIds: v.array(v.string()),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    const pages = tenant.websiteBuilder.pages || []
    const pageMap = new Map(pages.map((p) => [p.id, p]))

    // Reorder pages and update order values
    const reorderedPages = args.pageIds
      .map((id, index) => {
        const page = pageMap.get(id)
        if (page) {
          return { ...page, order: index }
        }
        return null
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        pages: reorderedPages,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Set active page for editing
 */
export const setActivePage = mutation({
  args: {
    tenantId: v.string(),
    pageId: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        activePageId: args.pageId,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Update social links configuration
 */
export const updateSocialLinks = mutation({
  args: {
    tenantId: v.string(),
    socialLinks: v.array(socialLinkValidator),
    showSocial: v.boolean(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        footer: {
          ...tenant.websiteBuilder.footer,
          socialLinks: args.socialLinks,
          showSocial: args.showSocial,
        },
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Update external links in footer
 */
export const updateExternalLinks = mutation({
  args: {
    tenantId: v.string(),
    externalLinks: v.array(externalLinkValidator),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    if (!tenant.websiteBuilder) {
      throw new Error(ERROR_MESSAGES.BUILDER_NOT_INITIALIZED)
    }

    await ctx.db.patch(tenant._id, {
      websiteBuilder: {
        ...tenant.websiteBuilder,
        footer: {
          ...tenant.websiteBuilder.footer,
          externalLinks: args.externalLinks,
        },
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

// =============================================================================
// MIGRATION
// =============================================================================

/**
 * Migrate existing landingPage config to new websiteBuilder format
 * This preserves existing content while setting up the new builder structure
 */
export const migrateFromLandingPage = mutation({
  args: {
    tenantId: v.string(),
    preserveExisting: v.optional(v.boolean()), // If true, skip if websiteBuilder exists
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(
      ctx,
      args.userEmail,
      args.tenantId
    )
    if (!authResult.authorized) {
      throw new Error(authResult.error || ERROR_MESSAGES.UNAUTHORIZED)
    }

    const tenant = await getOrCreateTenant(ctx, args.tenantId);

    // If preserveExisting is true and websiteBuilder already exists, skip
    if (args.preserveExisting && tenant.websiteBuilder) {
      return {
        success: true,
        skipped: true,
        message: 'Website builder already configured',
      }
    }

    const landingPage = tenant.landingPage

    // Build blocks array based on existing landingPage settings
    type BlockType =
      | 'hero'
      | 'care-team'
      | 'clinics'
      | 'services'
      | 'trust-bar'
      | 'how-it-works'
      | 'testimonials'
      | 'faq'
      | 'contact'
      | 'cta-band'
      | 'custom-text'

    const blocks: Array<{
      id: string
      type: BlockType
      enabled: boolean
      props: Record<string, unknown>
    }> = []

    // Determine section order from landingPage or use default
    const sectionOrder = landingPage?.sectionOrder || [
      'hero',
      'services',
      'careTeam',
      'clinics',
      'testimonials',
      'contact',
      'cta',
    ]

    // Map sections to blocks based on order
    let blockIndex = 0
    for (const section of sectionOrder) {
      switch (section) {
        case 'hero':
          blocks.push({
            id: `hero-${++blockIndex}`,
            type: 'hero',
            enabled: true,
            props: {
              headline: landingPage?.heroTitle || `Welcome to ${tenant.name}`,
              tagline:
                landingPage?.heroSubtitle ||
                tenant.tagline ||
                'Quality healthcare for you and your family',
              backgroundImage: landingPage?.heroImage,
              primaryCtaText: landingPage?.heroCtaText || 'Book Appointment',
              primaryCtaLink: landingPage?.heroCtaLink || '/book',
              secondaryCtaText: 'Learn More',
              alignment: 'center',
            },
          })
          break

        case 'services':
          if (landingPage?.showServices !== false) {
            blocks.push({
              id: `services-${++blockIndex}`,
              type: 'services',
              enabled: landingPage?.showServices ?? true,
              props: {
                title: 'Our Services',
                subtitle: 'Comprehensive care tailored to your needs',
                showDuration: true,
                showDescription: true,
                layout: 'grid',
              },
            })
          }
          break

        case 'careTeam':
          if (landingPage?.showCareTeam !== false) {
            blocks.push({
              id: `care-team-${++blockIndex}`,
              type: 'care-team',
              enabled: landingPage?.showCareTeam ?? true,
              props: {
                title: 'Meet Our Care Team',
                subtitle: 'Experienced professionals dedicated to your health',
                maxProviders: 4,
                showSpecialties: true,
                showCredentials: true,
                showBookButton: true,
                layout: 'grid',
              },
            })
          }
          break

        case 'clinics':
          if (landingPage?.showClinics !== false) {
            blocks.push({
              id: `clinics-${++blockIndex}`,
              type: 'clinics',
              enabled: landingPage?.showClinics ?? true,
              props: {
                title: 'Our Locations',
                subtitle: 'Convenient locations near you',
                showMap: true,
                showHours: true,
                showPhone: true,
                layout: 'grid',
              },
            })
          }
          break

        case 'testimonials':
          if (landingPage?.showTestimonials !== false) {
            blocks.push({
              id: `testimonials-${++blockIndex}`,
              type: 'testimonials',
              enabled: landingPage?.showTestimonials ?? false,
              props: {
                title: 'What Our Patients Say',
                subtitle: 'Real stories from real patients',
                testimonials: [],
                layout: 'carousel',
              },
            })
          }
          break

        case 'booking':
          if (landingPage?.showBooking !== false) {
            blocks.push({
              id: `cta-band-${++blockIndex}`,
              type: 'cta-band',
              enabled: landingPage?.showBooking ?? true,
              props: {
                headline: 'Ready to Get Started?',
                subheadline:
                  'Book your appointment today and take the first step towards better health',
                primaryCtaText: 'Book Now',
                backgroundColor: 'primary',
              },
            })
          }
          break

        case 'contact':
          blocks.push({
            id: `contact-${++blockIndex}`,
            type: 'contact',
            enabled: true,
            props: {
              title: 'Contact Us',
              subtitle: "We're here to help",
              showPhone: true,
              showEmail: true,
              showAddress: true,
              showHours: true,
              layout: 'card-grid',
            },
          })
          break

        case 'cta':
          blocks.push({
            id: `cta-band-final-${++blockIndex}`,
            type: 'cta-band',
            enabled: true,
            props: {
              headline: 'Ready to Get Started?',
              subheadline: 'Book your appointment today',
              primaryCtaText: 'Book Now',
              backgroundColor: 'primary',
            },
          })
          break
      }
    }

    // Also migrate any custom sections
    if (landingPage?.customSections) {
      for (const customSection of landingPage.customSections) {
        if (customSection.enabled) {
          blocks.push({
            id: `custom-text-${++blockIndex}`,
            type: 'custom-text',
            enabled: true,
            props: {
              title: customSection.title,
              content: customSection.content,
              backgroundColor: 'white',
              alignment: 'center',
            },
          })
        }
      }
    }

    // Create the migrated website builder configuration
    const migratedWebsiteBuilder = {
      version: '1.0.0',
      templateId: 'classic-stacked' as const,
      header: {
        variant: 'sticky-simple' as const,
        logoUrl: tenant.branding.logo || undefined,
        logoAlt: tenant.name,
        navItems: [
          { id: 'services', label: 'Services', href: '#services' },
          { id: 'team', label: 'Our Team', href: '#care-team' },
          { id: 'locations', label: 'Locations', href: '#clinics' },
          { id: 'contact', label: 'Contact', href: '#contact' },
        ],
        showSignIn: true,
        signInText: 'Sign In',
        signInUrl: `/clinic/${tenant.slug}/login`,
        showBook: true,
        bookText: landingPage?.heroCtaText || 'Book Appointment',
        bookUrl: `/clinic/${tenant.slug}/book`,
        sticky: true,
        transparent: false,
      },
      footer: {
        variant: 'multi-column' as const,
        columns: [
          {
            id: 'services',
            title: 'Services',
            links: [
              { id: 'primary-care', label: 'Primary Care', href: '#services' },
              { id: 'urgent-care', label: 'Urgent Care', href: '#services' },
            ],
          },
          {
            id: 'company',
            title: 'Company',
            links: [
              { id: 'about', label: 'About Us', href: '#about' },
              { id: 'team', label: 'Our Team', href: '#care-team' },
            ],
          },
          {
            id: 'support',
            title: 'Support',
            links: [
              { id: 'contact', label: 'Contact Us', href: '#contact' },
              {
                id: 'patient-portal',
                label: 'Patient Portal',
                href: `/clinic/${tenant.slug}/login`,
              },
            ],
          },
        ],
        showLogo: true,
        tagline: tenant.tagline || undefined,
        showSocial: false,
        socialLinks: [],
        showNewsletter: false,
        legalLinks: [
          { id: 'privacy', label: 'Privacy Policy', href: '/privacy' },
          { id: 'terms', label: 'Terms of Service', href: '/terms' },
        ],
        poweredByZenthea: true,
      },
      theme: {
        primaryColor: tenant.branding.primaryColor,
        secondaryColor: tenant.branding.secondaryColor,
        accentColor: tenant.branding.accentColor || '#E8927C',
        backgroundColor: '#ffffff',
        textColor: '#1a1a1a',
        fontPair: 'inter-system',
        headingSize: 'medium' as const,
        sectionSpacing: 'normal' as const,
        cornerRadius: 'medium' as const,
        buttonStyle: 'solid' as const,
        colorMode: 'light' as const,
      },
      blocks,
      seo: {
        title: tenant.name,
        description: tenant.description || tenant.tagline,
      },
      // If landingPage was enabled, keep it enabled
      publishedAt: landingPage?.enabled ? Date.now() : undefined,
      lastEditedAt: Date.now(),
    }

    // Update tenant with migrated website builder
    await ctx.db.patch(tenant._id, {
      websiteBuilder: migratedWebsiteBuilder,
      updatedAt: Date.now(),
    })

    return {
      success: true,
      skipped: false,
      blocksCreated: blocks.length,
      wasPublished: landingPage?.enabled ?? false,
    }
  },
})

/**
 * Check if tenant needs migration from legacy landingPage
 */
export const checkMigrationStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query('tenants')
      .withIndex('by_tenant_id', (q) => q.eq('id', args.tenantId))
      .first()

    if (!tenant) {
      return { exists: false }
    }

    return {
      exists: true,
      hasLegacyConfig: !!tenant.landingPage,
      hasWebsiteBuilder: !!tenant.websiteBuilder,
      needsMigration: !!tenant.landingPage && !tenant.websiteBuilder,
      legacyEnabled: tenant.landingPage?.enabled ?? false,
      builderPublished: !!tenant.websiteBuilder?.publishedAt,
    }
  },
})
