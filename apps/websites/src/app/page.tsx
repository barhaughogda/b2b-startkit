'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  BlockCanvas,
  BlockConfigPanel,
  LivePreview,
  SettingsModal,
  StructureModal,
  HeaderBlockPanel,
  FooterBlockPanel,
  MigrationPrompt,
} from '@/components/website-builder';
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
  Sparkles,
  RefreshCw,
  Monitor,
  Tablet,
  Smartphone,
  FileText,
  Home,
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

export default function WebsiteBuilderPage({
  params,
  searchParams,
  tenantId: propTenantId,
}: {
  params?: Promise<any>;
  searchParams?: Promise<any>;
  tenantId?: string;
}) {
  const { user, isLoaded } = useUser();
  const rawSearchParams = useSearchParams();
  
  // Unwrap params and searchParams to satisfy Next.js 15 requirements
  const resolvedParams = params ? React.use(params) : {};
  const resolvedSearchParams = searchParams ? React.use(searchParams) : {};

  // Resolve tenantId: 1. Prop, 2. URL search param (Promise), 3. URL search param (hook), 4. User metadata
  const tenantId = 
    propTenantId || 
    (resolvedSearchParams.tenantId as string) || 
    rawSearchParams.get('tenantId') || 
    (user?.publicMetadata?.tenantId as string);

  // Check if Convex is effectively enabled
  const isConvexEnabled = process.env.NEXT_PUBLIC_CONVEX_URL && 
                         !process.env.NEXT_PUBLIC_CONVEX_URL.includes('dummy') &&
                         !process.env.NEXT_PUBLIC_CONVEX_URL.includes('your-') &&
                         process.env.NEXT_PUBLIC_CONVEX_URL.startsWith('http');

  // Queries
  const websiteData = useQuery(
    (api as any).websiteBuilder?.getWebsiteBuilder,
    tenantId && isConvexEnabled ? { tenantId } : 'skip'
  );

  const migrationStatus = useQuery(
    (api as any).websiteBuilder?.checkMigrationStatus,
    tenantId && isConvexEnabled ? { tenantId } : 'skip'
  );

  // Mutations
  const initializeBuilder = useMutation((api as any).websiteBuilder?.initializeWebsiteBuilder);
  const updateSiteStructureMutation = useMutation((api as any).websiteBuilder?.updateSiteStructure);
  const updateHeader = useMutation((api as any).websiteBuilder?.updateHeader);
  const updateFooter = useMutation((api as any).websiteBuilder?.updateFooter);
  const updateTheme = useMutation((api as any).websiteBuilder?.updateTheme);
  const updateBlocks = useMutation((api as any).websiteBuilder?.updateBlocks);
  const publishWebsite = useMutation((api as any).websiteBuilder?.publishWebsite);
  
  // Page-related mutations
  const updatePagesMutation = useMutation((api as any).websiteBuilder?.updatePages);

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
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  
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
      const structure = (websiteData.websiteBuilder.siteStructure as SiteStructure) || 'multi-page';
      setLocalSiteStructure(structure);
      
      const header = websiteData.websiteBuilder.header as HeaderConfig;
      setLocalHeader(header);
      setLocalFooter(websiteData.websiteBuilder.footer as FooterConfig);
      setLocalTheme(websiteData.websiteBuilder.theme as ThemeConfig);
      setLocalBlocks(websiteData.websiteBuilder.blocks as BlockInstance[]);
      
      if (structure === 'multi-page') {
        const pages = websiteData.websiteBuilder.pages as PageConfig[] | undefined;
        if (pages && pages.length > 0) {
          setLocalPages(pages);
        } else {
          setLocalPages(getDefaultPages());
        }
      } else {
        setLocalPages(null);
      }
      
      setHasUnsavedChanges(false);
      setPendingChanges({});
    }
  }, [websiteData]);

  // Auto-initialize if no website exists and no migration needed
  useEffect(() => {
    const shouldAutoInit = 
      isLoaded && 
      tenantId && 
      websiteData !== undefined && 
      websiteData?.websiteBuilder === null && 
      migrationStatus !== undefined && 
      !migrationStatus?.needsMigration &&
      !isSaving;

    if (shouldAutoInit) {
      const init = async () => {
        try {
          setIsSaving(true); // Reuse isSaving to prevent multiple calls
          await initializeBuilder({
            tenantId,
            userEmail: user?.primaryEmailAddress?.emailAddress || '',
            siteStructure: 'multi-page'
          });
          toast.success('Website initialized with defaults');
        } catch (error) {
          logger.error('Failed to auto-initialize website:', error);
        } finally {
          setIsSaving(false);
        }
      };
      init();
    }
  }, [isLoaded, tenantId, websiteData, migrationStatus, initializeBuilder, user, isSaving]);

  // Get current values
  const currentHeader = localHeader || websiteData?.websiteBuilder?.header as HeaderConfig;
  const currentFooter = localFooter || websiteData?.websiteBuilder?.footer as FooterConfig;
  const currentTheme = localTheme || websiteData?.websiteBuilder?.theme as ThemeConfig || DEFAULT_THEME;
  const currentBlocks = localBlocks || (websiteData?.websiteBuilder?.blocks as BlockInstance[]) || [];
  const currentSiteStructure: SiteStructure = localSiteStructure || (websiteData?.websiteBuilder?.siteStructure as SiteStructure) || 'multi-page';
  const currentPages = currentSiteStructure === 'multi-page' 
    ? (localPages || (websiteData?.websiteBuilder?.pages as PageConfig[]) || getDefaultPages())
    : [];
  
  const currentPage = currentPages.find(p => p.id === currentPageId) || null;
  const activePageBlocks = currentPageId === 'home' ? currentBlocks : (currentPage?.blocks ?? []);
  
  const selectedBlock = activePageBlocks?.find((b) => b.id === selectedBlockId) || null;
  const isPublished = !!websiteData?.websiteBuilder?.publishedAt;
  const hasWebsite = !!websiteData?.websiteBuilder;

  // Placeholder handlers
  const handleSiteStructureChange = async (structure: SiteStructure) => {
    if (!tenantId || !user?.primaryEmailAddress?.emailAddress) return;
    setLocalSiteStructure(structure);
    markDirty('siteStructure', structure);
  };

  const handleHeaderChange = (variant: HeaderVariant) => {
    const newHeader = { ...(currentHeader || {}), variant } as HeaderConfig;
    setLocalHeader(newHeader);
    markDirty('header', newHeader);
  };

  const handleFooterChange = (variant: FooterVariant) => {
    const newFooter = { ...(currentFooter || {}), variant } as FooterConfig;
    setLocalFooter(newFooter);
    markDirty('footer', newFooter);
  };

  const handleBlocksChange = (blocks: BlockInstance[]) => {
    if (currentPageId === 'home') {
      setLocalBlocks(blocks);
      markDirty('blocks', blocks);
    } else {
      const updatedPages = currentPages.map(page => 
        page.id === currentPageId ? { ...page, blocks } : page
      );
      setLocalPages(updatedPages);
      markDirty('pages', updatedPages);
    }
  };

  const handleHeaderConfigChange = (config: Partial<HeaderConfig>) => {
    const newHeader = { ...(currentHeader || {}), ...config } as HeaderConfig;
    setLocalHeader(newHeader);
    markDirty('header', newHeader);
  };

  const handleFooterConfigChange = (config: Partial<FooterConfig>) => {
    const newFooter = { ...(currentFooter || {}), ...config } as FooterConfig;
    setLocalFooter(newFooter);
    markDirty('footer', newFooter);
  };

  const handleSocialLinksChange = (socialLinks: SocialLink[], showSocial: boolean) => {
    const newFooter = { ...(currentFooter || {}), socialLinks, showSocial } as FooterConfig;
    setLocalFooter(newFooter);
    markDirty('footer', newFooter);
  };

  const handleExternalLinksChange = (externalLinks: import('@/lib/website-builder/schema').ExternalLink[]) => {
    const newFooter = { ...(currentFooter || {}), externalLinks } as FooterConfig;
    setLocalFooter(newFooter);
    markDirty('footer', newFooter);
  };

  const handleThemeChange = (theme: ThemeConfig) => {
    setLocalTheme(theme);
    markDirty('theme', theme);
  };

  const handlePagesChange = (pages: PageConfig[]) => {
    setLocalPages(pages);
    markDirty('pages', pages);
  };

  const handleToggleBlockEnabled = (blockId: string) => {
    const activeBlocks = getActiveBlocks();
    const newBlocks = activeBlocks.map(b => 
      b.id === blockId ? { ...b, enabled: !b.enabled } : b
    );
    handleBlocksChange(newBlocks);
  };

  const handleNavigate = (pageId: string) => {
    setCurrentPageId(pageId);
    setShowSettingsModal(false);
  };

  const saveAllChanges = async () => {
    if (!tenantId || !user?.primaryEmailAddress?.emailAddress) return;
    const userEmail = user.primaryEmailAddress.emailAddress;
    
    setIsSaving(true);
    try {
      const promises: Promise<any>[] = [];

      if (pendingChanges.siteStructure) {
        promises.push(updateSiteStructureMutation({
          tenantId,
          userEmail,
          siteStructure: pendingChanges.siteStructure,
        }));
      }

      if (pendingChanges.header) {
        promises.push(updateHeader({
          tenantId,
          userEmail,
          header: pendingChanges.header,
        }));
      }

      if (pendingChanges.footer) {
        promises.push(updateFooter({
          tenantId,
          userEmail,
          footer: pendingChanges.footer,
        }));
      }

      if (pendingChanges.theme) {
        promises.push(updateTheme({
          tenantId,
          userEmail,
          theme: pendingChanges.theme,
        }));
      }

      if (pendingChanges.blocks) {
        promises.push(updateBlocks({
          tenantId,
          userEmail,
          blocks: pendingChanges.blocks,
        }));
      }

      if (pendingChanges.pages) {
        promises.push(updatePagesMutation({
          tenantId,
          userEmail,
          pages: pendingChanges.pages,
        }));
      }

      await Promise.all(promises);
      
      setHasUnsavedChanges(false);
      setPendingChanges({});
      toast.success('Changes saved');
    } catch (e) {
      logger.error('Failed to save changes:', e);
      toast.error('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getActiveBlocks = useCallback((): BlockInstance[] => {
    if (currentPageId === 'home') {
      return currentBlocks;
    }
    return activePageBlocks;
  }, [currentPageId, currentBlocks, activePageBlocks]);

  if (!isLoaded) return <div className="flex items-center justify-center h-screen bg-white"><Loader2 className="animate-spin text-teal-600 w-10 h-10" /></div>;

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 overflow-hidden">
      {/* HIPAA Compliance Warning & Debug Info */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-1.5 bg-teal-50 border-b border-teal-100 text-[10px] sm:text-xs text-teal-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <p>
            <span className="font-bold uppercase tracking-wider">HIPAA Notice:</span> This builder is for public marketing only. 
            <span className="font-medium ml-1 text-teal-700">DO NOT enter Patient Health Information (PHI) in text fields.</span> 
          </p>
        </div>
        {tenantId && (
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="font-bold uppercase">Org ID:</span>
            <code className="bg-teal-100 px-1 rounded">{tenantId}</code>
          </div>
        )}
      </div>

      {/* Header */}
      <header className="flex-shrink-0 px-4 py-3 border-b flex items-center justify-between bg-white z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-teal-600 p-1.5 rounded-lg">
            <Layout className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Website Builder</h1>
            <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              {websiteData?.name || 'Clinic Website'} • <span className="text-teal-600">{currentPage?.title || 'Home'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-600" onClick={() => setShowSettingsModal(true)}>
                  <Settings className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-600" onClick={() => setShowStructureModal(true)} disabled={!hasWebsite}>
                  <Layers className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Structure</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="w-px h-6 bg-slate-200 mx-1" />
          
          <Button variant="outline" size="sm" className="h-9 border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => setShowPreview(true)} disabled={!hasWebsite}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          
          <Button 
            size="sm" 
            className="h-9 bg-teal-600 hover:bg-teal-700 text-white shadow-sm min-w-[120px]"
            onClick={saveAllChanges} 
            disabled={!hasUnsavedChanges || isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {hasUnsavedChanges ? 'Save Draft' : 'Saved'}
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-row overflow-hidden min-h-0 relative bg-slate-100/50">
        {/* Left Sidebar */}
        <aside className="w-80 border-r bg-white flex flex-col overflow-hidden flex-shrink-0 shadow-sm z-10">
          {selectedBlockId && selectedBlock ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center bg-slate-50/80">
                <Button variant="ghost" size="sm" onClick={() => setSelectedBlockId(null)} className="h-8 gap-1.5 px-2 text-slate-600 hover:text-slate-900">
                  <ChevronLeft className="w-4 h-4" /> 
                  <span className="text-xs font-semibold uppercase tracking-wider">Back to Blocks</span>
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <BlockConfigPanel 
                  block={selectedBlock} 
                  onUpdate={(props) => {
                    const activeBlocks = getActiveBlocks();
                    const newBlocks = activeBlocks.map(b => b.id === selectedBlockId ? { ...b, props } : b);
                    handleBlocksChange(newBlocks);
                  }}
                  onClose={() => setSelectedBlockId(null)} 
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {hasWebsite ? (
                  <div className="p-4">
                    <BlockCanvas 
                      blocks={activePageBlocks} 
                      onBlocksChange={handleBlocksChange}
                      selectedBlockId={selectedBlockId}
                      onSelectBlock={setSelectedBlockId}
                      pageType={currentPage?.type || 'home'}
                      headerVariant={currentHeader?.variant}
                      footerVariant={currentFooter?.variant}
                    />
                  </div>
                ) : migrationStatus?.needsMigration ? (
                  <div className="p-4">
                    <MigrationPrompt 
                      tenantId={tenantId}
                      userEmail={user?.primaryEmailAddress?.emailAddress || ''}
                      onMigrationComplete={() => {
                        // The useQuery will automatically refetch
                        toast.success('Website migrated successfully');
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 mt-12">
                    <div className="bg-slate-100 p-5 rounded-full mb-4">
                      <Layout className="w-10 h-10 text-slate-400" />
                    </div>
                    <p className="font-bold text-slate-900">No site configuration</p>
                    <p className="text-xs text-slate-500 mt-2 mb-6 px-4">Choose a template to get started building your clinic website.</p>
                    <Button variant="default" size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => setShowSettingsModal(true)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Setup Website
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Right Preview Area */}
        <section className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-hidden relative flex flex-col items-center p-4 sm:p-8">
          {/* Preview Toolbar (Restored) */}
          <div className="w-full max-w-5xl flex items-center justify-between px-4 py-2 bg-white border border-b-0 border-slate-200 rounded-t-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500">Preview</span>
              {currentSiteStructure === 'multi-page' && currentPages.length > 0 && (
                <>
                  <div className="w-px h-4 bg-slate-200" />
                  <Select value={currentPageId} onValueChange={handleNavigate}>
                    <SelectTrigger className="w-[160px] h-8 text-xs font-medium bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Select page" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentPages.filter(p => p.enabled).map((page) => (
                        <SelectItem key={page.id} value={page.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            {page.type === 'home' ? <Home className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                            {page.title}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            {/* Device Toggles */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 scale-90 origin-right">
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-7 w-7 transition-colors", viewport === 'desktop' ? "bg-white shadow-sm text-teal-600" : "text-slate-400")}
                onClick={() => setViewport('desktop')}
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-7 w-7 transition-colors", viewport === 'tablet' ? "bg-white shadow-sm text-teal-600" : "text-slate-400")}
                onClick={() => setViewport('tablet')}
              >
                <Tablet className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-7 w-7 transition-colors", viewport === 'mobile' ? "bg-white shadow-sm text-teal-600" : "text-slate-400")}
                onClick={() => setViewport('mobile')}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="w-full max-w-5xl flex-1 flex flex-col shadow-2xl rounded-b-2xl overflow-hidden border border-slate-200 bg-white">
            {hasWebsite && currentHeader && currentFooter ? (
              <LivePreview
                templateId="classic-stacked"
                header={currentHeader}
                footer={currentFooter}
                theme={currentTheme}
                blocks={activePageBlocks}
                tenantName={websiteData?.name}
                tenantId={tenantId}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
                pages={currentPages}
                activePageId={currentPageId}
                onNavigateToPage={handleNavigate}
                siteStructure={currentSiteStructure}
                hideToolbar={true} // New prop to hide internal toolbar
                viewport={viewport}
                onViewportChange={setViewport}
              />
            ) : migrationStatus?.needsMigration ? (
              <div className="flex flex-col items-center justify-center h-full p-12 text-center bg-slate-50/30">
                <div className="max-w-md">
                  <div className="bg-amber-100 p-6 rounded-3xl shadow-sm inline-block mb-8 border border-amber-200">
                    <RefreshCw className="w-12 h-12 text-amber-600 animate-spin-slow" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Upgrade Available</h2>
                  <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                    We've detected an existing landing page. You can migrate it to the new Website Builder 
                    to unlock advanced customization, multiple pages, and a drag-and-drop editor.
                  </p>
                  <div className="bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 text-left mb-8">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">What's included in the upgrade:</h4>
                    <ul className="space-y-3">
                      {[
                        'Professional Multi-page Support',
                        'Drag-and-Drop Block Management',
                        'Real-time Visual Preview',
                        'Version History & Rollback'
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                          <Check className="w-4 h-4 text-teal-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-12 text-center bg-slate-50/30">
                <div className="max-w-sm">
                  <div className="bg-white p-6 rounded-3xl shadow-sm inline-block mb-8 border border-slate-100">
                    <Sparkles className="w-12 h-12 text-teal-500 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Your New Website</h2>
                  <p className="text-sm text-slate-500 mb-10 leading-relaxed">
                    Ready to launch your clinic online? Pick a template and start customizing your marketing site in minutes.
                  </p>
                  <Button 
                    className="bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-600/20 px-10 h-12 rounded-full font-bold text-base"
                    onClick={() => setShowSettingsModal(true)}
                  >
                    Start Designing
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modals */}
      <SettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        siteStructure={currentSiteStructure}
        headerConfig={currentHeader}
        footerConfig={currentFooter}
        theme={currentTheme}
        pages={currentPages}
        onStructureChange={handleSiteStructureChange}
        onHeaderChange={handleHeaderChange}
        onFooterChange={handleFooterChange}
        onHeaderConfigChange={handleHeaderConfigChange}
        onFooterConfigChange={handleFooterConfigChange}
        onThemeChange={handleThemeChange}
        onPagesChange={handlePagesChange}
        onSocialLinksChange={handleSocialLinksChange}
        onExternalLinksChange={handleExternalLinksChange}
        onEditPage={handleNavigate}
      />
      
      <StructureModal
        open={showStructureModal}
        onOpenChange={setShowStructureModal}
        blocks={activePageBlocks}
        onSelectBlock={setSelectedBlockId}
        onBlocksChange={handleBlocksChange}
        onToggleBlockEnabled={handleToggleBlockEnabled}
      />
    </div>
  );
}
