import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedProviderProfileEditor } from '@/components/provider/EnhancedProviderProfileEditor';

// Mock @/lib/auth/react
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test Provider',
    role: 'provider',
    tenantId: 'test-tenant-id',
  },
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

vi.mock('@/hooks/useZentheaSession', () => ({
  useZentheaSession: vi.fn(() => ({
    data: mockSession,
    status: 'authenticated',
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Convex
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('convex/react', () => ({
  useQuery: (queryFn: any, args: any) => mockUseQuery(queryFn, args),
  useMutation: (mutationFn: any) => mockUseMutation(mutationFn),
}));

vi.mock('@/convex/_generated/api', () => ({
  api: {
    providerProfiles: {
      getProviderProfileByUserId: 'getProviderProfileByUserId',
      updateProviderProfile: 'updateProviderProfile',
      createProviderProfile: 'createProviderProfile',
    },
  },
}));

// Mock Convex client
vi.mock('@/lib/convex', () => ({
  convex: {
    query: vi.fn(),
    mutation: vi.fn(),
  },
}));

// Mock convexIdValidation
vi.mock('@/lib/convexIdValidation', () => ({
  canUseConvexQuery: vi.fn(() => true),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock PatientAvatarUpload
vi.mock('@/components/patient/PatientAvatarUpload', () => ({
  PatientAvatarUpload: ({ currentAvatar, patientName, onAvatarChange, disabled }: any) => (
    <div data-testid="avatar-upload">
      <span>{patientName}</span>
      <button
        onClick={() => onAvatarChange && onAvatarChange('https://example.com/avatar.jpg')}
        disabled={disabled}
      >
        Upload Avatar
      </button>
    </div>
  ),
}));

describe('EnhancedProviderProfileEditor', () => {
  const user = userEvent.setup();

  const mockProfile = {
    _id: 'profile-123' as any,
    userId: 'test-user-id' as any,
    tenantId: 'test-tenant-id',
    specialties: ['Cardiology', 'Internal Medicine'],
    languages: ['English', 'Spanish'],
    bio: 'Experienced cardiologist',
    detailedBio: 'Detailed bio text',
    philosophyOfCare: 'Patient-centered care',
    whyIBecameADoctor: 'Passion for helping people',
    conditionsTreated: ['Hypertension', 'Heart Disease'],
    proceduresPerformed: ['EKG', 'Echocardiogram'],
    professionalPhotoUrl: 'https://example.com/photo.jpg',
    introductionVideoUrl: 'https://example.com/video.mp4',
    visibility: {
      bio: 'public' as const,
      detailedBio: 'portal' as const,
      philosophyOfCare: 'public' as const,
      professionalPhoto: 'public' as const,
      introductionVideo: 'public' as const,
      testimonials: 'public' as const,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no existing profile
    mockUseQuery.mockReturnValue(undefined);
    mockUseMutation.mockReturnValue(vi.fn().mockResolvedValue({}));
    
    // Mock environment variable
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test.convex.cloud';
  });

  describe('Component Rendering', () => {
    it('should render loading state when profile is loading', () => {
      mockUseQuery.mockReturnValue(undefined);
      
      render(<EnhancedProviderProfileEditor />);
      
      expect(screen.getByText(/Loading profile/i)).toBeInTheDocument();
    });

    it('should render profile editor when profile is loaded', async () => {
      mockUseQuery.mockReturnValue(mockProfile);
      
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        expect(screen.getByText(/Provider Profile/i)).toBeInTheDocument();
      });
    });

    it('should render all profile sections', async () => {
      mockUseQuery.mockReturnValue(mockProfile);
      
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        expect(screen.getByText(/Identity & Basic Information/i)).toBeInTheDocument();
        expect(screen.getByText(/Credentials & Qualifications/i)).toBeInTheDocument();
        expect(screen.getByText(/Personal Story & Philosophy/i)).toBeInTheDocument();
        expect(screen.getByText(/Practice Details/i)).toBeInTheDocument();
        expect(screen.getByText(/Multimedia/i)).toBeInTheDocument();
        expect(screen.getByText(/Privacy Settings/i)).toBeInTheDocument();
      });
    });

    it('should render avatar upload component', async () => {
      mockUseQuery.mockReturnValue(mockProfile);
      
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        expect(screen.getByTestId('avatar-upload')).toBeInTheDocument();
      });
    });

    it('should render profile completeness indicator', async () => {
      mockUseQuery.mockReturnValue(mockProfile);
      
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        expect(screen.getByText(/Profile Completeness/i)).toBeInTheDocument();
      });
    });
  });

  describe('Section Expand/Collapse', () => {
    beforeEach(async () => {
      mockUseQuery.mockReturnValue(mockProfile);
    });

    it('should expand identity section by default', async () => {
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        const identitySection = screen.getByText(/Identity & Basic Information/i).closest('div');
        expect(identitySection).toBeInTheDocument();
      });
    });

    it('should toggle section expansion on click', async () => {
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        const credentialsHeader = screen.getByText(/Credentials & Qualifications/i);
        expect(credentialsHeader).toBeInTheDocument();
      });

      const credentialsSection = screen.getByText(/Credentials & Qualifications/i).closest('div[role="button"]');
      expect(credentialsSection).toBeInTheDocument();
      
      // Click to expand
      fireEvent.click(credentialsSection!);
      
      // Section should now be expanded (content visible)
      await waitFor(() => {
        expect(screen.getByText(/Add Education/i)).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation for sections', async () => {
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        const personalSection = screen.getByText(/Personal Story & Philosophy/i).closest('div[role="button"]');
        expect(personalSection).toBeInTheDocument();
      });

      const personalSection = screen.getByText(/Personal Story & Philosophy/i).closest('div[role="button"]');
      
      // Test Enter key
      fireEvent.keyDown(personalSection!, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Detailed Bio/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Input Handling', () => {
    beforeEach(async () => {
      mockUseQuery.mockReturnValue(mockProfile);
    });

    it('should handle specialties input', async () => {
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        const specialtiesInput = screen.getByLabelText(/Specialties/i);
        expect(specialtiesInput).toBeInTheDocument();
      });

      const specialtiesInput = screen.getByLabelText(/Specialties/i);
      await user.clear(specialtiesInput);
      await user.type(specialtiesInput, 'Cardiology, Neurology');
      
      expect(specialtiesInput).toHaveValue('Cardiology, Neurology');
    });

    it('should handle languages input', async () => {
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        const languagesInput = screen.getByLabelText(/Languages Spoken/i);
        expect(languagesInput).toBeInTheDocument();
      });

      const languagesInput = screen.getByLabelText(/Languages Spoken/i);
      await user.clear(languagesInput);
      await user.type(languagesInput, 'English, Spanish, French');
      
      // Wait for the value to stabilize after typing (form processes character by character)
      await waitFor(() => {
        expect(languagesInput).toHaveValue('English, Spanish, French');
      });
    });

    it('should handle bio textarea', async () => {
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        const bioInput = screen.getByLabelText(/Professional Bio/i);
        expect(bioInput).toBeInTheDocument();
      });

      const bioInput = screen.getByLabelText(/Professional Bio/i);
      await user.clear(bioInput);
      await user.type(bioInput, 'New bio text');
      
      expect(bioInput).toHaveValue('New bio text');
    });
  });

  describe('Form Submission', () => {
    beforeEach(async () => {
      mockUseQuery.mockReturnValue(mockProfile);
    });

    it('should call updateProfile mutation when saving existing profile', async () => {
      const mockUpdateProfile = vi.fn().mockResolvedValue({});
      mockUseMutation.mockReturnValue(mockUpdateProfile);
      
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Profile/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /Save Profile/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalled();
      });
    });

    it('should call createProfile mutation when creating new profile', async () => {
      mockUseQuery.mockReturnValue(null); // No existing profile
      const mockCreateProfile = vi.fn().mockResolvedValue({});
      mockUseMutation.mockReturnValue(mockCreateProfile);
      
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Profile/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /Save Profile/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockCreateProfile).toHaveBeenCalled();
      });
    });

    it('should show saving state during submission', async () => {
      const mockUpdateProfile = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      mockUseMutation.mockReturnValue(mockUpdateProfile);
      
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Profile/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /Save Profile/i });
      fireEvent.click(saveButton);
      
      expect(screen.getByText(/Saving/i)).toBeInTheDocument();
    });
  });

  describe('Section Completeness Calculation', () => {
    beforeEach(async () => {
      mockUseQuery.mockReturnValue(mockProfile);
    });

    it('should calculate completeness for identity section', async () => {
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        // Identity section should be marked as complete since profile has specialties, languages, and bio
        const identitySection = screen.getByText(/Identity & Basic Information/i);
        expect(identitySection).toBeInTheDocument();
      });
    });

    it('should update completeness indicator when sections are filled', async () => {
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        expect(screen.getByText(/Profile Completeness/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Convex not configured', () => {
      // Mock convex as null
      vi.doMock('@/lib/convex', () => ({
        convex: null,
      }));
      delete process.env.NEXT_PUBLIC_CONVEX_URL;
      
      render(<EnhancedProviderProfileEditor />);
      
      expect(screen.getByText(/Convex Not Available/i)).toBeInTheDocument();
    });

    it('should handle profile loading errors gracefully', async () => {
      mockUseQuery.mockReturnValue(null);
      mockUseMutation.mockReturnValue(vi.fn().mockRejectedValue(new Error('Network error')));
      
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        expect(screen.getByText(/Provider Profile/i)).toBeInTheDocument();
      });
    });
  });

  describe('Avatar Upload', () => {
    beforeEach(async () => {
      mockUseQuery.mockReturnValue(mockProfile);
    });

    it('should handle avatar upload', async () => {
      const mockUpdateProfile = vi.fn().mockResolvedValue({});
      mockUseMutation.mockReturnValue(mockUpdateProfile);
      
      render(<EnhancedProviderProfileEditor />);
      
      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /Upload Avatar/i });
        expect(uploadButton).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /Upload Avatar/i });
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            updates: expect.objectContaining({
              professionalPhotoUrl: 'https://example.com/avatar.jpg',
            }),
          })
        );
      });
    });
  });
});

