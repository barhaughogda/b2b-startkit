/**
 * Footer Utilities Tests
 *
 * Tests for footer menu v2 helpers:
 * - resolveFooterWithPages
 * - resolveFooterMenuV2
 * - pruneFooterMenuForPages
 * - migrateLegacyFooterToMenuV2
 * - createDefaultMenuColumnsFromPages
 */

import { describe, it, expect } from 'vitest';
import {
  resolveFooterWithPages,
  resolveFooterMenuV2,
  pruneFooterMenuForPages,
  migrateLegacyFooterToMenuV2,
  createDefaultMenuColumnsFromPages,
  hasMenuColumnsV2,
} from '../footer-utils';
import type {
  FooterConfig,
  PageConfig,
  FooterMenuColumn,
  FooterColumn,
} from '../schema';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createMockPage(
  id: string,
  title: string,
  type: PageConfig['type'],
  options: Partial<PageConfig> = {}
): PageConfig {
  return {
    id,
    title,
    type,
    slug: options.slug || id,
    enabled: options.enabled ?? true,
    showInHeader: options.showInHeader ?? true,
    showInFooter: options.showInFooter ?? true,
    order: options.order ?? 0,
    blocks: [],
    ...options,
  };
}

function createMockFooterConfig(
  options: Partial<FooterConfig> = {}
): FooterConfig {
  return {
    variant: 'multi-column',
    columns: options.columns || [],
    showLogo: true,
    showSocial: true,
    socialLinks: [],
    externalLinks: [],
    showNewsletter: false,
    legalLinks: [],
    poweredByZenthea: true,
    useThemeColors: true,
    ...options,
  };
}

function createMockMenuColumn(
  id: string,
  sections: FooterMenuColumn['sections'],
  layoutOrder: number = 0
): FooterMenuColumn {
  return {
    id,
    layoutOrder,
    sections,
  };
}

// =============================================================================
// resolveFooterWithPages TESTS
// =============================================================================

describe('resolveFooterWithPages', () => {
  it('should resolve page links with current page titles and slugs', () => {
    const pages: PageConfig[] = [
      createMockPage('page-1', 'Updated Title', 'services', { slug: 'updated-slug' }),
    ];

    const footer = createMockFooterConfig({
      columns: [
        {
          id: 'col-1',
          title: 'Services',
          links: [{ id: 'link-1', label: 'Old Title', href: '/old-slug', pageId: 'page-1' }],
        },
      ],
    });

    const result = resolveFooterWithPages(footer, { pages, siteStructure: 'multi-page' });

    expect(result.columns[0].links[0].label).toBe('Updated Title');
    expect(result.columns[0].links[0].href).toBe('/updated-slug');
  });

  it('should remove links for disabled pages', () => {
    const pages: PageConfig[] = [
      createMockPage('page-1', 'Disabled Page', 'services', { enabled: false }),
      createMockPage('page-2', 'Active Page', 'team'),
    ];

    const footer = createMockFooterConfig({
      columns: [
        {
          id: 'col-1',
          title: 'Pages',
          links: [
            { id: 'link-1', label: 'Page 1', href: '/page-1', pageId: 'page-1' },
            { id: 'link-2', label: 'Page 2', href: '/page-2', pageId: 'page-2' },
          ],
        },
      ],
    });

    const result = resolveFooterWithPages(footer, { pages, siteStructure: 'multi-page' });

    expect(result.columns[0].links).toHaveLength(1);
    expect(result.columns[0].links[0].label).toBe('Active Page');
  });

  it('should remove links for pages with showInFooter=false', () => {
    const pages: PageConfig[] = [
      createMockPage('page-1', 'Hidden from Footer', 'services', { showInFooter: false }),
      createMockPage('page-2', 'Visible in Footer', 'team'),
    ];

    const footer = createMockFooterConfig({
      columns: [
        {
          id: 'col-1',
          title: 'Pages',
          links: [
            { id: 'link-1', label: 'Page 1', href: '/page-1', pageId: 'page-1' },
            { id: 'link-2', label: 'Page 2', href: '/page-2', pageId: 'page-2' },
          ],
        },
      ],
    });

    const result = resolveFooterWithPages(footer, { pages, siteStructure: 'multi-page' });

    expect(result.columns[0].links).toHaveLength(1);
    expect(result.columns[0].links[0].label).toBe('Visible in Footer');
  });

  it('should use anchor links for one-pager site structure', () => {
    const pages: PageConfig[] = [
      createMockPage('page-1', 'Services', 'services', { slug: 'services' }),
    ];

    const footer = createMockFooterConfig({
      columns: [
        {
          id: 'col-1',
          title: 'Pages',
          links: [{ id: 'link-1', label: 'Services', href: '/services', pageId: 'page-1' }],
        },
      ],
    });

    const result = resolveFooterWithPages(footer, { pages, siteStructure: 'one-pager' });

    expect(result.columns[0].links[0].href).toBe('#services');
  });

  it('should preserve external links without modification', () => {
    const pages: PageConfig[] = [];

    const footer = createMockFooterConfig({
      columns: [
        {
          id: 'col-1',
          title: 'External',
          links: [
            { id: 'link-1', label: 'External Site', href: 'https://example.com', isExternal: true },
          ],
        },
      ],
    });

    const result = resolveFooterWithPages(footer, { pages });

    expect(result.columns[0].links[0].href).toBe('https://example.com');
    expect(result.columns[0].links[0].isExternal).toBe(true);
  });

  it('should prepend basePath to internal URLs', () => {
    const pages: PageConfig[] = [
      createMockPage('page-1', 'Services', 'services', { slug: 'services' }),
    ];

    const footer = createMockFooterConfig({
      columns: [
        {
          id: 'col-1',
          title: 'Pages',
          links: [{ id: 'link-1', label: 'Services', href: '/services', pageId: 'page-1' }],
        },
      ],
    });

    const result = resolveFooterWithPages(footer, {
      pages,
      siteStructure: 'multi-page',
      basePath: '/clinic/my-clinic',
    });

    expect(result.columns[0].links[0].href).toBe('/clinic/my-clinic/services');
  });
});

// =============================================================================
// pruneFooterMenuForPages TESTS
// =============================================================================

describe('pruneFooterMenuForPages', () => {
  it('should remove page items for disabled pages', () => {
    const menuColumns: FooterMenuColumn[] = [
      createMockMenuColumn('col-1', [
        {
          id: 'section-1',
          title: 'Services',
          items: [
            { id: 'item-1', kind: 'page', pageId: 'page-1' },
            { id: 'item-2', kind: 'page', pageId: 'page-2' },
          ],
        },
      ]),
    ];

    const pages: PageConfig[] = [
      createMockPage('page-1', 'Disabled', 'services', { enabled: false }),
      createMockPage('page-2', 'Active', 'team'),
    ];

    const result = pruneFooterMenuForPages(menuColumns, pages);

    expect(result[0].sections[0].items).toHaveLength(1);
    expect((result[0].sections[0].items[0] as { kind: 'page'; pageId: string }).pageId).toBe('page-2');
  });

  it('should remove page items for pages with showInFooter=false', () => {
    const menuColumns: FooterMenuColumn[] = [
      createMockMenuColumn('col-1', [
        {
          id: 'section-1',
          title: 'Pages',
          items: [
            { id: 'item-1', kind: 'page', pageId: 'page-1' },
            { id: 'item-2', kind: 'page', pageId: 'page-2' },
          ],
        },
      ]),
    ];

    const pages: PageConfig[] = [
      createMockPage('page-1', 'Hidden', 'services', { showInFooter: false }),
      createMockPage('page-2', 'Visible', 'team'),
    ];

    const result = pruneFooterMenuForPages(menuColumns, pages);

    expect(result[0].sections[0].items).toHaveLength(1);
    expect((result[0].sections[0].items[0] as { kind: 'page'; pageId: string }).pageId).toBe('page-2');
  });

  it('should preserve external items', () => {
    const menuColumns: FooterMenuColumn[] = [
      createMockMenuColumn('col-1', [
        {
          id: 'section-1',
          title: 'Links',
          items: [
            { id: 'item-1', kind: 'page', pageId: 'deleted-page' },
            { id: 'item-2', kind: 'external', label: 'External', url: 'https://example.com', openInNewTab: true },
          ],
        },
      ]),
    ];

    const pages: PageConfig[] = [];

    const result = pruneFooterMenuForPages(menuColumns, pages);

    expect(result[0].sections[0].items).toHaveLength(1);
    expect(result[0].sections[0].items[0].kind).toBe('external');
  });

  it('should remove empty sections after pruning', () => {
    const menuColumns: FooterMenuColumn[] = [
      createMockMenuColumn('col-1', [
        {
          id: 'section-1',
          title: 'Deleted Pages',
          items: [{ id: 'item-1', kind: 'page', pageId: 'deleted-page' }],
        },
        {
          id: 'section-2',
          title: 'Active',
          items: [{ id: 'item-2', kind: 'page', pageId: 'active-page' }],
        },
      ]),
    ];

    const pages: PageConfig[] = [
      createMockPage('active-page', 'Active', 'team'),
    ];

    const result = pruneFooterMenuForPages(menuColumns, pages);

    expect(result[0].sections).toHaveLength(1);
    expect(result[0].sections[0].title).toBe('Active');
  });

  it('should remove empty columns after pruning', () => {
    const menuColumns: FooterMenuColumn[] = [
      createMockMenuColumn('col-empty', [
        {
          id: 'section-1',
          title: 'All Deleted',
          items: [{ id: 'item-1', kind: 'page', pageId: 'deleted-page' }],
        },
      ]),
      createMockMenuColumn('col-active', [
        {
          id: 'section-2',
          title: 'Active',
          items: [{ id: 'item-2', kind: 'page', pageId: 'active-page' }],
        },
      ], 1),
    ];

    const pages: PageConfig[] = [
      createMockPage('active-page', 'Active', 'team'),
    ];

    const result = pruneFooterMenuForPages(menuColumns, pages);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('col-active');
  });
});

// =============================================================================
// migrateLegacyFooterToMenuV2 TESTS
// =============================================================================

describe('migrateLegacyFooterToMenuV2', () => {
  it('should convert legacy columns to v2 format with one section per column', () => {
    const footer = createMockFooterConfig({
      columns: [
        {
          id: 'services',
          title: 'Services',
          links: [
            { id: 'link-1', label: 'Primary Care', href: '/primary-care', pageId: 'page-1' },
          ],
        },
        {
          id: 'company',
          title: 'Company',
          links: [
            { id: 'link-2', label: 'About', href: '/about', pageId: 'page-2' },
          ],
        },
      ],
    });

    const result = migrateLegacyFooterToMenuV2(footer);

    expect(result).toHaveLength(2);
    expect(result[0].sections).toHaveLength(1);
    expect(result[0].sections[0].title).toBe('Services');
    expect(result[1].sections[0].title).toBe('Company');
  });

  it('should convert links with pageId to page items', () => {
    const footer = createMockFooterConfig({
      columns: [
        {
          id: 'pages',
          title: 'Pages',
          links: [{ id: 'link-1', label: 'Services', href: '/services', pageId: 'page-1' }],
        },
      ],
    });

    const result = migrateLegacyFooterToMenuV2(footer);
    const item = result[0].sections[0].items[0];

    expect(item.kind).toBe('page');
    expect((item as { pageId: string }).pageId).toBe('page-1');
  });

  it('should convert external links to external items', () => {
    const footer = createMockFooterConfig({
      columns: [
        {
          id: 'external',
          title: 'External',
          links: [{ id: 'link-1', label: 'Blog', href: 'https://blog.example.com', isExternal: true }],
        },
      ],
    });

    const result = migrateLegacyFooterToMenuV2(footer);
    const item = result[0].sections[0].items[0];

    expect(item.kind).toBe('external');
    expect((item as { url: string }).url).toBe('https://blog.example.com');
  });

  it('should migrate externalLinks to a section in the last column', () => {
    const footer = createMockFooterConfig({
      columns: [
        {
          id: 'pages',
          title: 'Pages',
          links: [{ id: 'link-1', label: 'Home', href: '/', pageId: 'home' }],
        },
      ],
      externalLinks: [
        { id: 'ext-1', label: 'Blog', url: 'https://blog.example.com', openInNewTab: true },
      ],
    });

    const result = migrateLegacyFooterToMenuV2(footer);

    expect(result[0].sections).toHaveLength(2);
    expect(result[0].sections[1].title).toBe('External Links');
    expect(result[0].sections[1].items[0].kind).toBe('external');
  });
});

// =============================================================================
// resolveFooterMenuV2 TESTS
// =============================================================================

describe('resolveFooterMenuV2', () => {
  it('should resolve page items with current page data', () => {
    const menuColumns: FooterMenuColumn[] = [
      createMockMenuColumn('col-1', [
        {
          id: 'section-1',
          title: 'Services',
          items: [{ id: 'item-1', kind: 'page', pageId: 'page-1' }],
        },
      ]),
    ];

    const pages: PageConfig[] = [
      createMockPage('page-1', 'Updated Title', 'services', { slug: 'updated-slug' }),
    ];

    const result = resolveFooterMenuV2(menuColumns, { pages, siteStructure: 'multi-page' });

    expect(result[0].sections[0].items[0].label).toBe('Updated Title');
    expect(result[0].sections[0].items[0].href).toBe('/updated-slug');
    expect(result[0].sections[0].items[0].isExternal).toBe(false);
  });

  it('should resolve external items with their stored data', () => {
    const menuColumns: FooterMenuColumn[] = [
      createMockMenuColumn('col-1', [
        {
          id: 'section-1',
          title: 'Links',
          items: [
            { id: 'item-1', kind: 'external', label: 'Blog', url: 'https://blog.example.com', openInNewTab: true },
          ],
        },
      ]),
    ];

    const result = resolveFooterMenuV2(menuColumns, { pages: [] });

    expect(result[0].sections[0].items[0].label).toBe('Blog');
    expect(result[0].sections[0].items[0].href).toBe('https://blog.example.com');
    expect(result[0].sections[0].items[0].isExternal).toBe(true);
    expect(result[0].sections[0].items[0].openInNewTab).toBe(true);
  });

  it('should skip page items for disabled pages', () => {
    const menuColumns: FooterMenuColumn[] = [
      createMockMenuColumn('col-1', [
        {
          id: 'section-1',
          title: 'Pages',
          items: [
            { id: 'item-1', kind: 'page', pageId: 'disabled-page' },
            { id: 'item-2', kind: 'page', pageId: 'active-page' },
          ],
        },
      ]),
    ];

    const pages: PageConfig[] = [
      createMockPage('disabled-page', 'Disabled', 'services', { enabled: false }),
      createMockPage('active-page', 'Active', 'team'),
    ];

    const result = resolveFooterMenuV2(menuColumns, { pages });

    expect(result[0].sections[0].items).toHaveLength(1);
    expect(result[0].sections[0].items[0].label).toBe('Active');
  });

  it('should sort columns by layoutOrder', () => {
    const menuColumns: FooterMenuColumn[] = [
      createMockMenuColumn('col-b', [{ id: 'sec-b', title: 'B', items: [{ id: 'i', kind: 'external', label: 'B', url: 'b', openInNewTab: true }] }], 2),
      createMockMenuColumn('col-a', [{ id: 'sec-a', title: 'A', items: [{ id: 'i', kind: 'external', label: 'A', url: 'a', openInNewTab: true }] }], 1),
      createMockMenuColumn('col-c', [{ id: 'sec-c', title: 'C', items: [{ id: 'i', kind: 'external', label: 'C', url: 'c', openInNewTab: true }] }], 0),
    ];

    const result = resolveFooterMenuV2(menuColumns, { pages: [] });

    expect(result[0].id).toBe('col-c');
    expect(result[1].id).toBe('col-a');
    expect(result[2].id).toBe('col-b');
  });
});

// =============================================================================
// createDefaultMenuColumnsFromPages TESTS
// =============================================================================

describe('createDefaultMenuColumnsFromPages', () => {
  it('should group pages by type into appropriate columns', () => {
    const pages: PageConfig[] = [
      createMockPage('home', 'Home', 'home'),
      createMockPage('team', 'Our Team', 'team'),
      createMockPage('services', 'Services', 'services'),
      createMockPage('contact', 'Contact', 'contact'),
    ];

    const result = createDefaultMenuColumnsFromPages(pages);

    // Company column (home, team)
    const companyCol = result.find(c => c.id === 'company');
    expect(companyCol).toBeDefined();
    expect(companyCol!.sections[0].items).toHaveLength(2);

    // Services column
    const servicesCol = result.find(c => c.id === 'services');
    expect(servicesCol).toBeDefined();
    expect(servicesCol!.sections[0].items).toHaveLength(1);

    // Support column (contact)
    const supportCol = result.find(c => c.id === 'support');
    expect(supportCol).toBeDefined();
    expect(supportCol!.sections[0].items).toHaveLength(1);
  });

  it('should only include enabled pages with showInFooter', () => {
    const pages: PageConfig[] = [
      createMockPage('home', 'Home', 'home'),
      createMockPage('disabled', 'Disabled', 'team', { enabled: false }),
      createMockPage('hidden', 'Hidden', 'services', { showInFooter: false }),
    ];

    const result = createDefaultMenuColumnsFromPages(pages);

    // Only company column with home
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('company');
    expect(result[0].sections[0].items).toHaveLength(1);
  });

  it('should return empty array when no footer-eligible pages', () => {
    const pages: PageConfig[] = [
      createMockPage('disabled', 'Disabled', 'team', { enabled: false }),
    ];

    const result = createDefaultMenuColumnsFromPages(pages);

    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// hasMenuColumnsV2 TESTS
// =============================================================================

describe('hasMenuColumnsV2', () => {
  it('should return true when menuColumns is defined and non-empty', () => {
    const footer = createMockFooterConfig({
      menuColumns: [createMockMenuColumn('col-1', [])],
    });

    expect(hasMenuColumnsV2(footer)).toBe(true);
  });

  it('should return false when menuColumns is undefined', () => {
    const footer = createMockFooterConfig({
      menuColumns: undefined,
    });

    expect(hasMenuColumnsV2(footer)).toBe(false);
  });

  it('should return false when menuColumns is empty', () => {
    const footer = createMockFooterConfig({
      menuColumns: [],
    });

    expect(hasMenuColumnsV2(footer)).toBe(false);
  });
});

