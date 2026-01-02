'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  BLOCK_METADATA,
  type BlockInstance,
  type BlockType,
  type HeaderVariant,
  type FooterVariant,
} from '@/lib/website-builder/schema';
import { cn } from '@/lib/utils';
import {
  X,
  GripVertical,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Layers,
  PanelTop,
  PanelBottom,
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
  Move,
  Image,
  Video,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface StructureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Data
  blocks: BlockInstance[];
  headerVariant?: HeaderVariant;
  footerVariant?: FooterVariant;
  // Selection
  selectedBlockId?: string | null;
  onSelectBlock: (blockId: string | null) => void;
  // Block operations
  onBlocksChange: (blocks: BlockInstance[]) => void;
  onToggleBlockEnabled: (blockId: string) => void;
}

interface DragState {
  draggingId: string | null;
  overIndex: number | null;
}

// =============================================================================
// CONSTANTS
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
  'photo-text': Image,
  'media': Video,
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StructureItemProps {
  id: string;
  name: string;
  icon: React.ReactNode;
  isSelected?: boolean;
  isEnabled?: boolean;
  isExpanded?: boolean;
  hasChildren?: boolean;
  depth?: number;
  isDraggable?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onSelect?: () => void;
  onToggleExpand?: () => void;
  onToggleEnabled?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: () => void;
}

function StructureItem({
  id,
  name,
  icon,
  isSelected,
  isEnabled = true,
  isExpanded,
  hasChildren,
  depth = 0,
  isDraggable,
  isDragging,
  isDropTarget,
  onSelect,
  onToggleExpand,
  onToggleEnabled,
  onDragStart,
  onDragEnd,
  onDragOver,
}: StructureItemProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-1 px-2 py-1.5 rounded-md transition-all cursor-pointer',
        isSelected
          ? 'bg-interactive-primary/10 text-interactive-primary'
          : 'hover:bg-surface-interactive text-text-primary',
        !isEnabled && 'opacity-50',
        isDragging && 'opacity-30',
        isDropTarget && 'ring-2 ring-interactive-primary ring-offset-1'
      )}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      onClick={onSelect}
      draggable={isDraggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', id);
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.();
      }}
    >
      {/* Drag handle */}
      {isDraggable && (
        <div className="cursor-grab opacity-0 group-hover:opacity-100 text-text-tertiary">
          <GripVertical className="w-3 h-3" />
        </div>
      )}

      {/* Expand toggle */}
      {hasChildren ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand?.();
          }}
          className="p-0.5 hover:bg-surface-secondary rounded"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>
      ) : (
        <div className="w-4" />
      )}

      {/* Icon */}
      <div className="flex-shrink-0">{icon}</div>

      {/* Name */}
      <span className="flex-1 text-sm truncate">{name}</span>

      {/* Visibility toggle */}
      {onToggleEnabled && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled();
          }}
          className={cn(
            'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
            'hover:bg-surface-secondary'
          )}
          aria-label={isEnabled ? 'Hide section' : 'Show section'}
        >
          {isEnabled ? (
            <Eye className="w-3 h-3 text-text-tertiary" />
          ) : (
            <EyeOff className="w-3 h-3 text-text-tertiary" />
          )}
        </button>
      )}
    </div>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function StructureModal({
  open,
  onOpenChange,
  blocks,
  headerVariant,
  footerVariant,
  selectedBlockId,
  onSelectBlock,
  onBlocksChange,
  onToggleBlockEnabled,
}: StructureModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 100 });
  const [isDraggingModal, setIsDraggingModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['blocks'])
  );
  const [dragState, setDragState] = useState<DragState>({
    draggingId: null,
    overIndex: null,
  });

  // Initialize position when opening
  useEffect(() => {
    if (open && modalRef.current) {
      // Position to the right side of the viewport
      const viewportWidth = window.innerWidth;
      setPosition({ x: viewportWidth - 320, y: 100 });
    }
  }, [open]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleBlockDragStart = (blockId: string) => {
    setDragState({ draggingId: blockId, overIndex: null });
  };

  const handleBlockDragOver = (index: number) => {
    if (dragState.draggingId) {
      setDragState((prev) => ({ ...prev, overIndex: index }));
    }
  };

  const handleBlockDragEnd = () => {
    if (dragState.draggingId && dragState.overIndex !== null) {
      const fromIndex = blocks.findIndex((b) => b.id === dragState.draggingId);
      const toIndex = dragState.overIndex;

      if (fromIndex !== -1 && fromIndex !== toIndex) {
        const newBlocks = [...blocks];
        const removed = newBlocks[fromIndex];
        if (removed) {
          newBlocks.splice(fromIndex, 1);
          newBlocks.splice(toIndex, 0, removed);
          onBlocksChange(newBlocks);
        }
      }
    }
    setDragState({ draggingId: null, overIndex: null });
  };

  // Handle modal dragging
  const handleModalMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-modal-header]')) {
      setIsDraggingModal(true);
      const startX = e.clientX - position.x;
      const startY = e.clientY - position.y;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        setPosition({
          x: moveEvent.clientX - startX,
          y: moveEvent.clientY - startY,
        });
      };

      const handleMouseUp = () => {
        setIsDraggingModal(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={modalRef}
      className={cn(
        'fixed z-50 w-72 bg-surface-elevated border border-border-primary rounded-lg shadow-xl',
        'flex flex-col max-h-[70vh]',
        isDraggingModal && 'cursor-grabbing'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleModalMouseDown}
    >
      {/* Header */}
      <div
        data-modal-header
        className="flex items-center justify-between px-3 py-2 border-b border-border-primary cursor-grab"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-interactive-primary" />
          <span className="font-medium text-sm text-text-primary">Structure</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Header Section */}
        {headerVariant && (
          <StructureItem
            id="header"
            name={`Header (${headerVariant})`}
            icon={<PanelTop className="w-4 h-4 text-text-tertiary" />}
            isSelected={selectedBlockId === 'header'}
            onSelect={() => onSelectBlock('header')}
            depth={0}
          />
        )}

        {/* Blocks Section */}
        <StructureItem
          id="blocks-section"
          name={`Blocks (${blocks.length})`}
          icon={<Layout className="w-4 h-4 text-text-tertiary" />}
          hasChildren={blocks.length > 0}
          isExpanded={expandedSections.has('blocks')}
          onToggleExpand={() => toggleSection('blocks')}
          depth={0}
        />

        {/* Block Items */}
        {expandedSections.has('blocks') && (
          <div className="space-y-0.5">
            {blocks.map((block, index) => {
              const metadata = BLOCK_METADATA[block.type];
              const Icon = blockIcons[block.type];
              const isBeingDragged = dragState.draggingId === block.id;
              const isDropTarget = dragState.overIndex === index && !isBeingDragged;

              return (
                <StructureItem
                  key={block.id}
                  id={block.id}
                  name={metadata?.name || block.type}
                  icon={<Icon className="w-4 h-4 text-text-tertiary" />}
                  isSelected={selectedBlockId === block.id}
                  isEnabled={block.enabled}
                  isDraggable
                  isDragging={isBeingDragged}
                  isDropTarget={isDropTarget}
                  depth={1}
                  onSelect={() => onSelectBlock(block.id)}
                  onToggleEnabled={() => onToggleBlockEnabled(block.id)}
                  onDragStart={() => handleBlockDragStart(block.id)}
                  onDragEnd={handleBlockDragEnd}
                  onDragOver={() => handleBlockDragOver(index)}
                />
              );
            })}
          </div>
        )}

        {/* Footer Section */}
        {footerVariant && (
          <StructureItem
            id="footer"
            name={`Footer (${footerVariant})`}
            icon={<PanelBottom className="w-4 h-4 text-text-tertiary" />}
            isSelected={selectedBlockId === 'footer'}
            onSelect={() => onSelectBlock('footer')}
            depth={0}
          />
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-border-primary">
        <p className="text-xs text-text-tertiary flex items-center gap-1">
          <Move className="w-3 h-3" />
          Drag to reorder blocks
        </p>
      </div>
    </div>
  );
}

export default StructureModal;

