/**
 * Provider Profile Integration Tests
 * 
 * Tests the complete flow of provider profile creation, editing, and viewing
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderProfileCard } from '@/components/provider/ProviderProfileCard';
import { ProviderProfileHeader } from '@/components/provider/ProviderProfileHeader';
import { ProviderCredentials } from '@/components/provider/ProviderCredentials';
import { ProviderPhilosophy } from '@/components/provider/ProviderPhilosophy';
import { ProviderVideoIntro } from '@/components/provider/ProviderVideoIntro';
import { ProviderContactActions } from '@/components/provider/ProviderContactActions';
import { ProviderProfile } from '@/types';

describe('Provider Profile Components Integration', () => {
  const mockProfile: Partial<ProviderProfile> = {
    _id: 'profile-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    specialties: ['Internal Medicine', 'Cardiology'],
    languages: ['English', 'Spanish'],
    bio: 'Experienced physician with 15 years of practice.',
    detailedBio: 'Dr. Smith specializes in preventive care and chronic disease management.',
    philosophyOfCare: 'I believe in patient-centered care and shared decision-making.',
    professionalPhotoUrl: 'https://example.com/photo.jpg',
    professionalPhotoAltText: 'Dr. Smith professional photo',
    boardCertifications: [{
      board: 'American Board of Internal Medicine',
      specialty: 'Internal Medicine',
      verified: true
    }],
    education: [{
      degree: 'MD',
      institution: 'Harvard Medical School',
      graduationYear: 2008,
      verified: true
    }],
    visibility: {
      npi: 'private',
      licenseNumber: 'private',
      specialties: 'public',
      boardCertifications: 'public',
      education: 'public',
      certifications: 'public',
      bio: 'public',
      detailedBio: 'portal',
      philosophyOfCare: 'portal',
      communicationStyle: 'portal',
      whyIBecameADoctor: 'portal',
      languages: 'public',
      personalInterests: 'portal',
      communityInvolvement: 'portal',
      professionalPhoto: 'public',
      introductionVideo: 'portal',
      hospitalAffiliations: 'public',
      insuranceAccepted: 'public',
      conditionsTreated: 'public',
      proceduresPerformed: 'public',
      researchInterests: 'public',
      publications: 'public',
      testimonials: 'portal'
    },
    completionPercentage: 85,
    isVerified: true,
    isPublished: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const mockUser = {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com'
  };

  describe('ProviderProfileCard', () => {
    it('should render profile card with basic information', () => {
      render(
        <ProviderProfileCard
          profile={mockProfile}
          user={mockUser}
          showActions={true}
        />
      );

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Internal Medicine')).toBeInTheDocument();
    });

    it('should display languages as badges', () => {
      render(
        <ProviderProfileCard
          profile={mockProfile}
          user={mockUser}
        />
      );

      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('Spanish')).toBeInTheDocument();
    });
  });

  describe('ProviderProfileHeader', () => {
    it('should render header with provider name and specialties', () => {
      render(
        <ProviderProfileHeader
          profile={mockProfile}
          user={mockUser}
        />
      );

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Internal Medicine')).toBeInTheDocument();
    });
  });

  describe('ProviderCredentials', () => {
    it('should render board certifications', () => {
      render(
        <ProviderCredentials
          boardCertifications={mockProfile.boardCertifications}
          education={mockProfile.education}
        />
      );

      expect(screen.getByText('Board Certifications')).toBeInTheDocument();
      expect(screen.getByText('Internal Medicine')).toBeInTheDocument();
    });

    it('should render education', () => {
      render(
        <ProviderCredentials
          education={mockProfile.education}
        />
      );

      expect(screen.getByText('Education')).toBeInTheDocument();
      expect(screen.getByText(/MD/)).toBeInTheDocument();
      expect(screen.getByText(/Harvard Medical School/)).toBeInTheDocument();
    });
  });

  describe('ProviderPhilosophy', () => {
    it('should render philosophy of care', () => {
      render(
        <ProviderPhilosophy
          philosophyOfCare={mockProfile.philosophyOfCare}
        />
      );

      expect(screen.getByText('Philosophy of Care')).toBeInTheDocument();
      expect(screen.getByText(/patient-centered care/)).toBeInTheDocument();
    });
  });

  describe('ProviderVideoIntro', () => {
    it('should not render if no video URL', () => {
      const { container } = render(
        <ProviderVideoIntro />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render video player when URL provided', () => {
      render(
        <ProviderVideoIntro
          videoUrl="https://youtube.com/watch?v=test"
        />
      );

      expect(screen.getByText('Video Introduction')).toBeInTheDocument();
    });
  });

  describe('ProviderContactActions', () => {
    it('should render schedule and message buttons', () => {
      const handleSchedule = () => {};
      const handleMessage = () => {};

      render(
        <ProviderContactActions
          providerId="provider-1"
          onScheduleClick={handleSchedule}
          onMessageClick={handleMessage}
        />
      );

      expect(screen.getByText('Schedule Appointment')).toBeInTheDocument();
      expect(screen.getByText('Send Message')).toBeInTheDocument();
    });
  });
});
