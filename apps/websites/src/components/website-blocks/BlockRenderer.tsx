'use client';

/**
 * Block Renderer
 * 
 * Dynamically renders website builder blocks based on block type.
 * Handles lazy loading of block components for performance.
 */

'use client';

import React, { Suspense, lazy, useMemo, memo } from 'react';
import { BlockType, BlockInstance } from '@/lib/website-builder/schema';
import { blockRegistry, BlockComponentProps } from './block-registry';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

// =============================================================================
// LOADING & ERROR STATES
// =============================================================================

function BlockLoader() {
  return (
    <div className="flex items-center justify-center py-12 bg-surface-secondary/50 rounded-lg">
      <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
    </div>
  );
}

function BlockLoaderWithLog({ blockType }: { blockType: string }) {
  // This component exists to provide a named component for Suspense fallback
  // The blockType prop is available for future logging/debugging if needed
  return <BlockLoader />;
}

interface BlockErrorProps {
  blockType: string;
  error?: string;
}

function BlockError({ blockType, error }: BlockErrorProps) {
  return (
    <div className="flex items-center justify-center py-8 bg-status-error/10 border border-status-error/20 rounded-lg">
      <div className="flex items-center gap-3 text-status-error">
        <AlertCircle className="h-5 w-5" />
        <div>
          <p className="font-medium">Failed to load block: {blockType}</p>
          {error && <p className="text-sm opacity-75">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// LAZY COMPONENT CACHE
// =============================================================================

// Cache for lazy-loaded components
// Using any for component type since individual components have their own specific props
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const componentCache = new Map<BlockType, React.LazyExoticComponent<React.ComponentType<any>>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLazyComponent(type: BlockType): React.LazyExoticComponent<React.ComponentType<any>> {
  if (!componentCache.has(type)) {
    const entry = blockRegistry[type];
    if (!entry) {
      throw new Error(`Block type "${type}" not found in registry`);
    }
    const LazyComponent = lazy(async () => {
      try {
        const module = await entry.component();
        return module;
      } catch (error) {
        logger.error(`Failed to load block component: ${type}`, error);
        // Return a fallback component
        return {
          default: () => <BlockError blockType={type} error="Component failed to load" />,
        };
      }
    });
    componentCache.set(type, LazyComponent);
  }
  return componentCache.get(type)!;
}

// =============================================================================
// BLOCK RENDERER PROPS
// =============================================================================

export interface BlockRendererProps {
  /** Block instance to render */
  block: BlockInstance;
  /** Tenant ID for data fetching */
  tenantId: string;
  /** Whether in preview/edit mode */
  isPreview?: boolean;
  /** Theme configuration */
  theme?: BlockComponentProps['theme'];
  /** Additional className for the wrapper */
  className?: string;
  /** Click handler for edit mode */
  onClick?: () => void;
  /** Whether this block is selected */
  isSelected?: boolean;
  /** Booking URL for CTA links (tenant-specific, e.g., /clinic/[slug]/book) */
  bookUrl?: string;
}

// =============================================================================
// BLOCK RENDERER COMPONENT
// =============================================================================

/**
 * BlockRenderer Component
 * 
 * Renders a single block based on its type using the block registry.
 * Components are lazily loaded for performance.
 */
export const BlockRenderer = memo(function BlockRenderer({
  block,
  tenantId,
  isPreview = false,
  theme,
  className,
  onClick,
  isSelected,
  bookUrl,
}: BlockRendererProps) {
  const { id, type, enabled, props, appearance } = block;

  // Don't render disabled blocks in non-preview mode
  if (!enabled && !isPreview) {
    return null;
  }

  // Get the lazy-loaded component
  const LazyBlockComponent = useMemo(() => {
    try {
      return getLazyComponent(type);
    } catch {
      return null;
    }
  }, [type]);

  if (!LazyBlockComponent) {
    return <BlockError blockType={type} error="Block type not found" />;
  }

  const wrapperClassName = cn(
    'relative transition-all duration-200',
    !enabled && isPreview && 'opacity-50',
    isPreview && 'cursor-pointer hover:ring-2 hover:ring-interactive-primary/50',
    isSelected && 'ring-2 ring-interactive-primary',
    className
  );

  return (
    <div
      className={wrapperClassName}
      onClick={onClick}
      data-block-id={id}
      data-block-type={type}
    >
      {/* Disabled overlay in preview mode */}
      {!enabled && isPreview && (
        <div className="absolute inset-0 bg-background-primary/50 z-10 flex items-center justify-center rounded-lg">
          <span className="bg-background-elevated px-3 py-1 rounded text-sm text-text-secondary">
            Hidden
          </span>
        </div>
      )}

      <Suspense fallback={<BlockLoaderWithLog blockType={type} />}>
        <LazyBlockComponent
          props={props as Record<string, unknown>}
          tenantId={tenantId}
          isPreview={isPreview}
          blockId={id}
          theme={theme}
          bookUrl={bookUrl}
          appearance={appearance}
        />
      </Suspense>
    </div>
  );
});

// =============================================================================
// BLOCKS LIST RENDERER
// =============================================================================

export interface BlocksListRendererProps {
  /** Array of blocks to render */
  blocks: BlockInstance[];
  /** Tenant ID for data fetching */
  tenantId: string;
  /** Whether in preview/edit mode */
  isPreview?: boolean;
  /** Theme configuration */
  theme?: BlockComponentProps['theme'];
  /** Additional className for the container */
  className?: string;
  /** Click handler for edit mode (receives block id) */
  onBlockClick?: (blockId: string) => void;
  /** Currently selected block ID */
  selectedBlockId?: string;
  /** Gap between blocks */
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Booking URL for CTA links (tenant-specific, e.g., /clinic/[slug]/book) */
  bookUrl?: string;
}

/**
 * BlocksListRenderer Component
 * 
 * Renders a list of blocks in order.
 */
export function BlocksListRenderer({
  blocks,
  tenantId,
  isPreview = false,
  theme,
  className,
  onBlockClick,
  selectedBlockId,
  gap = 'none',
  bookUrl,
}: BlocksListRendererProps) {
  const gapClasses = {
    none: '',
    sm: 'space-y-4',
    md: 'space-y-8',
    lg: 'space-y-12',
    xl: 'space-y-16',
  };

  const visibleBlocks = isPreview ? blocks : blocks.filter((b) => b.enabled);

  if (visibleBlocks.length === 0) {
    return (
      <div className="py-12 text-center text-text-secondary">
        <p>No blocks to display</p>
        {isPreview && (
          <p className="text-sm mt-2">Add blocks using the builder panel</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn(gapClasses[gap], className)}>
      {visibleBlocks.map((block) => (
        <BlockRenderer
          key={block.id}
          block={block}
          tenantId={tenantId}
          isPreview={isPreview}
          theme={theme}
          onClick={onBlockClick ? () => onBlockClick(block.id) : undefined}
          isSelected={selectedBlockId === block.id}
          bookUrl={bookUrl}
        />
      ))}
    </div>
  );
}

// =============================================================================
// BLOCKS RENDERER (Alternate interface for TemplateRenderer)
// =============================================================================

export interface BlocksRendererProps {
  /** Array of blocks to render */
  blocks: BlockInstance[];
  /** Whether in edit mode */
  isEditing?: boolean;
  /** Currently selected block ID */
  selectedBlockId?: string | null;
  /** Callback when a block is selected */
  onSelectBlock?: (blockId: string) => void;
  /** Theme configuration */
  theme?: BlockComponentProps['theme'];
  /** Tenant data for data fetching */
  tenantData?: {
    name: string;
    id?: string;
    contactInfo?: {
      phone: string;
      email: string;
      address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country?: string;
      };
    };
  };
  /** Booking URL for CTA links (tenant-specific, e.g., /clinic/[slug]/book) */
  bookUrl?: string;
}

/**
 * BlocksRenderer - Alternative interface for rendering blocks
 * Used by TemplateRenderer
 */
export function BlocksRenderer({
  blocks,
  isEditing = false,
  selectedBlockId,
  onSelectBlock,
  theme,
  tenantData,
  bookUrl,
}: BlocksRendererProps) {
  const visibleBlocks = isEditing ? blocks : blocks.filter((b) => b.enabled);

  if (visibleBlocks.length === 0) {
    return (
      <div className="py-12 text-center text-text-secondary">
        <p>No blocks to display</p>
        {isEditing && (
          <p className="text-sm mt-2">Add blocks using the builder panel</p>
        )}
      </div>
    );
  }

  // Pass tenantId from tenantData if available
  const tenantId = tenantData?.id || '';

  return (
    <div>
      {visibleBlocks.map((block) => (
        <BlockRenderer
          key={block.id}
          block={block}
          tenantId={tenantId}
          isPreview={isEditing}
          theme={theme}
          onClick={onSelectBlock ? () => onSelectBlock(block.id) : undefined}
          isSelected={selectedBlockId === block.id}
          bookUrl={bookUrl}
        />
      ))}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default BlockRenderer;
