'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle } from 'lucide-react';

interface ProfileCompletenessIndicatorProps {
  sectionsCompleted: string[];
  totalSections: number;
}

const SECTION_NAMES: Record<string, string> = {
  demographics: 'Demographics',
  medicalHistory: 'Medical History',
  allergies: 'Allergies',
  medications: 'Medications',
  emergencyContacts: 'Emergency Contacts',
  healthcareProxy: 'Healthcare Proxy',
  insurance: 'Insurance',
  lifestyle: 'Lifestyle',
  familyHistory: 'Family History',
  immunizations: 'Immunizations',
  advanceDirectives: 'Advance Directives',
  medicalBio: 'Medical Biography',
};

const ALL_SECTIONS = [
  'demographics',
  'medicalHistory',
  'allergies',
  'medications',
  'emergencyContacts',
  'healthcareProxy',
  'insurance',
  'lifestyle',
  'familyHistory',
  'immunizations',
  'advanceDirectives',
  'medicalBio',
];

export function ProfileCompletenessIndicator({
  sectionsCompleted,
  totalSections = ALL_SECTIONS.length,
}: ProfileCompletenessIndicatorProps) {
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
        <p className="text-sm text-text-secondary">{getCompletionMessage()}</p>

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

