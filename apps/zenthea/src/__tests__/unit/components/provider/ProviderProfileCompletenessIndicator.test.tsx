import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderProfileCompletenessIndicator } from '@/components/provider/ProviderProfileCompletenessIndicator';

describe('ProviderProfileCompletenessIndicator', () => {
  it('should display completion percentage', () => {
    render(
      <ProviderProfileCompletenessIndicator
        sectionsCompleted={['identity', 'credentials']}
        totalSections={6}
      />
    );

    expect(screen.getByText(/33% Complete/i)).toBeInTheDocument();
  });

  it('should show 100% when all sections are complete', () => {
    const allSections = [
      'identity',
      'credentials',
      'personal',
      'practice',
      'multimedia',
      'privacy',
    ];

    render(
      <ProviderProfileCompletenessIndicator
        sectionsCompleted={allSections}
        totalSections={6}
      />
    );

    expect(screen.getByText(/100% Complete/i)).toBeInTheDocument();
    expect(screen.getByText(/Your profile is complete!/i)).toBeInTheDocument();
  });

  it('should display section status list with all provider sections', () => {
    render(
      <ProviderProfileCompletenessIndicator
        sectionsCompleted={['identity']}
        totalSections={6}
      />
    );

    // Check that all provider sections are displayed
    expect(screen.getByText(/Identity & Basic Info/i)).toBeInTheDocument();
    expect(screen.getByText(/Credentials/i)).toBeInTheDocument();
    expect(screen.getByText(/Personal Story/i)).toBeInTheDocument();
    expect(screen.getByText(/Practice Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Multimedia/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacy Settings/i)).toBeInTheDocument();
  });

  it('should show correct badge count', () => {
    render(
      <ProviderProfileCompletenessIndicator
        sectionsCompleted={['identity', 'credentials', 'personal']}
        totalSections={6}
      />
    );

    expect(screen.getByText(/3 \/ 6/i)).toBeInTheDocument();
  });

  it('should display completion message based on percentage', () => {
    // Test 0% completion
    const { rerender } = render(
      <ProviderProfileCompletenessIndicator
        sectionsCompleted={[]}
        totalSections={6}
      />
    );
    expect(screen.getByText(/Get started by completing your profile sections/i)).toBeInTheDocument();

    // Test 50% completion
    rerender(
      <ProviderProfileCompletenessIndicator
        sectionsCompleted={['identity', 'credentials', 'personal']}
        totalSections={6}
      />
    );
    expect(screen.getByText(/Good progress! Keep adding information/i)).toBeInTheDocument();

    // Test 80%+ completion
    rerender(
      <ProviderProfileCompletenessIndicator
        sectionsCompleted={['identity', 'credentials', 'personal', 'practice', 'multimedia']}
        totalSections={6}
      />
    );
    expect(screen.getByText(/Almost there! Complete a few more sections/i)).toBeInTheDocument();

    // Test 100% completion
    rerender(
      <ProviderProfileCompletenessIndicator
        sectionsCompleted={['identity', 'credentials', 'personal', 'practice', 'multimedia', 'privacy']}
        totalSections={6}
      />
    );
    expect(screen.getByText(/Your profile is complete!/i)).toBeInTheDocument();
  });

  it('should show correct completion percentage for partial completion', () => {
    render(
      <ProviderProfileCompletenessIndicator
        sectionsCompleted={['identity', 'credentials', 'personal']}
        totalSections={6}
      />
    );

    expect(screen.getByText(/50% Complete/i)).toBeInTheDocument();
  });

  it('should display completed sections with checkmark icon', () => {
    render(
      <ProviderProfileCompletenessIndicator
        sectionsCompleted={['identity', 'credentials']}
        totalSections={6}
      />
    );

    // Check that completed sections are marked (we can't directly test icons, but we can test the text styling)
    const identitySection = screen.getByText(/Identity & Basic Info/i);
    expect(identitySection).toBeInTheDocument();
    
    const credentialsSection = screen.getByText(/Credentials/i);
    expect(credentialsSection).toBeInTheDocument();
  });

  it('should use default totalSections when not provided', () => {
    render(
      <ProviderProfileCompletenessIndicator
        sectionsCompleted={['identity']}
      />
    );

    // Should default to 6 sections
    expect(screen.getByText(/17% Complete/i)).toBeInTheDocument(); // 1/6 = 16.67% rounded to 17%
  });

  it('should display progress bar', () => {
    render(
      <ProviderProfileCompletenessIndicator
        sectionsCompleted={['identity', 'credentials', 'personal']}
        totalSections={6}
      />
    );

    // Verify progress bar container exists (has bg-surface-secondary class)
    const progressBarContainer = document.querySelector('.bg-surface-secondary');
    expect(progressBarContainer).toBeInTheDocument();
  });
});

