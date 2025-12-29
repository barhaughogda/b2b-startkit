'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { ClinicLayout } from '@/components/layout/ClinicLayout';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  BlockCanvas,
  BlockConfigPanel,
  LivePreview,
  SettingsModal,
  StructureModal,
  HeaderBlockPanel,
  FooterBlockPanel,
} from '@/components/website-builder';
import { BackButton } from '@/components/ui/back-button';
import {
  type SiteStructure,
  type HeaderVariant,
  type FooterVariant,
  type BlockInstance,
  type ThemeConfig,
  type HeaderConfig,
  type FooterConfig,
  type PageConfig,
  type SocialLink,
  DEFAULT_THEME,
  getDefaultPages,
  getDefaultNavItems,
} from '@/lib/website-builder/schema';
import { getDefaultBlocksForPageType } from '@/lib/website-builder/page-defaults';
import { getDefaultLegalPageBlocks } from '@/lib/website-builder/legal-page-defaults';
import {
  Loader2,
  AlertCircle,
  Eye,
  Layout,
  Settings,
  Upload,
  Layers,
  ChevronLeft,
  Check,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

interface PendingChanges {
  header?: HeaderConfig;
  footer?: FooterConfig;
  theme?: ThemeConfig;
  blocks?: BlockInstance[];
  pages?: PageConfig[];
  siteStructure?: SiteStructure;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function WebsiteBuilderPage() {
  const { data: session, status } = useSession();
  const tenantId = session?.user?.tenantId;

  // Queries
  const websiteData = useQuery(
    api.websiteBuilder.getWebsiteBuilder,
    tenantId ? { tenantId } : 'skip'
  );

  // Mutations
  const initializeBuilder = useMutation(api.websiteBuilder.initializeWebsiteBuilder);
  const updateSiteStructureMutation = useMutation(api.websiteBuilder.updateSiteStructure);
  const updateHeader = useMutation(api.websiteBuilder.updateHeader);
  const updateFooter = useMutation(api.websiteBuilder.updateFooter);
  const updateTheme = useMutation(api.websiteBuilder.updateTheme);
  const updateBlocks = useMutation(api.websiteBuilder.updateBlocks);
  const publishWebsite = useMutation(api.websiteBuilder.publishWebsite);
  
  // Page-related mutations
  const updatePagesMutation = useMutation(api.websiteBuilder.updatePages);

  // Modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Local state
  const [localSiteStructure, setLocalSiteStructure] = useState<SiteStructure | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Local builder state (for real-time editing)
  const [localHeader, setLocalHeader] = useState<HeaderConfig | null>(null);
  const [localFooter, setLocalFooter] = useState<FooterConfig | null>(null);
  const [localTheme, setLocalTheme] = useState<ThemeConfig | null>(null);
  const [localBlocks, setLocalBlocks] = useState<BlockInstance[] | null>(null);
  const [localPages, setLocalPages] = useState<PageConfig[] | null>(null);
  
  // Current page state (for multi-page editing)
  const [currentPageId, setCurrentPageId] = useState<string>('home');
  
  // Dirty state tracking for manual save
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});

  // Helper to mark a field as having unsaved changes
  const markDirty = useCallback((field: keyof PendingChanges, value: unknown) => {
    setHasUnsavedChanges(true);
    setPendingChanges(prev => ({ ...prev, [field]: value }));
  }, []);

  // Initialize local state from database
  useEffect(() => {
    if (websiteData?.websiteBuilder) {
      // Set site structure (default to 'multi-page' for backwards compatibility)
      const structure = (websiteData.websiteBuilder.siteStructure as SiteStructure) || 'multi-page';
      setLocalSiteStructure(structure);
      
      // Get header and check if navItems need to be updated to match structure
      const header = websiteData.websiteBuilder.header as HeaderConfig;
      const hasAnchorLinks = header.navItems?.some(item => item.href.startsWith('#'));
      const hasPageLinks = header.navItems?.some(item => item.href.startsWith('/') && !item.href.startsWith('/login') && !item.href.startsWith('/book'));
      
      // Fix mismatched navItems (multi-page with anchor links, or one-pager with page links)
      if ((structure === 'multi-page' && hasAnchorLinks && !hasPageLinks) ||
          (structure === 'one-pager' && hasPageLinks && !hasAnchorLinks)) {
        const fixedHeader = {
          ...header,
          navItems: getDefaultNavItems(structure),
        };
        setLocalHeader(fixedHeader);
        // Auto-save the fix
        markDirty('header', fixedHeader);
      } else {
        setLocalHeader(header);
      }
      
      setLocalFooter(websiteData.websiteBuilder.footer as FooterConfig);
      setLocalTheme(websiteData.websiteBuilder.theme as ThemeConfig);
      setLocalBlocks(websiteData.websiteBuilder.blocks as BlockInstance[]);
      
      // Initialize pages - use default if not present, or populate empty pages with default blocks
      // Only apply for multi-page sites
      if (structure === 'multi-page') {
        const pages = websiteData.websiteBuilder.pages as PageConfig[] | undefined;
        if (pages && pages.length > 0) {
          // Check if any pages have empty blocks and populate them with defaults
          const populatedPages = pages.map(page => {
            if (page.blocks && page.blocks.length > 0) {
              return page; // Page already has blocks
            }
            // Populate with default blocks based on page type
            let defaultBlocks: BlockInstance[] = [];
            if (page.type === 'terms' || page.type === 'privacy') {
              defaultBlocks = getDefaultLegalPageBlocks(page.type);
            } else if (page.type !== 'custom') {
              defaultBlocks = getDefaultBlocksForPageType(page.type);
            }
            return { ...page, blocks: defaultBlocks };
          });
          setLocalPages(populatedPages);
        } else {
          // Use default pages from schema
          setLocalPages(getDefaultPages());
        }
      } else {
        // One-pager doesn't use pages array
        setLocalPages(null);
      }
      
      // Clear dirty state when data is loaded fresh from server
      setHasUnsavedChanges(false);
      setPendingChanges({});
    }
  }, [websiteData]);

  // Navigation guard - warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Auto-open settings modal if no template is selected
  useEffect(() => {
    if (websiteData !== undefined && !websiteData?.websiteBuilder) {
      setShowSettingsModal(true);
    }
  }, [websiteData]);

  // Get current values (local or from database)
  const currentHeader = localHeader || websiteData?.websiteBuilder?.header as HeaderConfig;
  const currentFooter = localFooter || websiteData?.websiteBuilder?.footer as FooterConfig;
  const currentTheme = localTheme || websiteData?.websiteBuilder?.theme as ThemeConfig || DEFAULT_THEME;
  const currentBlocks = localBlocks || (websiteData?.websiteBuilder?.blocks as BlockInstance[]) || [];
  const currentSiteStructure: SiteStructure = localSiteStructure || (websiteData?.websiteBuilder?.siteStructure as SiteStructure) || 'multi-page';
  const currentPages = currentSiteStructure === 'multi-page' 
    ? (localPages || (websiteData?.websiteBuilder?.pages as PageConfig[]) || getDefaultPages())
    : [];
  
  // Get current page configuration
  const currentPage = currentPages.find(p => p.id === currentPageId) || null;
  const currentPageBlocks = currentPage?.blocks || currentBlocks;

  // Handle site structure change
  const handleSiteStructureChange = async (structure: SiteStructure) => {
    if (!tenantId || !session?.user?.email) return;

    setLocalSiteStructure(structure);

    // If builder doesn't exist, initialize it with the chosen structure (immediate save required)
    if (!websiteData?.websiteBuilder) {
      setIsSaving(true);
      try {
        await initializeBuilder({ 
          tenantId, 
          userEmail: session.user.email,
          siteStructure: structure,
        });
        const structureName = structure === 'one-pager' ? 'One-Page Site' : 'Multi-Page Site';
        toast.success(`Website initialized as ${structureName}`);
        
        // If multi-page, initialize with default pages
        if (structure === 'multi-page') {
          setLocalPages(getDefaultPages());
        }
      } catch (error) {
        toast.error('Failed to initialize website builder');
        console.error(error);
      } finally {
        setIsSaving(false);
      }
    } else {
      // Mark as dirty - will be saved with manual save
      markDirty('siteStructure', structure);
      
      // Update header navItems to match the new structure
      const newNavItems = getDefaultNavItems(structure);
      const updatedHeader = {
        ...currentHeader,
        navItems: newNavItems,
      };
      setLocalHeader(updatedHeader);
      markDirty('header', updatedHeader);
      
      // If switching to multi-page, ensure pages are set
      if (structure === 'multi-page' && (!localPages || localPages.length === 0)) {
        setLocalPages(getDefaultPages());
      }
      
      const structureName = structure === 'one-pager' ? 'One-Page Site' : 'Multi-Page Site';
      toast.info(`Changed to ${structureName} - save to apply`);
    }
  };

  // Check if builder is initialized
  const isBuilderInitialized = !!websiteData?.websiteBuilder;

  // Update header (local only - save with manual save)
  const handleHeaderChange = (variant: HeaderVariant) => {
    if (!isBuilderInitialized) {
      toast.error('Please select a template first');
      return;
    }

    const newHeader = { ...(currentHeader || {}), variant } as HeaderConfig;
    setLocalHeader(newHeader);
    markDirty('header', newHeader);
  };

  // Update header config (for color changes)
  const handleHeaderConfigChange = (config: Partial<HeaderConfig>) => {
    if (!isBuilderInitialized) {
      toast.error('Please select a template first');
      return;
    }

    const newHeader = { ...(currentHeader || {}), ...config } as HeaderConfig;
    setLocalHeader(newHeader);
    markDirty('header', newHeader);
  };

  // Update footer (local only - save with manual save)
  const handleFooterChange = (variant: FooterVariant) => {
    if (!isBuilderInitialized) {
      toast.error('Please select a template first');
      return;
    }

    const newFooter = { ...(currentFooter || {}), variant } as FooterConfig;
    setLocalFooter(newFooter);
    markDirty('footer', newFooter);
  };

  // Update footer config (for color changes)
  const handleFooterConfigChange = (config: Partial<FooterConfig>) => {
    if (!isBuilderInitialized) {
      toast.error('Please select a template first');
      return;
    }

    const newFooter = { ...(currentFooter || {}), ...config } as FooterConfig;
    setLocalFooter(newFooter);
    markDirty('footer', newFooter);
  };

  // Update theme (local only - save with manual save)
  const handleThemeChange = useCallback((theme: ThemeConfig) => {
    setLocalTheme(theme);
    
    if (!websiteData?.websiteBuilder) {
      toast.error('Please select a template first');
      return;
    }
    
    markDirty('theme', theme);
  }, [websiteData?.websiteBuilder, markDirty]);

  // Update blocks (local only - save with manual save)
  // Handles both home page blocks and page-specific blocks
  const handleBlocksChange = (blocks: BlockInstance[]) => {
    if (!isBuilderInitialized) return;

    // If editing home page, use the main blocks array
    if (currentPageId === 'home') {
      setLocalBlocks(blocks);
      markDirty('blocks', blocks);
    } else {
      // Update the blocks within the specific page
      const updatedPages = currentPages.map(page => 
        page.id === currentPageId 
          ? { ...page, blocks } 
          : page
      );
      setLocalPages(updatedPages);
      markDirty('pages', updatedPages);
    }
  };

  // Get blocks for current page (helper for handlers)
  const getActiveBlocks = useCallback((): BlockInstance[] => {
    if (currentPageId === 'home') {
      return currentBlocks;
    }
    return currentPageBlocks;
  }, [currentPageId, currentBlocks, currentPageBlocks]);

  // Toggle block enabled state
  const handleToggleBlockEnabled = (blockId: string) => {
    const activeBlocks = getActiveBlocks();
    const newBlocks = activeBlocks.map((block) =>
      block.id === blockId ? { ...block, enabled: !block.enabled } : block
    );
    handleBlocksChange(newBlocks);
  };

  // Update selected block props
  const handleBlockPropsUpdate = (props: Record<string, unknown>) => {
    const activeBlocks = getActiveBlocks();
    if (!selectedBlockId || !activeBlocks.length) return;

    const newBlocks = activeBlocks.map((block) =>
      block.id === selectedBlockId ? { ...block, props } : block
    );

    handleBlocksChange(newBlocks);
  };

  // Update selected block appearance
  const handleBlockAppearanceUpdate = (appearance: import('@/lib/website-builder/schema').BlockAppearance | undefined) => {
    const activeBlocks = getActiveBlocks();
    if (!selectedBlockId || !activeBlocks.length) return;

    const newBlocks = activeBlocks.map((block) =>
      block.id === selectedBlockId ? { ...block, appearance } : block
    );

    handleBlocksChange(newBlocks);
  };

  // Save all pending changes to server
  const saveAllChanges = useCallback(async () => {
    if (!tenantId || !session?.user?.email || !hasUnsavedChanges) return false;
    
    setIsSaving(true);
    try {
      // CRITICAL FIX: Save site structure FIRST and wait for it to complete
      // This mutation updates navigation items to match the structure (hash → page URLs)
      // Must run before header update to prevent race condition
      if (pendingChanges.siteStructure) {
        await updateSiteStructureMutation({ 
          tenantId, 
          siteStructure: pendingChanges.siteStructure, 
          userEmail: session.user.email 
        });
      }
      
      const promises: Promise<unknown>[] = [];
      
      // Only save header if site structure didn't change
      // (updateSiteStructure already handles navigation items conversion)
      if (pendingChanges.header && !pendingChanges.siteStructure) {
        promises.push(updateHeader({ 
          tenantId, 
          header: pendingChanges.header, 
          userEmail: session.user.email 
        }));
      }
      
      // Save footer if changed
      if (pendingChanges.footer) {
        promises.push(updateFooter({ 
          tenantId, 
          footer: pendingChanges.footer, 
          userEmail: session.user.email 
        }));
      }
      
      // Save theme if changed
      if (pendingChanges.theme) {
        const theme = pendingChanges.theme;
        promises.push(updateTheme({
          tenantId,
          theme: {
            primaryColor: theme.primaryColor,
            secondaryColor: theme.secondaryColor,
            accentColor: theme.accentColor,
            backgroundColor: theme.backgroundColor,
            textColor: theme.textColor,
            fontPair: theme.fontPair,
            headingSize: (theme.headingSize || 'medium') as 'small' | 'medium' | 'large',
            sectionSpacing: (theme.sectionSpacing || 'normal') as 'compact' | 'normal' | 'spacious',
            cornerRadius: (theme.cornerRadius || 'medium') as 'none' | 'small' | 'medium' | 'large' | 'full',
            buttonStyle: (theme.buttonStyle || 'solid') as 'solid' | 'outline' | 'ghost',
            colorMode: (theme.colorMode || 'light') as 'light' | 'dark' | 'auto',
          },
          userEmail: session.user.email,
        }));
      }
      
      // Save blocks if changed (home page)
      if (pendingChanges.blocks) {
        promises.push(updateBlocks({ 
          tenantId, 
          blocks: pendingChanges.blocks, 
          userEmail: session.user.email 
        }));
      }
      
      // Save pages if changed
      if (pendingChanges.pages) {
        promises.push(updatePagesMutation({
          tenantId,
          pages: pendingChanges.pages.map(p => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            type: p.type,
            enabled: p.enabled,
            showInHeader: p.showInHeader,
            showInFooter: p.showInFooter,
            blocks: p.blocks,
            order: p.order,
            useDefaultContent: p.useDefaultContent,
          })),
          userEmail: session.user.email,
        }));
      }
      
      await Promise.all(promises);
      
      // Clear dirty state
      setHasUnsavedChanges(false);
      setPendingChanges({});
      toast.success('Draft saved');
      return true;
    } catch (error) {
      toast.error('Failed to save changes');
      console.error('Save error:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    tenantId, 
    session?.user?.email, 
    hasUnsavedChanges, 
    pendingChanges,
    updateSiteStructureMutation,
    updateHeader,
    updateFooter,
    updateTheme,
    updateBlocks,
    updatePagesMutation,
  ]);

  // Publish website
  const handlePublish = async () => {
    if (!tenantId || !session?.user?.email) return;

    // CRITICAL FIX: Auto-save pending changes before publishing
    // This ensures site structure changes are persisted to database
    if (hasUnsavedChanges) {
      toast.info('Saving changes before publish...');
      const saveSuccess = await saveAllChanges();
      if (!saveSuccess) {
        // Error toast already shown by saveAllChanges
        return;
      }
    }

    setIsPublishing(true);
    try {
      await publishWebsite({ tenantId, userEmail: session.user.email });
      toast.success('Website published successfully!');
      // Clear any remaining dirty state after successful publish
      setHasUnsavedChanges(false);
      setPendingChanges({});
    } catch (error) {
      toast.error('Failed to publish website');
      logger.error('Failed to publish website:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  // Save and publish in one action
  const handleSaveAndPublish = async () => {
    if (!tenantId || !session?.user?.email) return;

    // First save any pending changes
    if (hasUnsavedChanges) {
      const saveSuccess = await saveAllChanges();
      if (!saveSuccess) return;
    }

    // Then publish
    await handlePublish();
  };

  // =============================================================================
  // PAGE MANAGEMENT HANDLERS
  // =============================================================================

  // Update pages (local only - save with manual save)
  const handlePagesChange = useCallback((pages: PageConfig[]) => {
    setLocalPages(pages);
    markDirty('pages', pages);
  }, [markDirty]);

  // Handle page navigation (from preview clicks or page selector)
  const handleNavigate = useCallback((pageId: string) => {
    // Find the page matching this ID or slug
    const targetPage = currentPages.find(p => 
      p.id === pageId || 
      p.slug === pageId || 
      `/${p.slug}` === pageId
    );
    if (targetPage) {
      setCurrentPageId(targetPage.id);
      toast.info(`Editing: ${targetPage.title}`);
    } else if (pageId === 'home' || pageId === '/' || pageId === '/home') {
      setCurrentPageId('home');
      toast.info('Editing: Home');
    } else {
      // Try to match by pageId directly (from header links)
      setCurrentPageId(pageId);
    }
  }, [currentPages]);

  // =============================================================================
  // FOOTER SOCIAL LINKS HANDLER
  // =============================================================================

  // Update social links (local only - save with manual save)
  const handleUpdateSocialLinksWithShow = useCallback((socialLinks: SocialLink[], showSocial: boolean) => {
    const newFooter = {
      ...(localFooter || {}),
      socialLinks,
      showSocial,
    } as FooterConfig;
    
    setLocalFooter(newFooter);
    markDirty('footer', newFooter);
  }, [localFooter, markDirty]);

  // Update external links (local only - save with manual save)
  const handleUpdateExternalLinks = useCallback((links: { id: string; label: string; url: string; openInNewTab?: boolean }[]) => {
    // Ensure openInNewTab is always a boolean (default true)
    const normalizedLinks = links.map(link => ({
      ...link,
      openInNewTab: link.openInNewTab ?? true,
    }));
    
    const newFooter = {
      ...(localFooter || {}),
      externalLinks: normalizedLinks,
    } as FooterConfig;
    
    setLocalFooter(newFooter);
    markDirty('footer', newFooter);
  }, [localFooter, markDirty]);

  // Loading state
  if (status === 'loading' || (tenantId && websiteData === undefined)) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-interactive-primary" />
            <p className="mt-2 text-text-secondary">Loading website builder...</p>
          </div>
        </div>
      </ClinicLayout>
    );
  }

  // Auth check
  if (status === 'unauthenticated' || !tenantId || !session?.user) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto text-status-warning" />
            <h2 className="text-2xl font-bold text-text-primary">Access Denied</h2>
            <p className="text-text-secondary">Please sign in to access the website builder.</p>
          </div>
        </div>
      </ClinicLayout>
    );
  }

  // Permission check: Only clinic users (owners/admins/clinic_user) can access website builder
  // Owners have full access, others need appropriate permissions
  const userRole = session.user.role;
  const isClinicUser = userRole === 'clinic_user' || userRole === 'admin' || userRole === 'provider' || session.user.isOwner;
  
  if (!isClinicUser) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto text-status-warning" />
            <h2 className="text-2xl font-bold text-text-primary">Access Denied</h2>
            <p className="text-text-secondary">You don&apos;t have permission to edit website settings. Only clinic staff can access the website builder.</p>
          </div>
        </div>
      </ClinicLayout>
    );
  }

  // Get blocks for the active page
  const activePageBlocks = currentPageId === 'home' ? currentBlocks : (currentPageBlocks ?? []);
  
  // Get selected block for config panel
  const selectedBlock = activePageBlocks?.find((b) => b.id === selectedBlockId) || null;
  const isPublished = !!websiteData?.websiteBuilder?.publishedAt;
  const hasWebsite = !!websiteData?.websiteBuilder;

  return (
    <ClinicLayout hideNavigation hideHeader contentClassName="!pt-0 !pb-0 !px-0">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-surface-elevated border-b border-border-primary flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton href="/company/settings" />
            <div>
              <h1 className="text-xl font-bold text-text-primary">Website Builder</h1>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span>{websiteData?.name || 'Your Clinic'}</span>
                <span>•</span>
                <span className="font-medium text-interactive-primary">
                  {currentPage?.title || 'Home'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Settings button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettingsModal(true)}
                    className="h-9 w-9"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Site Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Structure button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowStructureModal(true)}
                    disabled={!hasWebsite}
                    className="h-9 w-9"
                  >
                    <Layers className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Structure Navigator</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Divider */}
            <div className="w-px h-6 bg-border-primary mx-1" />

            {/* Preview button */}
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={!isBuilderInitialized}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>

            {/* Contextual Save/Publish button */}
            {(() => {
              // Determine button state
              if (isSaving) {
                return (
                  <Button disabled className="bg-amber-500 hover:bg-amber-600 text-white min-w-[140px]">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </Button>
                );
              }
              
              if (isPublishing) {
                return (
                  <Button disabled className="bg-interactive-primary text-white min-w-[140px]">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </Button>
                );
              }
              
              if (hasUnsavedChanges) {
                // Has unsaved changes - show Save Draft or Save & Publish
                if (isPublished) {
                  return (
                    <Button
                      onClick={handleSaveAndPublish}
                      disabled={!isBuilderInitialized}
                      className="bg-amber-500 hover:bg-amber-600 text-white min-w-[140px]"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Save & Publish
                    </Button>
                  );
                }
                return (
                  <Button
                    onClick={saveAllChanges}
                    disabled={!isBuilderInitialized}
                    className="bg-amber-500 hover:bg-amber-600 text-white min-w-[140px]"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>
                );
              }
              
              if (isPublished) {
                // Published and no changes - show Published (disabled state)
                return (
                  <Button
                    disabled
                    className="bg-status-success hover:bg-status-success text-white min-w-[140px]"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Published
                  </Button>
                );
              }
              
              // Draft with no unsaved changes - show Publish
              return (
                <Button
                  onClick={handlePublish}
                  disabled={!isBuilderInitialized}
                  className="bg-interactive-primary hover:bg-interactive-primary-hover min-w-[140px]"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Publish
                </Button>
              );
            })()}
          </div>
        </div>

        {/* Main Content - 2 Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Shows Block List, Block Config, or Header/Footer Panel */}
          <div className="w-80 border-r border-border-primary bg-surface-elevated flex flex-col overflow-hidden">
            {/* Header Block Panel */}
            {selectedBlockId === 'header' && currentHeader ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Back button header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border-primary">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedBlockId(null)}
                    className="gap-2 text-text-secondary hover:text-text-primary"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Page Blocks
                  </Button>
                </div>
                {/* Header panel content */}
                <div className="flex-1 overflow-y-auto">
                  <HeaderBlockPanel
                    headerConfig={currentHeader}
                    onHeaderChange={handleHeaderChange}
                    onHeaderConfigChange={handleHeaderConfigChange}
                    pages={currentPages}
                    siteStructure={currentSiteStructure}
                    onPagesChange={handlePagesChange}
                    disabled={isSaving}
                  />
                </div>
              </div>
            ) : selectedBlockId === 'footer' && currentFooter ? (
              /* Footer Block Panel */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Back button header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border-primary">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedBlockId(null)}
                    className="gap-2 text-text-secondary hover:text-text-primary"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Page Blocks
                  </Button>
                </div>
                {/* Footer panel content */}
                <div className="flex-1 overflow-y-auto">
                  <FooterBlockPanel
                    footerConfig={currentFooter}
                    theme={currentTheme}
                    onFooterChange={handleFooterChange}
                    onFooterConfigChange={handleFooterConfigChange}
                    onSocialLinksChange={handleUpdateSocialLinksWithShow}
                    onExternalLinksChange={handleUpdateExternalLinks}
                    pages={currentPages}
                    onPagesChange={handlePagesChange}
                    disabled={isSaving}
                  />
                </div>
              </div>
            ) : selectedBlockId && selectedBlock ? (
              /* Block Config Panel - Full sidebar when regular block is selected */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Back button header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border-primary">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedBlockId(null)}
                    className="gap-2 text-text-secondary hover:text-text-primary"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Page Blocks
                  </Button>
                </div>
                {/* Block config content */}
                <div className="flex-1 overflow-y-auto">
                  <BlockConfigPanel
                    block={selectedBlock}
                    onUpdate={handleBlockPropsUpdate}
                    onAppearanceUpdate={handleBlockAppearanceUpdate}
                    onClose={() => setSelectedBlockId(null)}
                  />
                </div>
              </div>
            ) : (
              /* Block List - Full sidebar when no block selected */
              <div className="flex-1 flex flex-col min-h-0 p-4">
                {hasWebsite ? (
                  <BlockCanvas
                    blocks={activePageBlocks}
                    onBlocksChange={handleBlocksChange}
                    selectedBlockId={selectedBlockId}
                    onSelectBlock={setSelectedBlockId}
                    pageType={currentPage?.type || 'home'}
                    headerVariant={currentHeader?.variant}
                    footerVariant={currentFooter?.variant}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-text-tertiary">
                    <Layout className="w-12 h-12 mb-3 opacity-50" />
                    <p className="font-medium">No website configured</p>
                    <p className="text-sm mt-1">
                      Click the Settings icon to get started
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setShowSettingsModal(true)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Open Settings
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview Area */}
          <div className="flex-1 overflow-auto bg-background-secondary">
            {isBuilderInitialized && currentHeader && currentFooter ? (
              <LivePreview
                templateId="classic-stacked"
                header={currentHeader}
                footer={currentFooter}
                theme={currentTheme}
                blocks={activePageBlocks}
                tenantName={websiteData?.name}
                tenantId={tenantId}
                logoUrl={websiteData?.branding?.logo}
                contactInfo={websiteData?.contactInfo}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
                onNavigateToPage={handleNavigate}
                pages={currentPages}
                activePageId={currentPageId}
                siteStructure={currentSiteStructure}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-text-tertiary">
                <div className="text-center">
                  <Layout className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Configure your website</p>
                  <p className="text-sm">Open settings to choose a template and get started</p>
                  <Button
                    className="mt-4 bg-interactive-primary hover:bg-interactive-primary-hover"
                    onClick={() => setShowSettingsModal(true)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Open Settings
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        siteStructure={currentSiteStructure}
        headerConfig={currentHeader}
        footerConfig={currentFooter}
        theme={currentTheme}
        onStructureChange={handleSiteStructureChange}
        onHeaderChange={handleHeaderChange}
        onFooterChange={handleFooterChange}
        onHeaderConfigChange={handleHeaderConfigChange}
        onFooterConfigChange={handleFooterConfigChange}
        onThemeChange={handleThemeChange}
        disabled={isSaving}
        // Page management props (only relevant for multi-page)
        pages={currentPages}
        onPagesChange={handlePagesChange}
        onEditPage={handleNavigate}
        // Navigation settings props
        onSocialLinksChange={handleUpdateSocialLinksWithShow}
        onExternalLinksChange={handleUpdateExternalLinks}
      />

      {/* Structure Modal */}
      <StructureModal
        open={showStructureModal}
        onOpenChange={setShowStructureModal}
        blocks={activePageBlocks}
        headerVariant={currentHeader?.variant}
        footerVariant={currentFooter?.variant}
        selectedBlockId={selectedBlockId}
        onSelectBlock={setSelectedBlockId}
        onBlocksChange={handleBlocksChange}
        onToggleBlockEnabled={handleToggleBlockEnabled}
      />

      {/* Full-screen Preview Modal */}
      {showPreview && isBuilderInitialized && currentHeader && currentFooter && (
        <LivePreview
          templateId="classic-stacked"
          header={currentHeader}
          footer={currentFooter}
          theme={currentTheme}
          blocks={activePageBlocks}
          tenantName={websiteData?.name}
          tenantId={tenantId}
          logoUrl={websiteData?.branding?.logo}
          contactInfo={websiteData?.contactInfo}
          isFullscreen
          onClose={() => setShowPreview(false)}
          onToggleFullscreen={() => setShowPreview(false)}
          onNavigateToPage={handleNavigate}
          pages={currentPages}
          activePageId={currentPageId}
          siteStructure={currentSiteStructure}
        />
      )}
    </ClinicLayout>
  );
}
