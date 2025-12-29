'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileSectionProps {
  title: string;
  icon: LucideIcon;
  isExpanded: boolean;
  onToggle: () => void;
  isComplete?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ProfileSection({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  isComplete = false,
  children,
  className,
}: ProfileSectionProps) {
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
        aria-controls={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zenthea-teal/10 rounded-lg" aria-hidden="true">
              <Icon className="h-5 w-5 text-zenthea-teal" />
            </div>
            <CardTitle 
              id={`section-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-lg"
            >
              {title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isComplete && (
              <Badge variant="secondary" className="bg-status-success-bg text-status-success border-status-success border-opacity-30">
                Complete
              </Badge>
            )}
            <ChevronDown
              className={cn(
                'h-5 w-5 text-text-secondary transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent
          id={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
          role="region"
          aria-labelledby={`section-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {children}
        </CardContent>
      )}
    </Card>
  );
}

