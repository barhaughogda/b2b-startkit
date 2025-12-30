'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BLOCK_METADATA,
  BLOCK_TYPES,
  type BlockInstance,
  type BlockType,
  type PageType,
  type HeaderVariant,
  type FooterVariant,
  createBlockInstance,
} from '@/lib/website-builder/schema';
import { cn } from '@/lib/utils';
import {
  GripVertical,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Layout,
  Users,
  MapPin,
  Heart,
  Shield,
  ListOrdered,
  MessageSquare,
  HelpCircle,
  Phone,
  Sparkles,
  FileText,
  PanelTop,
  PanelBottom,
  ImageIcon,
  Play,
} from 'lucide-react';

// =============================================================================
// CONSTANTS - Standard blocks for each page type
// =============================================================================

/**
 * Defines which blocks are considered "standard" for each page type.
 * Standard blocks are shown at the top of the Add Block menu.
 * All other blocks appear under "Other".
 */
const STANDARD_BLOCKS_BY_PAGE: Record<PageType, BlockType[]> = {
  home: ['hero', 'care-team', 'clinics', 'services', 'contact', 'cta-band', 'faq', 'custom-text', 'photo-text', 'media'],
  services: ['services', 'hero', 'trust-bar', 'how-it-works', 'contact', 'cta-band', 'clinics', 'faq', 'custom-text', 'photo-text', 'media'],
  team: ['care-team', 'hero', 'testimonials', 'trust-bar', 'contact', 'cta-band', 'clinics', 'faq', 'custom-text', 'photo-text', 'media'],
  locations: ['clinics', 'hero', 'contact', 'how-it-works', 'cta-band', 'faq', 'custom-text', 'photo-text', 'media'],
  contact: ['contact', 'hero', 'clinics', 'faq', 'cta-band', 'custom-text', 'photo-text', 'media'],
  custom: ['custom-text', 'hero', 'cta-band', 'contact', 'clinics', 'faq', 'photo-text', 'media'],
  terms: ['custom-text', 'contact', 'cta-band', 'clinics', 'faq', 'photo-text', 'media'],
  privacy: ['custom-text', 'contact', 'cta-band', 'clinics', 'faq', 'photo-text', 'media'],
};

// =============================================================================
// TYPES
// =============================================================================

interface BlockCanvasProps {
  blocks: BlockInstance[];
  onBlocksChange: (blocks: BlockInstance[]) => void;
  selectedBlockId?: string | null;
  onSelectBlock: (blockId: string | null) => void;
  disabled?: boolean;
  /** The type of the currently selected page - determines which blocks are "standard" */
  pageType?: PageType;
  /** Header variant for displaying in pinned header item */
  headerVariant?: HeaderVariant;
  /** Footer variant for displaying in pinned footer item */
  footerVariant?: FooterVariant;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const blockIcons: Record<BlockType, React.ComponentType<{ className?: string }>> = {
  'hero': Layout,
  'care-team': Users,
  'clinics': MapPin,
  'services': Heart,
  'trust-bar': Shield,
  'how-it-works': ListOrdered,
  'testimonials': MessageSquare,
  'faq': HelpCircle,
  'contact': Phone,
  'cta-band': Sparkles,
  'custom-text': FileText,
  'photo-text': ImageIcon,
  'media': Play,
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface BlockListItemProps {
  block: BlockInstance;
  index: number;
  totalBlocks: number;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleEnabled: () => void;
  onRemove: () => void;
  disabled?: boolean;
}

function BlockListItem({
  block,
  index,
  totalBlocks,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onToggleEnabled,
  onRemove,
  disabled,
}: BlockListItemProps) {
  const metadata = BLOCK_METADATA[block.type];
  const Icon = blockIcons[block.type];
  const canMoveUp = index > 0;
  const canMoveDown = index < totalBlocks - 1;

  return (
    <div
      className={cn(
        'group flex items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200',
        isSelected
          ? 'border-interactive-primary bg-interactive-primary/5'
          : 'border-border-primary bg-surface-elevated hover:border-border-focus',
        !block.enabled && 'opacity-50',
        disabled && 'cursor-not-allowed'
      )}
      role="listitem"
    >
      {/* Drag Handle */}
      <div className="shrink-0 cursor-grab text-text-tertiary hover:text-text-secondary">
        <GripVertical className="w-5 h-5" aria-hidden="true" />
      </div>

      {/* Block Info - min-w-0 allows this to shrink and truncate */}
      <button
        className={cn(
          'flex-1 min-w-0 flex items-center gap-3 text-left',
          !disabled && 'cursor-pointer'
        )}
        onClick={() => !disabled && onSelect()}
        disabled={disabled}
      >
        <div
          className={cn(
            'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
            'bg-interactive-primary/10 text-interactive-primary'
          )}
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-text-primary truncate">{metadata.name}</p>
          <p className="text-xs text-text-tertiary truncate">{block.id.split('-')[0]}</p>
        </div>
      </button>

      {/* Actions - 2-row vertical layout, shrink-0 to prevent overflow */}
      <div className="shrink-0 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Row 1: Move up/down */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onMoveUp}
            disabled={!canMoveUp || disabled}
            aria-label="Move block up"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onMoveDown}
            disabled={!canMoveDown || disabled}
            aria-label="Move block down"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
        {/* Row 2: Show/hide + delete */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleEnabled}
            disabled={disabled}
            aria-label={block.enabled ? 'Hide block' : 'Show block'}
          >
            {block.enabled ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-status-error hover:text-status-error"
            onClick={onRemove}
            disabled={disabled}
            aria-label="Remove block"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface AddBlockMenuProps {
  onAddBlock: (type: BlockType) => void;
  existingBlocks: BlockType[];
  disabled?: boolean;
  /** The type of the currently selected page - determines which blocks are "standard" */
  pageType?: PageType;
}

function AddBlockMenu({ onAddBlock, existingBlocks, disabled, pageType = 'home' }: AddBlockMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = React.useState(false);

  // Get standard blocks for the current page type with explicit type checking
  const standardBlockTypes = 
    (pageType && pageType in STANDARD_BLOCKS_BY_PAGE && STANDARD_BLOCKS_BY_PAGE[pageType])
      ? STANDARD_BLOCKS_BY_PAGE[pageType]
      : STANDARD_BLOCKS_BY_PAGE.home;
  
  // Filter blocks into standard and other based on current page
  const standardBlocks = BLOCK_TYPES.filter(
    (type: BlockType) => standardBlockTypes.includes(type)
  );
  const otherBlocks = BLOCK_TYPES.filter(
    (type: BlockType) => !standardBlockTypes.includes(type)
  );

  const handleAddBlock = (type: BlockType) => {
    onAddBlock(type);
    setIsOpen(false);
  };

  // Check if content is scrollable and update indicator
  const checkScrollable = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const hasMoreContent = container.scrollHeight > container.clientHeight;
      const isNotAtBottom = container.scrollTop + container.clientHeight < container.scrollHeight - 10;
      setShowScrollIndicator(hasMoreContent && isNotAtBottom);
    }
  }, []);

  // Check scrollability when popover opens
  React.useEffect(() => {
    if (isOpen) {
      // Use requestAnimationFrame for more reliable timing, especially on slower devices
      let timeoutId: NodeJS.Timeout | null = null;
      const rafId = requestAnimationFrame(() => {
        timeoutId = setTimeout(checkScrollable, 50);
      });
      return () => {
        cancelAnimationFrame(rafId);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, [isOpen, checkScrollable]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full border-dashed border-2"
          disabled={disabled}
        >
          <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
          Add Block
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        collisionPadding={16}
        className="w-[300px] p-0"
      >
        <div className="relative">
          {/* Scrollable content area */}
          <div
            ref={scrollContainerRef}
            className="max-h-[360px] overflow-y-auto overscroll-contain"
            onScroll={checkScrollable}
          >
            {/* Standard blocks for this page type */}
            <div className="pt-3 px-3">
              <div className="sticky top-0 bg-popover z-10 pb-2 -mt-1 pt-1">
                <p className="text-xs font-semibold text-interactive-primary uppercase tracking-wide px-2">
                  Standard for this page
                </p>
              </div>
              <div className="space-y-1 pb-3">
                {standardBlocks.map((type: BlockType) => {
                  const metadata = BLOCK_METADATA[type];
                  const Icon = blockIcons[type];
                  const hasBlock = existingBlocks.includes(type);

                  return (
                    <button
                      key={type}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-lg transition-colors',
                        'hover:bg-surface-interactive text-left',
                        hasBlock && 'opacity-50'
                      )}
                      onClick={() => handleAddBlock(type)}
                      disabled={disabled}
                    >
                      <Icon className="w-4 h-4 text-interactive-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {metadata.name}
                        </p>
                      </div>
                      {hasBlock && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          Added
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            {otherBlocks.length > 0 && (
              <div className="border-t border-border-primary" />
            )}

            {/* Other blocks */}
            {otherBlocks.length > 0 && (
              <div className="pt-3 px-3 pb-3">
                <div className="sticky top-0 bg-popover z-10 pb-2 -mt-1 pt-1">
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide px-2">
                    Other blocks
                  </p>
                </div>
                <div className="space-y-1">
                  {otherBlocks.map((type: BlockType) => {
                    const metadata = BLOCK_METADATA[type];
                    const Icon = blockIcons[type];
                    const hasBlock = existingBlocks.includes(type);

                    return (
                      <button
                        key={type}
                        className={cn(
                          'w-full flex items-center gap-3 p-2 rounded-lg transition-colors',
                          'hover:bg-surface-interactive text-left',
                          hasBlock && 'opacity-50'
                        )}
                        onClick={() => handleAddBlock(type)}
                        disabled={disabled}
                      >
                        <Icon className="w-4 h-4 text-text-tertiary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {metadata.name}
                          </p>
                        </div>
                        {hasBlock && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            Added
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Scroll indicator - shows when more content below */}
          {showScrollIndicator && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-popover to-transparent pointer-events-none flex items-end justify-center pb-1">
              <ChevronDown className="w-4 h-4 text-text-tertiary animate-bounce" />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// PINNED ITEM (Header/Footer)
// =============================================================================

interface PinnedItemProps {
  type: 'header' | 'footer';
  variant: string;
  isSelected: boolean;
  onSelect: () => void;
}

function PinnedItem({ type, variant, isSelected, onSelect }: PinnedItemProps) {
  const isHeader = type === 'header';
  const Icon = isHeader ? PanelTop : PanelBottom;
  const label = isHeader ? 'Header' : 'Footer';

  return (
    <button
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200',
        isSelected
          ? 'border-interactive-primary bg-interactive-primary/5'
          : 'border-border-secondary bg-surface-secondary hover:border-border-focus',
        'cursor-pointer'
      )}
      onClick={onSelect}
    >
      <div
        className={cn(
          'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
          'bg-text-tertiary/10 text-text-tertiary'
        )}
      >
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 text-left">
        <p className="font-medium text-text-primary truncate">{label}</p>
        <p className="text-xs text-text-tertiary truncate">{variant}</p>
      </div>
    </button>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BlockCanvas({
  blocks,
  onBlocksChange,
  selectedBlockId,
  onSelectBlock,
  disabled,
  pageType = 'home',
  headerVariant,
  footerVariant,
}: BlockCanvasProps) {
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newBlocks = [...blocks];
    const item1 = newBlocks[index - 1];
    const item2 = newBlocks[index];
    if (item1 && item2) {
      newBlocks[index - 1] = item2;
      newBlocks[index] = item1;
      onBlocksChange(newBlocks);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index >= blocks.length - 1) return;
    const newBlocks = [...blocks];
    const item1 = newBlocks[index];
    const item2 = newBlocks[index + 1];
    if (item1 && item2) {
      newBlocks[index] = item2;
      newBlocks[index + 1] = item1;
      onBlocksChange(newBlocks);
    }
  };

  const handleToggleEnabled = (blockId: string) => {
    const newBlocks = blocks.map((block) =>
      block.id === blockId ? { ...block, enabled: !block.enabled } : block
    );
    onBlocksChange(newBlocks);
  };

  const handleRemove = (blockId: string) => {
    const newBlocks = blocks.filter((block) => block.id !== blockId);
    onBlocksChange(newBlocks);
    if (selectedBlockId === blockId) {
      onSelectBlock(null);
    }
  };

  const handleAddBlock = (type: BlockType) => {
    const newBlock = createBlockInstance(type);
    onBlocksChange([...blocks, newBlock]);
    onSelectBlock(newBlock.id);
  };

  const existingBlockTypes = blocks.map((b) => b.type);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Page Blocks
          </h3>
          <p className="text-sm text-text-secondary">
            {blocks.length} blocks · Drag to reorder
          </p>
        </div>
      </div>

      {/* Block List - scrollable area */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 -mx-4 px-4">
        {/* Pinned Header Item */}
        {headerVariant && (
          <PinnedItem
            type="header"
            variant={headerVariant}
            isSelected={selectedBlockId === 'header'}
            onSelect={() => onSelectBlock('header')}
          />
        )}

        <div
          className="space-y-2"
          role="list"
          aria-label="Page blocks"
        >
          {blocks.map((block, index) => (
            <BlockListItem
              key={block.id}
              block={block}
              index={index}
              totalBlocks={blocks.length}
              isSelected={selectedBlockId === block.id}
              onSelect={() => onSelectBlock(block.id)}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
              onToggleEnabled={() => handleToggleEnabled(block.id)}
              onRemove={() => handleRemove(block.id)}
              disabled={disabled}
            />
          ))}
        </div>

        {/* Empty state */}
        {blocks.length === 0 && (
          <div className="text-center py-8 text-text-tertiary">
            <p>No blocks added yet</p>
            <p className="text-sm">Add blocks to build your page</p>
          </div>
        )}

        {/* Pinned Footer Item */}
        {footerVariant && (
          <PinnedItem
            type="footer"
            variant={footerVariant}
            isSelected={selectedBlockId === 'footer'}
            onSelect={() => onSelectBlock('footer')}
          />
        )}
      </div>

      {/* Add Block - sticky at bottom */}
      <div className="pt-4 mt-auto border-t border-border-primary bg-surface-elevated -mx-4 px-4 pb-1">
        <AddBlockMenu
          onAddBlock={handleAddBlock}
          existingBlocks={existingBlockTypes}
          disabled={disabled}
          pageType={pageType}
        />
      </div>
    </div>
  );
}

export default BlockCanvas;
