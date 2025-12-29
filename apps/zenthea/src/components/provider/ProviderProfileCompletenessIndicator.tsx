'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle } from 'lucide-react';

interface ProviderProfileCompletenessIndicatorProps {
  /** Array of section IDs that have been completed */
  sectionsCompleted: string[];
  /** Total number of sections (defaults to ALL_SECTIONS.length) */
  totalSections?: number;
}

/**
 * Human-readable names for each provider profile section
 */
const SECTION_NAMES: Record<string, string> = {
  contact: 'Contact Information',
  identity: 'Identity & Basic Info',
  credentials: 'Credentials',
  personal: 'Personal Story',
  practice: 'Practice Details',
  multimedia: 'Multimedia',
  privacy: 'Privacy Settings',
};

/**
 * List of all provider profile sections in order
 * Exported for reuse in other components (e.g., completeness calculations)
 */
export const ALL_SECTIONS = [
  'contact',
  'identity',
  'credentials',
  'personal',
  'practice',
  'multimedia',
  'privacy',
] as const;

/**
 * ProviderProfileCompletenessIndicator Component
 *
 * Displays a visual indicator of profile completion progress with:
 * - Completion percentage and progress bar
 * - List of all sections with completion status
 * - Motivational messages based on completion level
 *
 * Matches the design pattern used in PatientProfileCompletenessIndicator
 * for consistency across the application.
 *
 * @example
 * ```tsx
 * <ProviderProfileCompletenessIndicator
 *   sectionsCompleted={['identity', 'credentials']}
 *   totalSections={6}
 * />
 * ```
 */
export function ProviderProfileCompletenessIndicator({
  sectionsCompleted,
  totalSections = ALL_SECTIONS.length,
}: ProviderProfileCompletenessIndicatorProps) {
  const completionPercentage = Math.round((sectionsCompleted.length / totalSections) * 100);

  const getCompletionColor = () => {
    if (completionPercentage >= 80) return 'text-status-success';
    if (completionPercentage >= 50) return 'text-status-warning';
    return 'text-status-error';
  };

  const getCompletionMessage = () => {
    if (completionPercentage === 100) {
      return 'Your profile is complete!';
    }
    if (completionPercentage >= 80) {
      return 'Almost there! Complete a few more sections.';
    }
    if (completionPercentage >= 50) {
      return 'Good progress! Keep adding information.';
    }
    return 'Get started by completing your profile sections.';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Profile Completeness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              {completionPercentage}% Complete
            </span>
            <Badge variant={completionPercentage === 100 ? 'default' : 'secondary'}>
              {sectionsCompleted.length} / {totalSections}
            </Badge>
          </div>
          <div className="w-full bg-surface-secondary rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getCompletionColor()}`}
              style={{ width: `${completionPercentage}%` }}
            >
              <div className="h-full bg-zenthea-teal opacity-80" />
            </div>
          </div>
        </div>

        {/* Completion Message */}
        <p className={`text-sm ${completionPercentage === 100 ? 'text-zenthea-teal' : 'text-text-secondary'}`}>
          {getCompletionMessage()}
        </p>

        {/* Section Status List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {ALL_SECTIONS.map((section) => {
            const isCompleted = sectionsCompleted.includes(section);
            return (
              <div
                key={section}
                className="flex items-center gap-2 text-sm"
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-status-success" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                )}
                <span className={isCompleted ? 'text-text-primary' : 'text-text-tertiary'}>
                  {SECTION_NAMES[section] || section}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

