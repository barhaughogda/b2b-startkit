'use client';

/**
 * SiteStructureSelector Component
 * 
 * Allows users to choose between:
 * - One-Pager: Single scrollable page with anchor navigation
 * - Multi-Page: Separate pages with real URL routing
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type SiteStructure, siteStructureMetadata } from '@/lib/website-builder/schema';
import { cn } from '@/lib/utils';
import { Check, FileText, Files } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface SiteStructureSelectorProps {
  selectedStructure?: SiteStructure;
  onSelect: (structure: SiteStructure) => void;
  disabled?: boolean;
  hideHeader?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SiteStructureSelector({
  selectedStructure,
  onSelect,
  disabled,
  hideHeader,
}: SiteStructureSelectorProps) {
  const structures: SiteStructure[] = ['one-pager', 'multi-page'];

  const getIcon = (structure: SiteStructure) => {
    switch (structure) {
      case 'one-pager':
        return <FileText className="w-8 h-8" />;
      case 'multi-page':
        return <Files className="w-8 h-8" />;
      default:
        return <FileText className="w-8 h-8" />;
    }
  };

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-text-primary">
            Choose Your Site Structure
          </h3>
          <p className="text-sm text-text-secondary">
            This determines how visitors navigate your website
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {structures.map((structure) => {
          const metadata = siteStructureMetadata[structure];
          const isSelected = selectedStructure === structure;

          return (
            <Card
              key={structure}
              className={cn(
                'cursor-pointer transition-all relative overflow-hidden',
                isSelected
                  ? 'ring-2 ring-interactive-primary border-interactive-primary'
                  : 'hover:border-interactive-primary/50 hover:shadow-md',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => !disabled && onSelect(structure)}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-interactive-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'p-3 rounded-lg',
                      isSelected
                        ? 'bg-interactive-primary text-white'
                        : 'bg-surface-secondary text-text-secondary'
                    )}
                  >
                    {getIcon(structure)}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold text-text-primary">
                      {metadata.name}
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {metadata.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  {metadata.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm text-text-secondary"
                    >
                      <div
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          isSelected ? 'bg-interactive-primary' : 'bg-text-tertiary'
                        )}
                      />
                      {feature}
                    </div>
                  ))}
                </div>

                {structure === 'multi-page' && (
                  <Badge variant="outline" className="mt-3 text-xs">
                    Recommended
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional info */}
      <div className="text-center text-xs text-text-tertiary mt-4">
        You can change this later in Site Settings
      </div>
    </div>
  );
}

export default SiteStructureSelector;

