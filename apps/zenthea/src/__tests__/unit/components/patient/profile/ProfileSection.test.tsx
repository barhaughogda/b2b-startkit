import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileSection } from '@/components/patient/profile/ProfileSection';
import { User } from 'lucide-react';

describe('ProfileSection', () => {
  it('should render section title and icon', () => {
    render(
      <ProfileSection
        title="Test Section"
        icon={User}
        isExpanded={false}
        onToggle={vi.fn()}
      >
        <div>Test Content</div>
      </ProfileSection>
    );

    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  it('should toggle expansion on click', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <ProfileSection
        title="Test Section"
        icon={User}
        isExpanded={false}
        onToggle={onToggle}
      >
        <div>Test Content</div>
      </ProfileSection>
    );

    const header = screen.getByRole('button');
    await user.click(header);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('should toggle expansion on Enter key', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <ProfileSection
        title="Test Section"
        icon={User}
        isExpanded={false}
        onToggle={onToggle}
      >
        <div>Test Content</div>
      </ProfileSection>
    );

    const header = screen.getByRole('button');
    header.focus();
    await user.keyboard('{Enter}');

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('should show content when expanded', () => {
    render(
      <ProfileSection
        title="Test Section"
        icon={User}
        isExpanded={true}
        onToggle={vi.fn()}
      >
        <div>Test Content</div>
      </ProfileSection>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should hide content when collapsed', () => {
    render(
      <ProfileSection
        title="Test Section"
        icon={User}
        isExpanded={false}
        onToggle={vi.fn()}
      >
        <div>Test Content</div>
      </ProfileSection>
    );

    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });

  it('should display complete badge when isComplete is true', () => {
    render(
      <ProfileSection
        title="Test Section"
        icon={User}
        isExpanded={false}
        onToggle={vi.fn()}
        isComplete={true}
      >
        <div>Test Content</div>
      </ProfileSection>
    );

    expect(screen.getByText('Complete')).toBeInTheDocument();
  });
});

