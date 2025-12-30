import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientProfileDashboard } from '@/components/patient/PatientProfileDashboard';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useQuery } from 'convex/react';
import { usePatientProfileData } from '@/hooks/usePatientProfileData';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
// Use relative import for Convex generated files (they're at root level, not in src/)
// File is 6 levels deep: src/__tests__/unit/components/patient/
// Need 6 ../ segments to reach root where convex/ is located
// Mock Id type from Convex - using string type assertion instead of importing
// This avoids issues when convex codegen hasn't been run
type Id<T extends string> = string & { __tableName: T };

// Mock @/lib/auth
const mockUseSession = vi.fn();
vi.mock('@/hooks/useZentheaSession', () => ({
  useZentheaSession: () => mockUseSession(),
}));

// Mock Convex
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
vi.mock('convex/react', () => ({
  useQuery: (queryFn: any, args: any) => mockUseQuery(queryFn, args),
  useMutation: (mutationFn: any) => mockUseMutation(mutationFn),
}));

// Mock extracted hooks
const mockUsePatientProfileData = vi.fn();
vi.mock('@/hooks/usePatientProfileData', () => ({
  usePatientProfileData: () => mockUsePatientProfileData(),
}));

const mockUseProfileCompleteness = vi.fn();
vi.mock('@/hooks/useProfileCompleteness', () => ({
  useProfileCompleteness: (profile: any) => mockUseProfileCompleteness(profile),
}));

// Mock layout component
vi.mock('@/components/patient/dashboard/PatientDashboardLayout', () => ({
  PatientDashboardLayout: ({ patientId, patientProfile }: { patientId: string; patientProfile: any }) => (
    <div data-testid="patient-dashboard-layout">
      Layout for {patientId}
    </div>
  ),
}));

// Mock convex-api-types
vi.mock('@/lib/convex-api-types', () => ({
  getPatientProfileApi: vi.fn(() => ({
    updatePatientAvatar: vi.fn(),
  })),
}));

// Mock convex api
vi.mock('../../../convex/_generated/api', () => ({
  api: {
    patientProfile: {
      updatePatientAvatar: vi.fn(),
    },
  },
}));

// Mock all profile form components
vi.mock('@/components/patient/profile/DemographicsForm', () => ({
  DemographicsForm: ({ patientId }: { patientId: Id<'patients'> }) => (
    <div data-testid="demographics-form">Demographics Form for {patientId}</div>
  ),
}));

vi.mock('@/components/patient/profile/MedicalHistoryForm', () => ({
  MedicalHistoryForm: ({ patientId }: { patientId: Id<'patients'> }) => (
    <div data-testid="medical-history-form">Medical History Form for {patientId}</div>
  ),
}));

vi.mock('@/components/patient/profile/AllergiesForm', () => ({
  AllergiesForm: ({ patientId }: { patientId: Id<'patients'> }) => (
    <div data-testid="allergies-form">Allergies Form for {patientId}</div>
  ),
}));

vi.mock('@/components/patient/profile/MedicationsForm', () => ({
  MedicationsForm: ({ patientId }: { patientId: Id<'patients'> }) => (
    <div data-testid="medications-form">Medications Form for {patientId}</div>
  ),
}));

vi.mock('@/components/patient/profile/EmergencyContactsForm', () => ({
  EmergencyContactsForm: ({ patientId }: { patientId: Id<'patients'> }) => (
    <div data-testid="emergency-contacts-form">Emergency Contacts Form for {patientId}</div>
  ),
}));

vi.mock('@/components/patient/profile/InsuranceForm', () => ({
  InsuranceForm: ({ patientId }: { patientId: Id<'patients'> }) => (
    <div data-testid="insurance-form">Insurance Form for {patientId}</div>
  ),
}));

vi.mock('@/components/patient/profile/LifestyleForm', () => ({
  LifestyleForm: ({ patientId }: { patientId: Id<'patients'> }) => (
    <div data-testid="lifestyle-form">Lifestyle Form for {patientId}</div>
  ),
}));

vi.mock('@/components/patient/profile/FamilyHistoryForm', () => ({
  FamilyHistoryForm: ({ patientId }: { patientId: Id<'patients'> }) => (
    <div data-testid="family-history-form">Family History Form for {patientId}</div>
  ),
}));

vi.mock('@/components/patient/profile/ImmunizationsForm', () => ({
  ImmunizationsForm: ({ patientId }: { patientId: Id<'patients'> }) => (
    <div data-testid="immunizations-form">Immunizations Form for {patientId}</div>
  ),
}));

vi.mock('@/components/patient/profile/AdvanceDirectivesForm', () => ({
  AdvanceDirectivesForm: ({ patientId }: { patientId: Id<'patients'> }) => (
    <div data-testid="advance-directives-form">Advance Directives Form for {patientId}</div>
  ),
}));

vi.mock('@/components/patient/profile/MedicalBioForm', () => ({
  MedicalBioForm: ({ patientId }: { patientId: Id<'patients'> }) => (
    <div data-testid="medical-bio-form">Medical Bio Form for {patientId}</div>
  ),
}));

// Mock ProfileSection and ProfileCompletenessIndicator
vi.mock('@/components/patient/profile/ProfileSection', () => ({
  ProfileSection: ({ 
    title, 
    isExpanded, 
    onToggle, 
    children 
  }: { 
    title: string; 
    isExpanded: boolean; 
    onToggle: () => void; 
    children: React.ReactNode;
  }) => {
    const sectionId = title.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '').replace(/[^a-z0-9-]/g, '');
    return (
      <div data-testid={`profile-section-${sectionId}`}>
        <div 
          onClick={onToggle} 
          role="button"
          data-testid={`toggle-${sectionId}`}
          aria-expanded={isExpanded}
        >
          {title} {isExpanded ? '▼' : '▶'}
        </div>
        {isExpanded && <div data-testid={`content-${sectionId}`}>{children}</div>}
      </div>
    );
  },
}));

vi.mock('@/components/patient/profile/ProfileCompletenessIndicator', () => ({
  ProfileCompletenessIndicator: ({ 
    sectionsCompleted, 
    totalSections 
  }: { 
    sectionsCompleted: number; 
    totalSections: number;
  }) => (
    <div data-testid="profile-completeness-indicator">
      {sectionsCompleted} / {totalSections} sections completed
    </div>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  User: () => <div data-testid="icon-user" />,
  Heart: () => <div data-testid="icon-heart" />,
  AlertTriangle: () => <div data-testid="icon-alert-triangle" />,
  Pill: () => <div data-testid="icon-pill" />,
  Phone: () => <div data-testid="icon-phone" />,
  CreditCard: () => <div data-testid="icon-credit-card" />,
  Activity: () => <div data-testid="icon-activity" />,
  Users: () => <div data-testid="icon-users" />,
  Syringe: () => <div data-testid="icon-syringe" />,
  FileText: () => <div data-testid="icon-file-text" />,
  BookOpen: () => <div data-testid="icon-book-open" />,
}));

describe('PatientProfileDashboard', () => {
  const mockPatientId = 'patient-123' as Id<'patients'>;
  const mockEmail = 'patient@example.com';
  const mockTenantId = 'demo-tenant-1';

  const mockSession = {
    user: {
      id: mockPatientId,
      email: mockEmail,
      name: 'John Doe',
      tenantId: mockTenantId,
    },
    expires: '2024-12-31',
  };

  const mockPatientProfile = {
    firstName: 'John',
    lastName: 'Doe',
    email: mockEmail,
    gender: 'male',
    primaryLanguage: 'en',
    dateOfBirth: '1990-01-01',
    preferredName: 'Johnny',
    genderIdentity: 'male',
    preferredPronouns: 'He/Him',
    maritalStatus: 'single',
    occupation: 'Engineer',
    race: 'White',
    ethnicity: 'Not Hispanic',
    cellPhone: '555-1234',
    workPhone: '555-5678',
    medicalHistory: {
      chronicConditions: [],
      surgeries: [],
      hospitalizations: [],
    },
    allergies: {
      medications: [],
      foods: [],
      environmental: [],
      other: [],
    },
    medications: [],
    emergencyContacts: [],
    healthcareProxy: null,
    insurance: {
      primary: null,
      secondary: null,
    },
    lifestyle: {
      smokingStatus: 'never',
    },
    familyHistory: [],
    immunizations: [],
    advanceDirectives: {
      hasLivingWill: false,
      hasDNR: false,
      hasPOLST: false,
    },
    medicalBio: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });
    
    // Default mock for usePatientProfileData
    mockUsePatientProfileData.mockReturnValue({
      patientId: mockPatientId,
      patientProfile: mockPatientProfile,
      isLoading: false,
      queriesSkipped: false,
      patientEmail: mockEmail,
      tenantId: mockTenantId,
    });
    
    // Default mock for useProfileCompleteness
    mockUseProfileCompleteness.mockReturnValue({
      getSectionCompleteness: (section: string) => {
        if (section === 'demographics') {
          return !!(mockPatientProfile.gender && mockPatientProfile.primaryLanguage);
        }
        return false;
      },
      sectionsCompleted: ['demographics'],
    });
    
    // Default mock for useMutation (avatar update)
    const mockMutationFn = vi.fn().mockResolvedValue(undefined);
    mockUseMutation.mockReturnValue(mockMutationFn);
  });

  describe('Loading State', () => {
    it('should show loading state when patient ID is undefined', () => {
      mockUsePatientProfileData.mockReturnValue({
        patientId: undefined,
        patientProfile: undefined,
        isLoading: true,
        queriesSkipped: false,
        patientEmail: mockEmail,
        tenantId: mockTenantId,
      });

      render(<PatientProfileDashboard />);

      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });

    it('should show loading state when patient profile is undefined', () => {
      mockUsePatientProfileData.mockReturnValue({
        patientId: mockPatientId,
        patientProfile: undefined,
        isLoading: true,
        queriesSkipped: false,
        patientEmail: mockEmail,
        tenantId: mockTenantId,
      });

      render(<PatientProfileDashboard />);

      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when patient not found', () => {
      mockUsePatientProfileData.mockReturnValue({
        patientId: null,
        patientProfile: null,
        isLoading: false,
        queriesSkipped: false,
        patientEmail: mockEmail,
        tenantId: mockTenantId,
      });

      render(<PatientProfileDashboard />);

      expect(screen.getByText(/Patient profile not found/i)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(mockEmail))).toBeInTheDocument();
    });

    it('should show error message when patient ID exists but profile is null', () => {
      mockUsePatientProfileData.mockReturnValue({
        patientId: mockPatientId,
        patientProfile: null,
        isLoading: false,
        queriesSkipped: false,
        patientEmail: mockEmail,
        tenantId: mockTenantId,
      });

      render(<PatientProfileDashboard />);

      expect(screen.getByText(/Patient profile not found/i)).toBeInTheDocument();
    });
  });

  describe('Rendering', () => {
    it('should render patient profile dashboard with header', () => {
      render(<PatientProfileDashboard />);

      expect(screen.getByTestId('patient-dashboard-layout')).toBeInTheDocument();
    });

    it('should render layout component with patient data', () => {
      render(<PatientProfileDashboard />);

      expect(screen.getByTestId('patient-dashboard-layout')).toBeInTheDocument();
      expect(screen.getByText(/Layout for patient-123/i)).toBeInTheDocument();
    });
  });

  describe('Section Expansion', () => {
    it('should render layout component which handles section expansion', () => {
      render(<PatientProfileDashboard />);

      // Layout component handles section expansion internally
      expect(screen.getByTestId('patient-dashboard-layout')).toBeInTheDocument();
    });
  });

  describe('Profile Completeness Calculation', () => {
    it('should use completeness hook for calculations', () => {
      mockUseProfileCompleteness.mockReturnValue({
        getSectionCompleteness: (section: string) => section === 'demographics',
        sectionsCompleted: ['demographics'],
      });

      render(<PatientProfileDashboard />);

      expect(mockUseProfileCompleteness).toHaveBeenCalledWith(mockPatientProfile);
      expect(screen.getByTestId('patient-dashboard-layout')).toBeInTheDocument();
    });
  });

  describe('Age Calculation', () => {
    it('should pass profile data to layout component for age calculation', () => {
      const profileWithAge = {
        ...mockPatientProfile,
        dateOfBirth: '1990-01-01',
      };

      mockUsePatientProfileData.mockReturnValue({
        patientId: mockPatientId,
        patientProfile: profileWithAge,
        isLoading: false,
        queriesSkipped: false,
        patientEmail: mockEmail,
        tenantId: mockTenantId,
      });

      render(<PatientProfileDashboard />);

      // Layout component handles age calculation
      expect(screen.getByTestId('patient-dashboard-layout')).toBeInTheDocument();
    });
  });

  describe('Session Handling', () => {
    it('should handle missing session gracefully', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      mockUsePatientProfileData.mockReturnValue({
        patientId: undefined,
        patientProfile: undefined,
        isLoading: true,
        queriesSkipped: true,
        patientEmail: '',
        tenantId: 'demo-tenant',
      });

      render(<PatientProfileDashboard />);

      expect(screen.getByText(/Unable to load patient profile/i)).toBeInTheDocument();
    });

    it('should use tenant ID from session', () => {
      render(<PatientProfileDashboard />);

      expect(mockUsePatientProfileData).toHaveBeenCalled();
      expect(screen.getByTestId('patient-dashboard-layout')).toBeInTheDocument();
    });
  });

  describe('Form Integration', () => {
    it('should pass patient ID to layout component', () => {
      render(<PatientProfileDashboard />);

      // Layout component handles form integration
      expect(screen.getByTestId('patient-dashboard-layout')).toBeInTheDocument();
      expect(screen.getByText(/Layout for patient-123/i)).toBeInTheDocument();
    });
  });
});

