'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TEMPLATE_IDS,
  TEMPLATE_METADATA,
  type TemplateId,
  type TemplateMetadata,
} from '@/lib/website-builder/schema';
import { cn } from '@/lib/utils';
import { Check, Layout, Grid3X3, Split, MapPin, Users, LayoutGrid } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type TemplateSelectorVariant = 'grid' | 'vertical';

interface TemplateSelectorProps {
  selectedTemplate?: TemplateId;
  onSelect: (templateId: TemplateId) => void;
  disabled?: boolean;
  /** Layout variant: 'grid' for full page, 'vertical' for sidebar/modal */
  variant?: TemplateSelectorVariant;
  /** Hide the header text (useful in wizard context) */
  hideHeader?: boolean;
  /** Hide the continue button (useful in wizard context) */
  hideContinueButton?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Fallback icon component
const DefaultIcon = LayoutGrid;

const templateIcons: Record<TemplateId, React.ComponentType<{ className?: string }>> = {
  'classic-stacked': Layout,
  'bento-grid': Grid3X3,
  'split-hero': Split,
  'multi-location': MapPin,
  'team-forward': Users,
};

const templatePreviews: Record<TemplateId, string> = {
  'classic-stacked': 'bg-gradient-to-b from-zenthea-teal via-zenthea-teal/80 to-surface-secondary',
  'bento-grid': 'bg-gradient-to-br from-zenthea-purple via-zenthea-purple/80 to-surface-secondary',
  'split-hero': 'bg-gradient-to-r from-zenthea-teal to-surface-secondary',
  'multi-location': 'bg-gradient-to-b from-zenthea-coral via-zenthea-coral/80 to-surface-secondary',
  'team-forward': 'bg-gradient-to-b from-zenthea-purple via-zenthea-purple/80 to-surface-secondary',
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface TemplateCardProps {
  templateId: TemplateId;
  template: TemplateMetadata;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  /** Compact version for vertical layout */
  compact?: boolean;
}

function TemplateCard({ templateId, template, isSelected, onSelect, disabled, compact }: TemplateCardProps) {
  // Safety check: ensure template exists
  if (!template) {
    return null;
  }
  
  const Icon = templateIcons[templateId] || DefaultIcon;

  // Compact card for vertical/sidebar layout
  if (compact) {
    return (
      <div
        className={cn(
          'relative cursor-pointer transition-all duration-200 rounded-lg',
          'border-2 hover:shadow-md flex items-center gap-3 p-3',
          isSelected
            ? 'border-interactive-primary bg-interactive-primary/5'
            : 'border-border-primary hover:border-border-focus bg-surface-elevated',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => !disabled && onSelect()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-selected={isSelected}
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        {/* Preview thumbnail */}
        <div
          className={cn(
            'w-16 h-16 rounded-lg flex-shrink-0 relative overflow-hidden',
            templatePreviews[templateId]
          )}
        >
          <div className="absolute inset-1 flex flex-col gap-0.5">
            <div className="h-1 bg-white/30 rounded-full" />
            <div className="flex-1 bg-white/20 rounded flex items-center justify-center">
              <Icon className="w-4 h-4 text-white/60" aria-hidden="true" />
            </div>
            <div className="h-0.5 bg-white/10 rounded-full w-3/4" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-text-primary truncate">
              {template.name}
            </span>
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {template.defaultBlocks.length} blocks
            </Badge>
          </div>
          <p className="text-xs text-text-tertiary line-clamp-1 mt-0.5">
            {template.description}
          </p>
        </div>

        {/* Selected indicator */}
        {isSelected && (
          <div className="flex-shrink-0">
            <div className="w-5 h-5 rounded-full bg-interactive-primary flex items-center justify-center">
              <Check className="w-3 h-3 text-white" aria-hidden="true" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full card for grid layout
  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all duration-200',
        'border-2 hover:shadow-lg',
        isSelected
          ? 'border-interactive-primary ring-2 ring-interactive-primary/20'
          : 'border-border-primary hover:border-border-focus',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={() => !disabled && onSelect()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-selected={isSelected}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 z-10">
          <div className="w-6 h-6 rounded-full bg-interactive-primary flex items-center justify-center">
            <Check className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* Preview area */}
      <div
        className={cn(
          'h-32 md:h-40 relative overflow-hidden rounded-t-lg',
          templatePreviews[templateId]
        )}
      >
        {/* Miniature layout preview */}
        <div className="absolute inset-4 flex flex-col gap-2">
          {/* Header mockup */}
          <div className="h-3 bg-white/30 rounded-full" />
          
          {/* Hero mockup */}
          <div className="flex-1 bg-white/20 rounded-lg flex items-center justify-center">
            <Icon className="w-8 h-8 text-white/60" aria-hidden="true" />
          </div>
          
          {/* Content mockup */}
          <div className="h-2 bg-white/10 rounded-full w-3/4" />
          <div className="h-2 bg-white/10 rounded-full w-1/2" />
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{template.name}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {template.defaultBlocks.length} blocks
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <CardDescription className="text-sm line-clamp-2">
          {template.description}
        </CardDescription>
        
        {/* Recommended blocks */}
        <div className="mt-3 flex flex-wrap gap-1">
          {template.recommendedBlocks.slice(0, 4).map((block) => (
            <span
              key={block}
              className="text-xs px-2 py-0.5 bg-surface-secondary rounded text-text-tertiary"
            >
              {block.replace('-', ' ')}
            </span>
          ))}
          {template.recommendedBlocks.length > 4 && (
            <span className="text-xs px-2 py-0.5 text-text-tertiary">
              +{template.recommendedBlocks.length - 4}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TemplateSelector({
  selectedTemplate,
  onSelect,
  disabled,
  variant = 'grid',
  hideHeader = false,
  hideContinueButton = false,
}: TemplateSelectorProps) {
  const isVertical = variant === 'vertical';

  return (
    <div className={cn('space-y-4', !isVertical && 'space-y-6')}>
      {/* Header - can be hidden in wizard context */}
      {!hideHeader && (
        <div className={cn(isVertical ? 'text-left' : 'text-center')}>
          <h2 className={cn(
            'font-bold text-text-primary mb-1',
            isVertical ? 'text-lg' : 'text-2xl mb-2'
          )}>
            Choose a Template
          </h2>
          <p className={cn(
            'text-text-secondary',
            isVertical ? 'text-sm' : 'max-w-lg mx-auto'
          )}>
            {isVertical
              ? 'Select a starting template for your website.'
              : 'Select a starting template for your clinic\'s website. You can customize blocks, colors, and content after.'}
          </p>
        </div>
      )}

      {/* Template cards */}
      <div
        className={cn(
          isVertical
            ? 'flex flex-col gap-2'
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4'
        )}
        role="radiogroup"
        aria-label="Website templates"
      >
        {TEMPLATE_IDS.map((templateId) => {
          const template = TEMPLATE_METADATA[templateId];
          // Safety check: skip if template doesn't exist
          if (!template) {
            return null;
          }
          return (
            <TemplateCard
              key={templateId}
              templateId={templateId}
              template={template}
              isSelected={selectedTemplate === templateId}
              onSelect={() => onSelect(templateId)}
              disabled={disabled}
              compact={isVertical}
            />
          );
        })}
      </div>

      {/* Continue button - can be hidden in wizard context */}
      {!hideContinueButton && selectedTemplate && (
        <div className={cn(isVertical ? 'pt-2' : 'text-center pt-4')}>
          <Button
            size={isVertical ? 'default' : 'lg'}
            className={cn(
              'bg-interactive-primary hover:bg-interactive-primary-hover',
              isVertical && 'w-full'
            )}
            disabled={disabled}
          >
            Continue with {TEMPLATE_METADATA[selectedTemplate].name}
          </Button>
        </div>
      )}
    </div>
  );
}

export default TemplateSelector;
