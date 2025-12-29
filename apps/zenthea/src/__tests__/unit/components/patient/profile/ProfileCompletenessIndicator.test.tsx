import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfileCompletenessIndicator } from '@/components/patient/profile/ProfileCompletenessIndicator';

describe('ProfileCompletenessIndicator', () => {
  it('should display completion percentage', () => {
    render(
      <ProfileCompletenessIndicator
        sectionsCompleted={['demographics', 'allergies']}
        totalSections={12}
      />
    );

    expect(screen.getByText(/17% Complete/i)).toBeInTheDocument();
  });

  it('should show 100% when all sections are complete', () => {
    const allSections = [
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

    render(
      <ProfileCompletenessIndicator
        sectionsCompleted={allSections}
        totalSections={12}
      />
    );

    expect(screen.getByText(/100% Complete/i)).toBeInTheDocument();
    expect(screen.getByText(/Your profile is complete!/i)).toBeInTheDocument();
  });

  it('should display section status list', () => {
    render(
      <ProfileCompletenessIndicator
        sectionsCompleted={['demographics']}
        totalSections={12}
      />
    );

    expect(screen.getByText(/Demographics/i)).toBeInTheDocument();
    expect(screen.getByText(/Medical History/i)).toBeInTheDocument();
  });
});

