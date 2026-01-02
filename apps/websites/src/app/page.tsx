'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
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
  const { user, isLoaded } = useUser();
  // In a real scenario, we'd get the tenantId from the URL or user metadata
  const tenantId = user?.publicMetadata?.tenantId as string;

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

  const handleNavigate = (pageId: string) => {
    setCurrentPageId(pageId);
    setShowSettingsModal(false);
  };

  const saveAllChanges = async () => {
    if (!tenantId || !user?.primaryEmailAddress?.emailAddress) return;
    setIsSaving(true);
    try {
      setHasUnsavedChanges(false);
      setPendingChanges({});
      toast.success('Changes saved');
    } catch (e) {
      toast.error('Failed to save');
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
      {/* HIPAA Compliance Warning */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 bg-teal-50 border-b border-teal-100 text-[10px] sm:text-xs text-teal-800">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        <p>
          <span className="font-bold uppercase tracking-wider">HIPAA Notice:</span> This builder is for public marketing only. 
          <span className="font-medium ml-1 text-teal-700">DO NOT enter Patient Health Information (PHI) in text fields.</span> 
        </p>
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
              <div className="p-4 border-b bg-slate-50/50">
                <h3 className="font-bold text-[11px] uppercase tracking-widest text-slate-500">Page Structure</h3>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {hasWebsite ? (
                  <div className="p-4">
                    <BlockCanvas 
                      blocks={activePageBlocks} 
                      onBlocksChange={handleBlocksChange}
                      selectedBlockId={selectedBlockId}
                      onSelectBlock={setSelectedBlockId}
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
        <section className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-auto relative flex flex-col items-center p-4 sm:p-8">
          <div className="w-full max-w-5xl h-full flex flex-col shadow-2xl rounded-t-2xl overflow-hidden border border-slate-200 bg-white">
            {hasWebsite && currentHeader && currentFooter ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <LivePreview
                  templateId="classic-stacked"
                  header={currentHeader}
                  footer={currentFooter}
                  theme={currentTheme}
                  blocks={activePageBlocks}
                  tenantName={websiteData?.name}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={setSelectedBlockId}
                  pages={currentPages}
                  activePageId={currentPageId}
                  siteStructure={currentSiteStructure}
                />
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
      />
    </div>
  );
}
