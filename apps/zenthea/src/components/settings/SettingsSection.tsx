'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  defaultExpanded?: boolean;
}

/**
 * SettingsSection Component
 * 
 * A collapsible section component for organizing settings into logical groups.
 * Provides a consistent, accessible interface for expandable/collapsible content.
 * 
 * @example
 * ```tsx
 * <SettingsSection
 *   title="Notifications"
 *   description="Configure your notification preferences"
 *   icon={Bell}
 *   isExpanded={notificationsExpanded}
 *   onToggle={() => setNotificationsExpanded(!notificationsExpanded)}
 * >
 *   <div className="space-y-4">
 *     {/* Settings content here *\/}
 *   </div>
 * </SettingsSection>
 * ```
 */
export function SettingsSection({
  title,
  description,
  icon: Icon,
  isExpanded,
  onToggle,
  children,
  className,
}: SettingsSectionProps) {
  const sectionId = title.toLowerCase().replace(/\s+/g, '-');

  return (
    <Card className={cn('transition-all duration-200', className)}>
      <CardHeader
        onClick={onToggle}
        className="cursor-pointer hover:bg-surface-elevated transition-colors"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isExpanded}
        aria-controls={`settings-section-${sectionId}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div 
              className="p-2 bg-zenthea-teal/10 rounded-lg flex-shrink-0" 
              aria-hidden="true"
            >
              <Icon className="h-5 w-5 text-zenthea-teal" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle 
                id={`settings-section-title-${sectionId}`}
                className="text-lg mb-0"
              >
                {title}
              </CardTitle>
              {description && (
                <CardDescription className="mt-1.5">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 text-text-secondary transition-transform duration-200 flex-shrink-0 ml-2',
              isExpanded && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent
          id={`settings-section-${sectionId}`}
          role="region"
          aria-labelledby={`settings-section-title-${sectionId}`}
          className="pt-0"
        >
          {children}
        </CardContent>
      )}
    </Card>
  );
}
