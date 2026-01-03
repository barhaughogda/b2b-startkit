'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  TemplateId,
  HeaderConfig,
  FooterConfig,
  ThemeConfig,
  BlockInstance,
  PageConfig,
} from '@/lib/website-builder/schema';
import type { PreviewData } from '@/lib/website-builder/preview-messages';
import { isValidPreviewMessage, isMessageFromSameOrigin } from '@/lib/website-builder/preview-messages';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { Monitor, Tablet, Smartphone, X, Maximize2, FileText, Home, RotateCw } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

interface LivePreviewProps {
  templateId: TemplateId;
  header: HeaderConfig;
  footer: FooterConfig;
  theme: ThemeConfig;
  blocks: BlockInstance[];
  tenantName?: string;
  tenantId?: string;
  logoUrl?: string;
  contactInfo?: {
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  selectedBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  // Page navigation support
  pages?: PageConfig[];
  activePageId?: string;
  onNavigateToPage?: (pageId: string) => void;
  // Site structure for footer link resolution
  siteStructure?: 'one-pager' | 'multi-page';
  basePath?: string;
  hideToolbar?: boolean;
  viewport?: ViewportSize;
  onViewportChange?: (viewport: ViewportSize) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PREVIEW_STORAGE_KEY = 'website-builder-preview-data';

const viewportConfig: Record<ViewportSize, { width: number; height: number; label: string }> = {
  desktop: { width: 1280, height: 800, label: 'Desktop (1280×800)' },
  tablet: { width: 768, height: 1024, label: 'Tablet (768×1024)' },
  mobile: { width: 375, height: 667, label: 'Mobile (375×667)' },
};

const viewportIcons: Record<ViewportSize, React.ComponentType<{ className?: string }>> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

// =============================================================================
// PAGE SELECTOR COMPONENT
// =============================================================================

interface PageSelectorProps {
  pages: PageConfig[];
  activePageId?: string;
  onSelectPage: (pageId: string) => void;
}

function PageSelector({ pages, activePageId, onSelectPage }: PageSelectorProps) {
  const enabledPages = pages.filter(p => p.enabled);

  if (enabledPages.length <= 1) {
    return null;
  }

  return (
    <Select value={activePageId || 'home'} onValueChange={onSelectPage}>
      <SelectTrigger className="w-[180px] h-8 text-sm">
        <SelectValue placeholder="Select page" />
      </SelectTrigger>
      <SelectContent>
        {enabledPages.map((page) => (
          <SelectItem key={page.id} value={page.id}>
            <div className="flex items-center gap-2">
              {page.type === 'home' ? (
                <Home className="w-3.5 h-3.5" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              {page.title}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function LivePreview({
  templateId,
  header,
  footer,
  theme,
  blocks,
  tenantName,
  tenantId,
  logoUrl,
  contactInfo,
  selectedBlockId,
  onSelectBlock,
  onClose,
  isFullscreen,
  onToggleFullscreen,
  pages = [],
  activePageId,
  onNavigateToPage,
  siteStructure,
  basePath = '',
  hideToolbar,
  viewport: propViewport,
  onViewportChange,
}: LivePreviewProps) {
  const [internalViewport, setInternalViewport] = useState<ViewportSize>('desktop');
  const viewport = propViewport || internalViewport;
  const setViewport = onViewportChange || setInternalViewport;

  const [isLoading, setIsLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Build preview data object (memoized to prevent unnecessary re-renders)
  const previewData: PreviewData = useMemo(() => ({
    templateId,
    header,
    footer,
    theme,
    blocks,
    tenantName,
    tenantId,
    logoUrl,
    contactInfo,
    pages,
    activePageId,
    selectedBlockId,
    siteStructure,
    basePath,
  }), [templateId, header, footer, theme, blocks, tenantName, tenantId, logoUrl, contactInfo, pages, activePageId, selectedBlockId, siteStructure, basePath]);

  // Store preview data in sessionStorage BEFORE iframe renders
  // Wait for tenantId to be available before marking as ready
  useEffect(() => {
    // Don't initialize until we have tenantId (session loaded)
    if (!tenantId) {
      setIsReady(false);
      return;
    }
    
    // Validate that we have required data (check for undefined/null, not falsy)
    if (header === undefined || header === null || 
        footer === undefined || footer === null || 
        theme === undefined || theme === null || 
        blocks === undefined || blocks === null) {
      logger.warn('[LivePreview] Preview data incomplete, waiting for required fields:', {
        hasHeader: header !== undefined && header !== null,
        hasFooter: footer !== undefined && footer !== null,
        hasTheme: theme !== undefined && theme !== null,
        hasBlocks: blocks !== undefined && blocks !== null,
      });
      return;
    }
    
    try {
      sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(previewData));
      setIsReady(true);
    } catch (e) {
      logger.error('Failed to store preview data:', e);
      setIsReady(true); // Still allow iframe to load, will use postMessage
    }
  }, [tenantId, previewData, header, footer, theme, blocks]); // Re-run when tenantId or previewData changes

  // Send updates via postMessage for live editing
  // Security: Only send to same-origin iframe
  const sendUpdate = useCallback(() => {
    if (iframeRef.current?.contentWindow && typeof window !== 'undefined') {
      iframeRef.current.contentWindow.postMessage(
        { type: 'PREVIEW_UPDATE', payload: previewData },
        window.location.origin
      );
    }
  }, [previewData]);

  // Debounced update to prevent too many re-renders
  useEffect(() => {
    if (!isReady) return;

    // Update sessionStorage
    try {
      sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(previewData));
    } catch (e) {
      // Ignore storage errors
    }

    // Send via postMessage after debounce
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      sendUpdate();
    }, 50);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [templateId, header, footer, theme, blocks, tenantName, tenantId, logoUrl, contactInfo, pages, activePageId, selectedBlockId, isReady, sendUpdate]);

  // Listen for messages from iframe
  // Security: Validate origin and message type
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin - only accept messages from same origin
      if (!isMessageFromSameOrigin(event)) {
        logger.warn('[LivePreview] Rejected message from unauthorized origin:', event.origin);
        return;
      }

      // Validate message structure
      if (!event.data || typeof event.data !== 'object' || !('type' in event.data)) {
        // Ignore noise from browser extensions/tools
        return;
      }

      if (!isValidPreviewMessage(event.data)) {
        logger.warn('[LivePreview] Invalid preview message received:', event.data);
        return;
      }

      // Handle valid messages
      if (event.data.type === 'BLOCK_SELECTED' && onSelectBlock) {
        onSelectBlock(event.data.blockId);
      } else if (event.data.type === 'NAVIGATE_PAGE' && onNavigateToPage) {
        onNavigateToPage(event.data.pageId);
      } else if (event.data.type === 'PREVIEW_READY') {
        // Iframe is ready, send initial data immediately
        logger.debug('[LivePreview] Received PREVIEW_READY, sending update immediately');
        // Send immediately without debounce for initial load
        if (iframeRef.current?.contentWindow && typeof window !== 'undefined') {
          iframeRef.current.contentWindow.postMessage(
            { type: 'PREVIEW_UPDATE', payload: previewData },
            window.location.origin
          );
        }
        // Also trigger the debounced update
        sendUpdate();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSelectBlock, onNavigateToPage, sendUpdate, previewData]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    // Send data after a short delay to ensure iframe JS is ready
    setTimeout(() => {
      sendUpdate();
      logger.debug('[LivePreview] Iframe loaded, sent initial update');
    }, 100);
  };

  // Refresh iframe
  const handleRefresh = () => {
    setIsLoading(true);
    // Update storage before refresh
    try {
      sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(previewData));
    } catch (e) {
      // Ignore
    }
    setIframeKey(prev => prev + 1);
  };

  // Handle navigation link clicks from within the preview
  const handleNavigate = (pageId: string) => {
    if (onNavigateToPage) {
      onNavigateToPage(pageId);
    }
  };

  const currentViewport = viewportConfig[viewport];

  // Don't render iframe until sessionStorage is populated
  if (!isReady) {
    return (
      <div className={cn(
        'flex flex-col h-full bg-background-secondary items-center justify-center',
        isFullscreen && 'fixed inset-0 z-[100] bg-surface-elevated'
      )}>
        <div className="animate-spin w-8 h-8 border-4 border-interactive-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background-secondary',
        isFullscreen && 'fixed inset-0 z-[100] bg-surface-elevated'
      )}
    >
      {/* Preview Toolbar */}
      {!hideToolbar && (
        <div className="flex items-center justify-between px-4 py-2 bg-surface-elevated border-b border-border-primary">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-secondary">Preview</span>
            
            {/* Page Selector */}
            {pages.length > 0 && onNavigateToPage && (
              <>
                <div className="w-px h-4 bg-border-primary" />
                <PageSelector
                  pages={pages}
                  activePageId={activePageId}
                  onSelectPage={handleNavigate}
                />
              </>
            )}
          </div>

          {/* Viewport Switcher */}
          <div className="flex items-center gap-1 bg-surface-secondary rounded-lg p-1">
            {(['desktop', 'tablet', 'mobile'] as const).map((size) => {
              const Icon = viewportIcons[size];
              return (
                <button
                  key={size}
                  onClick={() => setViewport(size)}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewport === size
                      ? 'bg-interactive-primary text-white'
                      : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-interactive'
                  )}
                  aria-label={`${size} view`}
                  aria-pressed={viewport === size}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              aria-label="Refresh preview"
              disabled={isLoading}
            >
              <RotateCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
            {onToggleFullscreen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleFullscreen}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Preview Container */}
      <div className={cn(
        "flex-1 overflow-auto flex items-start justify-center",
        viewport === 'desktop' ? "p-0" : "p-8"
      )}>
        <div
          className={cn(
            'relative bg-background-primary overflow-hidden transition-all duration-300',
            viewport === 'desktop' ? "shadow-none" : "shadow-2xl rounded-xl border border-border-primary"
          )}
          style={{
            width: viewport === 'desktop' ? '100%' : `${currentViewport.width}px`,
            maxWidth: '100%',
            height: viewport === 'desktop' ? '100%' : `${currentViewport.height}px`,
          }}
        >
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-background-primary flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-interactive-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-text-secondary">Loading preview...</p>
              </div>
            </div>
          )}

          {/* Iframe Preview */}
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src="/website-preview"
            className="w-full h-full border-0"
            title="Website Preview"
            onLoad={handleIframeLoad}
            style={{
              display: 'block',
            }}
          />
        </div>
      </div>

      {/* Viewport Info */}
      <div className="text-center py-2 text-xs text-text-tertiary bg-surface-elevated border-t border-border-primary">
        {currentViewport.label}
        {pages.find(p => p.id === activePageId)?.type !== 'home' && activePageId && (
          <span className="ml-2">• Editing: {pages.find(p => p.id === activePageId)?.title}</span>
        )}
      </div>
    </div>
  );
}

export default LivePreview;
