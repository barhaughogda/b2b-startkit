'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { TemplateRenderer } from '@/components/website-templates';
import type { PreviewData } from '@/lib/website-builder/preview-messages';
import { isValidPreviewMessage, isMessageFromSameOrigin } from '@/lib/website-builder/preview-messages';
import { logger } from '@/lib/logger';

const PREVIEW_STORAGE_KEY = 'website-builder-preview-data';

// Retry configuration
const MAX_RETRIES = 5;
const RETRY_DELAY = 100;
const MAX_WAIT_TIME = 2000; // 2 seconds max

export default function WebsitePreviewPage({
  searchParams,
}: {
  searchParams?: Promise<any>;
}) {
  const resolvedSearchParams = searchParams ? (typeof (searchParams as any).then === 'function' ? React.use(searchParams) : searchParams) : {};
  
  // Track if component has mounted to prevent hydration mismatches
  const [mounted, setMounted] = useState(false);
  
  // Initialize state from sessionStorage immediately (synchronous)
  const [previewData, setPreviewData] = useState<PreviewData | null>(() => {
    // Only access sessionStorage on client side
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as PreviewData;
        logger.debug('[PreviewPage] Initialized from sessionStorage', data);
        return data;
      }
    } catch (e) {
      logger.error('[PreviewPage] Failed to initialize from sessionStorage:', e);
    }
    return null;
  });
  
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(() => {
    // Only access sessionStorage on client side
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as PreviewData;
        return data.selectedBlockId ?? null;
      }
    } catch (e) {
      // Ignore
    }
    return null;
  });
  
  const [hasNotifiedReady, setHasNotifiedReady] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Set mounted flag after component mounts to prevent hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load preview data from sessionStorage (for retries)
  const loadFromStorage = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as PreviewData;
        logger.debug('[PreviewPage] Loaded data from sessionStorage', data);
        setPreviewData(data);
        setSelectedBlockId(data.selectedBlockId ?? null);
        return true;
      } else {
        logger.debug('[PreviewPage] No data in sessionStorage, waiting for postMessage');
      }
    } catch (e) {
      logger.error('[PreviewPage] Failed to load preview data:', e);
    }
    return false;
  }, []);

  // Helper to send messages to parent window securely
  const sendToParent = useCallback((type: string, data?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && window.parent !== window) {
      logger.debug('[PreviewPage] Sending to parent:', type, data);
      window.parent.postMessage(
        { type, ...data },
        window.location.origin // Security: Only send to same origin
      );
    } else {
      logger.warn('[PreviewPage] Cannot send to parent - not in iframe');
    }
  }, []);

  // Initial load from sessionStorage with retry logic
  useEffect(() => {
    // Try to load immediately
    const loaded = loadFromStorage();
    
    if (loaded) {
      // Data loaded successfully, notify parent
      if (!hasNotifiedReady) {
        sendToParent('PREVIEW_READY');
        setHasNotifiedReady(true);
      }
      return;
    }

    // If not loaded, retry a few times
    let retryCount = 0;
    const tryLoad = () => {
      const elapsed = Date.now() - startTimeRef.current;
      if (retryCount < MAX_RETRIES && elapsed < MAX_WAIT_TIME) {
        retryCount++;
        const retryLoaded = loadFromStorage();
        if (retryLoaded) {
          if (!hasNotifiedReady) {
            sendToParent('PREVIEW_READY');
            setHasNotifiedReady(true);
          }
          return;
        }
        retryTimeoutRef.current = setTimeout(tryLoad, RETRY_DELAY);
      } else {
        // Exhausted retries, notify parent anyway (will use postMessage fallback)
        if (!hasNotifiedReady) {
          logger.debug('[PreviewPage] Retries exhausted, notifying parent for postMessage fallback');
          sendToParent('PREVIEW_READY');
          setHasNotifiedReady(true);
        }
      }
    };

    // Start retry loop
    retryTimeoutRef.current = setTimeout(tryLoad, RETRY_DELAY);

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [loadFromStorage, sendToParent, hasNotifiedReady]);

  // Also notify parent immediately on mount (in case parent is already ready)
  useEffect(() => {
    // Small delay to ensure window.parent is available
    const timer = setTimeout(() => {
      if (!hasNotifiedReady) {
        logger.debug('[PreviewPage] Notifying parent on mount');
        sendToParent('PREVIEW_READY');
        setHasNotifiedReady(true);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [sendToParent, hasNotifiedReady]);

  // Track previewData changes
  useEffect(() => {
    if (previewData) {
      logger.debug('[PreviewPage] previewData state updated:', {
        templateId: previewData.templateId,
        blocksCount: previewData.blocks?.length,
        hasHeader: !!previewData.header,
        hasFooter: !!previewData.footer,
        hasTheme: !!previewData.theme,
      });
    } else {
      logger.debug('[PreviewPage] previewData is null');
    }
  }, [previewData]);

  // Listen for updates from parent window
  // Security: Validate origin and message type
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin - only accept messages from same origin
      if (!isMessageFromSameOrigin(event)) {
        logger.warn('Rejected message from unauthorized origin:', event.origin);
        return;
      }

      // Validate message structure
      if (!isValidPreviewMessage(event.data)) {
        logger.warn('Invalid preview message received:', event.data);
        return;
      }

      // Handle valid messages
      if (event.data.type === 'PREVIEW_UPDATE') {
        const payload = event.data.payload;
        logger.debug('[PreviewPage] Received PREVIEW_UPDATE', payload);
        
        // Validate required fields before setting
        if (payload.templateId === undefined || payload.templateId === null ||
            payload.header === undefined || payload.header === null ||
            payload.footer === undefined || payload.footer === null ||
            payload.theme === undefined || payload.theme === null ||
            !Array.isArray(payload.blocks)) {
          logger.error('[PreviewPage] Invalid preview data structure:', payload);
          return;
        }
        
        logger.debug('[PreviewPage] Data validation passed, setting previewData');
        
        setPreviewData(payload);
        if (payload.selectedBlockId !== undefined) {
          setSelectedBlockId(payload.selectedBlockId);
        }
      } else if (event.data.type === 'SELECT_BLOCK') {
        setSelectedBlockId(event.data.blockId);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Notify parent window when a block is clicked
  const handleSelectBlock = (blockId: string) => {
    setSelectedBlockId(blockId);
    sendToParent('BLOCK_SELECTED', { blockId });
  };

  // Notify parent window on navigation
  const handleNavigate = (pageId: string) => {
    sendToParent('NAVIGATE_PAGE', { pageId });
  };

  // Show error if data hasn't loaded after reasonable time
  const [showError, setShowError] = useState(false);
  useEffect(() => {
    if (!previewData) {
      const errorTimer = setTimeout(() => {
        setShowError(true);
      }, 5000); // Show error after 5 seconds
      return () => clearTimeout(errorTimer);
    } else {
      setShowError(false);
    }
  }, [previewData]);

  // Don't render content until mounted to prevent hydration mismatches
  if (!mounted || !previewData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          {showError ? (
            <>
              <p className="text-slate-600 mb-2">Failed to load preview</p>
              <p className="text-sm text-slate-400">Please refresh the page or check the console for errors</p>
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
              >
                Reload Page
              </button>
            </>
          ) : (
            <>
              <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-slate-600">Loading preview...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Get the active page's blocks
  const activePage = previewData.pages?.find(p => p.id === previewData.activePageId);
  const displayBlocks = activePage?.type === 'home' || !activePage
    ? previewData.blocks
    : activePage.blocks.length > 0
      ? activePage.blocks
      : previewData.blocks;

  try {
    return (
      <div className="min-h-screen bg-white">
        <TemplateRenderer
          templateId={previewData.templateId}
          header={previewData.header}
          footer={previewData.footer}
          theme={previewData.theme}
          blocks={displayBlocks}
          tenantName={previewData.tenantName}
          tenantId={previewData.tenantId}
          logoUrl={previewData.logoUrl}
          contactInfo={previewData.contactInfo}
          isEditing={false}
          selectedBlockId={selectedBlockId}
          onSelectBlock={handleSelectBlock}
          onNavigate={handleNavigate}
          pages={previewData.pages}
          activePageId={previewData.activePageId}
          siteStructure={previewData.siteStructure}
          basePath={previewData.basePath}
        />
      </div>
    );
  } catch (error) {
    logger.error('[PreviewPage] Error rendering TemplateRenderer:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600 mb-2">Error rendering preview</p>
          <p className="text-sm text-slate-400">{String(error)}</p>
        </div>
      </div>
    );
  }
}
