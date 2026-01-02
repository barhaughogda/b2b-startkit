/**
 * Footer Utilities
 * 
 * Functions to transform footer configuration with real tenant data
 */

import type {
  FooterConfig,
  PageConfig,
  SiteStructure,
  NavItem,
  FooterMenuColumn,
  FooterMenuSection,
  FooterMenuItem,
  FooterColumn,
} from './schema';

// =============================================================================
// TYPES
// =============================================================================

export interface ResolveFooterOptions {
  /** Pages from website builder */
  pages: PageConfig[];
  /** Site structure type */
  siteStructure?: SiteStructure;
  /** Base path for URLs (e.g., '/clinic/my-clinic') */
  basePath?: string;
}

export interface TenantFooterData {
  /** Appointment types from booking settings */
  appointmentTypes?: Array<{
    id: string;
    name: string;
    duration: number;
    description?: string | null;
  }> | null;
  /** Pages from website builder */
  pages?: PageConfig[] | null;
  /** Site structure type */
  siteStructure?: 'one-pager' | 'multi-page';
  /** Base path for URLs (e.g., '/clinic/my-clinic') */
  basePath?: string;
}

/**
 * Transforms footer columns to use real tenant data instead of mock data
 * 
 * - Services column: Uses actual appointment types from booking settings
 * - Company column: Uses actual pages that exist (About, Team, Locations)
 * - Support column: Uses actual pages (Contact, FAQ) and real links
 */
export function transformFooterWithTenantData(
  footer: FooterConfig,
  tenantData: TenantFooterData
): FooterConfig {
  const { appointmentTypes, pages, siteStructure = 'multi-page', basePath = '' } = tenantData;

  // Transform columns to use real data
  const transformedColumns = footer.columns.map(column => {
    // Services column - use real appointment types
    if (column.id === 'services') {
      if (appointmentTypes && appointmentTypes.length > 0) {
        // Use real appointment types
        const servicesLinks = appointmentTypes.slice(0, 6).map(type => {
          // For one-pager, use anchor links; for multi-page, use page URL
          const href = siteStructure === 'one-pager' 
            ? '#services' 
            : basePath ? `${basePath}/services` : '/services';
          
          return {
            id: type.id,
            label: type.name,
            href,
            isExternal: false,
          };
        });

        return {
          ...column,
          links: servicesLinks.length > 0 ? servicesLinks : column.links, // Fallback to original if no services
        };
      }
      // If no appointment types, remove the services column or keep it empty
      return {
        ...column,
        links: [], // Remove mock services if no real ones exist
      };
    }

    // Company column - use real pages
    if (column.id === 'company') {
      if (pages && pages.length > 0) {
        // Find pages that should appear in company section
        const companyPages = pages.filter(page => 
          page.enabled && 
          page.showInFooter && 
          ['home', 'team', 'locations'].includes(page.type)
        );

        if (companyPages.length > 0) {
          const companyLinks = companyPages.map(page => {
            // Determine href based on site structure
            let href: string;
            if (siteStructure === 'one-pager') {
              // Use anchor links for one-pager
              href = page.type === 'home' ? '#' : `#${page.slug || page.type}`;
            } else {
              // Use page URLs for multi-page
              href = page.slug 
                ? (basePath ? `${basePath}/${page.slug}` : `/${page.slug}`)
                : (basePath || '/');
            }

            return {
              id: page.id,
              label: page.title,
              href,
              isExternal: false,
            };
          });

          return {
            ...column,
            links: companyLinks,
          };
        }
      }
      // If no pages, remove mock links
      return {
        ...column,
        links: [],
      };
    }

    // Support column - use real pages and links
    if (column.id === 'support') {
      const supportLinks: Array<{ id: string; label: string; href: string; isExternal?: boolean }> = [];

      // Add Contact page if it exists
      if (pages) {
        const contactPage = pages.find(page => 
          page.enabled && 
          page.showInFooter && 
          page.type === 'contact'
        );
        
        if (contactPage) {
          const href = siteStructure === 'one-pager'
            ? '#contact'
            : (basePath ? `${basePath}/contact` : '/contact');
          
          supportLinks.push({
            id: contactPage.id,
            label: contactPage.title,
            href,
            isExternal: false,
          });
        }

        // Add FAQ if it exists (could be a custom page)
        const faqPage = pages.find(page => 
          page.enabled && 
          page.showInFooter && 
          (page.type === 'custom' && page.slug?.toLowerCase().includes('faq'))
        );
        
        if (faqPage) {
          const href = siteStructure === 'one-pager'
            ? '#faq'
            : (basePath ? `${basePath}/${faqPage.slug}` : `/${faqPage.slug}`);
          
          supportLinks.push({
            id: faqPage.id,
            label: faqPage.title,
            href,
            isExternal: false,
          });
        }
      }

      // Add Patient Portal link (always available)
      const patientPortalHref = basePath ? `${basePath}/login` : '/login';
      supportLinks.push({
        id: 'patient-portal',
        label: 'Patient Portal',
        href: patientPortalHref,
        isExternal: false,
      });

      return {
        ...column,
        links: supportLinks.length > 0 ? supportLinks : column.links, // Fallback if no real links
      };
    }

    // For other columns, keep as-is but transform URLs
    return {
      ...column,
      links: column.links.map(link => {
        // Skip external links and anchor links
        if (link.isExternal || link.href.startsWith('#') || link.href.startsWith('http')) {
          return link;
        }
        
        // Skip special paths
        if (link.href.startsWith('/login') || link.href.startsWith('/book')) {
          return link;
        }
        
        // Transform internal URLs
        const href = link.href === '/'
          ? (basePath || '/')
          : (basePath ? `${basePath}${link.href}` : link.href);
        
        return { ...link, href };
      }),
    };
  });

  // Filter out columns with no links
  const filteredColumns = transformedColumns.filter(column => column.links.length > 0);

  return {
    ...footer,
    columns: filteredColumns.length > 0 ? filteredColumns : footer.columns, // Keep original if all filtered out
  };
}

// =============================================================================
// PREVIEW-AWARE FOOTER RESOLUTION
// =============================================================================

/**
 * Generates the href for a page based on site structure and base path
 */
function getPageHref(
  page: PageConfig,
  siteStructure: SiteStructure,
  basePath: string
): string {
  if (siteStructure === 'one-pager') {
    // Use anchor links for one-pager
    return page.type === 'home' ? '#' : `#${page.slug || page.type}`;
  }
  // Use page URLs for multi-page
  if (page.type === 'home') {
    return basePath || '/';
  }
  return page.slug
    ? (basePath ? `${basePath}/${page.slug}` : `/${page.slug}`)
    : (basePath || '/');
}

/**
 * Resolves footer column links based on current pages state.
 * 
 * This function is used in the builder preview to ensure footer menus
 * update when pages are toggled, renamed, or have their slugs changed.
 * 
 * For links that have a `pageId` reference:
 * - Updates label from the page's current title
 * - Updates href from the page's current slug
 * - Removes links where the page is disabled OR showInFooter is false
 * 
 * @param footer - The footer configuration to resolve
 * @param options - Resolution options including pages, site structure, and base path
 * @returns A new FooterConfig with resolved links
 */
export function resolveFooterWithPages(
  footer: FooterConfig,
  options: ResolveFooterOptions
): FooterConfig {
  const { pages, siteStructure = 'multi-page', basePath = '' } = options;

  // Build a lookup map for pages by ID for quick access
  const pageMap = new Map<string, PageConfig>();
  for (const page of pages) {
    pageMap.set(page.id, page);
  }

  // Get pages that should appear in footer (enabled + showInFooter)
  const footerPages = pages.filter(p => p.enabled && p.showInFooter);

  // Transform columns
  const resolvedColumns = footer.columns.map(column => {
    const resolvedLinks: NavItem[] = [];

    for (const link of column.links) {
      // If link has a pageId, resolve it from current pages
      if (link.pageId) {
        const page = pageMap.get(link.pageId);
        
        // Skip if page doesn't exist, is disabled, or showInFooter is false
        if (!page || !page.enabled || !page.showInFooter) {
          continue;
        }

        // Update label and href from current page state
        resolvedLinks.push({
          ...link,
          label: page.title,
          href: getPageHref(page, siteStructure, basePath),
        });
      } else {
        // Non-page links pass through, but transform internal URLs with basePath
        if (link.isExternal || link.href.startsWith('#') || link.href.startsWith('http')) {
          resolvedLinks.push(link);
        } else if (link.href.startsWith('/login') || link.href.startsWith('/book')) {
          // Keep special paths as-is
          resolvedLinks.push(link);
        } else {
          // Transform internal URLs with basePath
          const href = link.href === '/'
            ? (basePath || '/')
            : (basePath ? `${basePath}${link.href}` : link.href);
          resolvedLinks.push({ ...link, href });
        }
      }
    }

    return {
      ...column,
      links: resolvedLinks,
    };
  });

  // Filter out empty columns
  const filteredColumns = resolvedColumns.filter(col => col.links.length > 0);

  return {
    ...footer,
    columns: filteredColumns.length > 0 ? filteredColumns : footer.columns,
  };
}

/**
 * Builds footer columns directly from pages that have showInFooter enabled.
 * 
 * This is used when there are no explicit footer columns configured,
 * to auto-generate footer navigation from the pages.
 * 
 * Groups pages by type:
 * - "Company" section: home, team, locations
 * - "Services" section: services
 * - "Support" section: contact, custom pages
 * - "Legal" section: terms, privacy
 */
export function buildFooterColumnsFromPages(
  pages: PageConfig[],
  siteStructure: SiteStructure = 'multi-page',
  basePath: string = ''
): FooterConfig['columns'] {
  const footerPages = pages
    .filter(p => p.enabled && p.showInFooter)
    .sort((a, b) => a.order - b.order);

  if (footerPages.length === 0) {
    return [];
  }

  // Group pages by section
  const companyPages = footerPages.filter(p => 
    ['home', 'team', 'locations'].includes(p.type)
  );
  const servicesPages = footerPages.filter(p => p.type === 'services');
  const supportPages = footerPages.filter(p => 
    p.type === 'contact' || p.type === 'custom'
  );
  const legalPages = footerPages.filter(p => 
    p.type === 'terms' || p.type === 'privacy'
  );

  const columns: FooterConfig['columns'] = [];

  // Helper to create links from pages
  const createLinks = (pagesToLink: PageConfig[]): NavItem[] =>
    pagesToLink.map(page => ({
      id: page.id,
      label: page.title,
      href: getPageHref(page, siteStructure, basePath),
      pageId: page.id,
    }));

  // Add Company column if it has pages
  if (companyPages.length > 0) {
    columns.push({
      id: 'company',
      title: 'Company',
      links: createLinks(companyPages),
    });
  }

  // Add Services column if it has pages
  if (servicesPages.length > 0) {
    columns.push({
      id: 'services',
      title: 'Services',
      links: createLinks(servicesPages),
    });
  }

  // Add Support column if it has pages
  if (supportPages.length > 0) {
    columns.push({
      id: 'support',
      title: 'Support',
      links: createLinks(supportPages),
    });
  }

  // Add Legal column if it has pages (typically shown in footer bottom bar, but can be in column too)
  if (legalPages.length > 0) {
    columns.push({
      id: 'legal',
      title: 'Legal',
      links: createLinks(legalPages),
    });
  }

  return columns;
}

// =============================================================================
// FOOTER MENU V2 UTILITIES
// =============================================================================

/**
 * Migrates legacy footer columns to v2 menuColumns format.
 * 
 * Each legacy column becomes a single section within its own column.
 * External links from footerConfig.externalLinks are placed in their own section.
 * 
 * @param footer - The legacy footer configuration
 * @returns New menuColumns array in v2 format
 */
export function migrateLegacyFooterToMenuV2(footer: FooterConfig): FooterMenuColumn[] {
  const menuColumns: FooterMenuColumn[] = [];

  // Convert each legacy column to a v2 column with one section
  footer.columns.forEach((legacyCol, index) => {
    const items: FooterMenuItem[] = legacyCol.links.map(link => {
      // If link has a pageId, create a page item
      if (link.pageId) {
        return {
          id: link.id,
          kind: 'page' as const,
          pageId: link.pageId,
        };
      }
      // If link is external (starts with http), create external item
      if (link.isExternal || link.href.startsWith('http')) {
        return {
          id: link.id,
          kind: 'external' as const,
          label: link.label,
          url: link.href,
          openInNewTab: true,
        };
      }
      // Internal links without pageId - create page item referencing by ID
      // This handles links that were created before pageId was added
      // Use pageId if available, otherwise fallback to link.id
      return {
        id: link.id,
        kind: 'page' as const,
        pageId: link.pageId || link.id, // Use pageId if available, fallback to id
      };
    });

    menuColumns.push({
      id: legacyCol.id,
      layoutOrder: index,
      sections: [
        {
          id: `${legacyCol.id}-section`,
          title: legacyCol.title,
          items,
        },
      ],
    });
  });

  // If there are external links, add them as a new section in the last column
  // or create a new column if needed
  if (footer.externalLinks && footer.externalLinks.length > 0) {
    const externalItems: FooterMenuItem[] = footer.externalLinks.map(link => ({
      id: link.id,
      kind: 'external' as const,
      label: link.label,
      url: link.url,
      openInNewTab: link.openInNewTab ?? true,
    }));

    const externalSection: FooterMenuSection = {
      id: 'external-links-section',
      title: 'External Links',
      items: externalItems,
    };

    // Add to last column if it exists, otherwise create new column
    if (menuColumns.length > 0) {
      const lastColumn = menuColumns[menuColumns.length - 1];
      if (lastColumn) {
        lastColumn.sections.push(externalSection);
      }
    } else {
      menuColumns.push({
        id: 'external-links-column',
        layoutOrder: 0,
        sections: [externalSection],
      });
    }
  }

  return menuColumns;
}

/**
 * Prunes footer menu items whose pageId is not enabled or showInFooter is false.
 * 
 * @param menuColumns - The v2 menu columns to prune
 * @param pages - Current pages configuration
 * @returns New menuColumns with invalid page references removed
 */
export function pruneFooterMenuForPages(
  menuColumns: FooterMenuColumn[],
  pages: PageConfig[]
): FooterMenuColumn[] {
  // Build set of valid page IDs (enabled AND showInFooter)
  const validPageIds = new Set(
    pages.filter(p => p.enabled && p.showInFooter).map(p => p.id)
  );

  return menuColumns.map(column => ({
    ...column,
    sections: column.sections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Keep external items
        if (item.kind === 'external') {
          return true;
        }
        // For page items, only keep if page is valid
        return validPageIds.has(item.pageId);
      }),
    })).filter(section => section.items.length > 0), // Remove empty sections
  })).filter(column => column.sections.length > 0); // Remove empty columns
}

/**
 * Resolved footer menu item for rendering
 */
export interface ResolvedFooterMenuItem {
  id: string;
  label: string;
  href: string;
  isExternal: boolean;
  openInNewTab?: boolean;
}

/**
 * Resolved footer menu section for rendering
 */
export interface ResolvedFooterMenuSection {
  id: string;
  title: string;
  items: ResolvedFooterMenuItem[];
}

/**
 * Resolved footer menu column for rendering
 */
export interface ResolvedFooterMenuColumn {
  id: string;
  layoutOrder: number;
  sections: ResolvedFooterMenuSection[];
}

/**
 * Resolves v2 menu columns with current pages state.
 * 
 * For page items:
 * - Looks up the page by pageId
 * - Skips items where page is disabled or showInFooter is false
 * - Resolves label from page.title and href from page.slug
 * 
 * @param menuColumns - The v2 menu columns to resolve
 * @param options - Resolution options including pages, site structure, and base path
 * @returns Resolved menu columns ready for rendering
 */
export function resolveFooterMenuV2(
  menuColumns: FooterMenuColumn[],
  options: ResolveFooterOptions
): ResolvedFooterMenuColumn[] {
  const { pages, siteStructure = 'multi-page', basePath = '' } = options;

  // Build page lookup map
  const pageMap = new Map<string, PageConfig>();
  for (const page of pages) {
    pageMap.set(page.id, page);
  }

  return menuColumns
    .map(column => {
      const resolvedSections: ResolvedFooterMenuSection[] = column.sections
        .map(section => {
          const resolvedItems: ResolvedFooterMenuItem[] = [];

          for (const item of section.items) {
            if (item.kind === 'external') {
              resolvedItems.push({
                id: item.id,
                label: item.label,
                href: item.url,
                isExternal: true,
                openInNewTab: item.openInNewTab ?? true,
              });
            } else {
              // Page item
              const page = pageMap.get(item.pageId);
              
              // Skip if page doesn't exist, is disabled, or showInFooter is false
              if (!page || !page.enabled || !page.showInFooter) {
                continue;
              }

              resolvedItems.push({
                id: item.id,
                label: page.title,
                href: getPageHref(page, siteStructure, basePath),
                isExternal: false,
              });
            }
          }

          return {
            id: section.id,
            title: section.title,
            items: resolvedItems,
          };
        })
        .filter(section => section.items.length > 0); // Remove empty sections

      return {
        id: column.id,
        layoutOrder: column.layoutOrder,
        sections: resolvedSections,
      };
    })
    .filter(column => column.sections.length > 0) // Remove empty columns
    .sort((a, b) => a.layoutOrder - b.layoutOrder);
}

/**
 * Checks if a footer config uses v2 menu columns
 */
export function hasMenuColumnsV2(footer: FooterConfig): boolean {
  return Array.isArray(footer.menuColumns) && footer.menuColumns.length > 0;
}

/**
 * Creates default v2 menu columns from pages.
 * Used when initializing a new footer or migrating.
 */
export function createDefaultMenuColumnsFromPages(
  pages: PageConfig[]
): FooterMenuColumn[] {
  const footerPages = pages
    .filter(p => p.enabled && p.showInFooter)
    .sort((a, b) => a.order - b.order);

  if (footerPages.length === 0) {
    return [];
  }

  // Group pages by section type
  const companyPages = footerPages.filter(p => 
    ['home', 'team', 'locations'].includes(p.type)
  );
  const servicesPages = footerPages.filter(p => p.type === 'services');
  const supportPages = footerPages.filter(p => 
    p.type === 'contact' || p.type === 'custom'
  );
  const legalPages = footerPages.filter(p => 
    p.type === 'terms' || p.type === 'privacy'
  );

  const columns: FooterMenuColumn[] = [];
  let order = 0;

  // Helper to create page items
  const createPageItems = (pagesToUse: PageConfig[]): FooterMenuItem[] =>
    pagesToUse.map(page => ({
      id: `page-${page.id}`,
      kind: 'page' as const,
      pageId: page.id,
    }));

  // Company column
  if (companyPages.length > 0) {
    columns.push({
      id: 'company',
      layoutOrder: order++,
      sections: [{
        id: 'company-section',
        title: 'Company',
        items: createPageItems(companyPages),
      }],
    });
  }

  // Services column
  if (servicesPages.length > 0) {
    columns.push({
      id: 'services',
      layoutOrder: order++,
      sections: [{
        id: 'services-section',
        title: 'Services',
        items: createPageItems(servicesPages),
      }],
    });
  }

  // Support column
  if (supportPages.length > 0) {
    columns.push({
      id: 'support',
      layoutOrder: order++,
      sections: [{
        id: 'support-section',
        title: 'Support',
        items: createPageItems(supportPages),
      }],
    });
  }

  // Legal column (optional - often in footer bottom bar instead)
  if (legalPages.length > 0) {
    columns.push({
      id: 'legal',
      layoutOrder: order++,
      sections: [{
        id: 'legal-section',
        title: 'Legal',
        items: createPageItems(legalPages),
      }],
    });
  }

  return columns;
}
