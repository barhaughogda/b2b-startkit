import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrescriptionInfoTab } from '../components/PrescriptionInfoTab';
import { PrescriptionCardProps } from '../types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Pill: () => <div data-testid="pill-icon" />,
  Clipboard: () => <div data-testid="clipboard-icon" />,
  User: () => <div data-testid="user-icon" />,
  ShieldCheck: () => <div data-testid="shield-check-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
}));

describe('PrescriptionInfoTab', () => {
  const mockPrescriptionData: PrescriptionCardProps['prescriptionData'] = {
    id: 'prescription-1',
    patientId: 'patient-1',
    patientName: 'John Doe',
    patientDateOfBirth: '1980-01-01',
    prescription: {
      status: 'active' as const,
      dosage: '10mg',
      frequency: 'twice daily',
      quantity: 30,
      refills: 2,
      daysSupply: 15,
      startDate: '2024-01-01',
      endDate: '2024-01-15',
      instructions: 'Take with food',
      indication: 'Hypertension management',
    },
    medication: {
      name: 'Lisinopril',
      genericName: 'Lisinopril',
      strength: '10mg',
      form: 'tablet',
      drugClass: 'ACE Inhibitor',
      ndc: '12345-678-90',
      manufacturer: 'Generic Pharma',
      controlledSubstance: false,
      schedule: null,
    },
    prescriber: {
      name: 'Dr. Sarah Wilson',
      specialty: 'Internal Medicine',
      npi: '1234567890',
      dea: 'AB1234567',
      phone: '(555) 123-4567',
      email: 'sarah.wilson@clinic.com',
    },
    pharmacy: {
      name: 'CVS Pharmacy',
      address: '123 Main St, City, State 12345',
      phone: '(555) 987-6543',
      ncpdp: '1234567',
      preferred: true,
    },
    interactions: [
      {
        id: '1',
        name: 'ACE Inhibitor',
        severity: 'moderate' as const,
        description: 'May increase risk of hyperkalemia',
      },
    ],
    allergies: [
      {
        id: '1',
        name: 'Penicillin',
        reaction: 'Rash',
        severity: 'moderate' as const,
      },
    ],
    monitoring: {
      labTests: ['Creatinine', 'Potassium'],
      vitalSigns: ['Blood Pressure'],
      symptoms: ['Dizziness', 'Fatigue'],
      frequency: 'Every 3 months',
      followUp: '2 weeks',
    },
    refillHistory: [],
    careTeam: [],
    tags: [],
    documents: [],
    comments: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders medication information section', () => {
      render(<PrescriptionInfoTab prescriptionData={mockPrescriptionData} />);
      
      expect(screen.getByText('Medication Information')).toBeInTheDocument();
      expect(screen.getByText('Lisinopril')).toBeInTheDocument();
      expect(screen.getByText('Generic: Lisinopril')).toBeInTheDocument();
      expect(screen.getByText('10mg tablet')).toBeInTheDocument();
      expect(screen.getByText('ACE Inhibitor')).toBeInTheDocument();
    });

    it('renders prescription details section', () => {
      render(<PrescriptionInfoTab prescriptionData={mockPrescriptionData} />);
      
      expect(screen.getByText('Prescription Details')).toBeInTheDocument();
      expect(screen.getByText('10mg twice daily')).toBeInTheDocument();
      expect(screen.getByText('30 tablets • 2 refills remaining')).toBeInTheDocument();
      expect(screen.getByText('15 days')).toBeInTheDocument();
    });

    it('renders prescriber information section', () => {
      render(<PrescriptionInfoTab prescriptionData={mockPrescriptionData} />);
      
      expect(screen.getByText('Prescriber Information')).toBeInTheDocument();
      expect(screen.getByText('Dr. Sarah Wilson')).toBeInTheDocument();
      expect(screen.getByText('Internal Medicine')).toBeInTheDocument();
      expect(screen.getByText('NPI Number')).toBeInTheDocument();
      expect(screen.getByText('1234567890')).toBeInTheDocument();
    });

    it('renders pharmacy information section', () => {
      render(<PrescriptionInfoTab prescriptionData={mockPrescriptionData} />);
      
      expect(screen.getByText('Pharmacy Information')).toBeInTheDocument();
      expect(screen.getByText('CVS Pharmacy')).toBeInTheDocument();
      expect(screen.getByText('123 Main St, City, State 12345')).toBeInTheDocument();
      expect(screen.getByText('(555) 987-6543')).toBeInTheDocument();
    });

    it('renders drug interactions when present', () => {
      render(<PrescriptionInfoTab prescriptionData={mockPrescriptionData} />);
      
      expect(screen.getByText('Drug Interactions')).toBeInTheDocument();
      expect(screen.getByText('May increase risk of hyperkalemia')).toBeInTheDocument();
      expect(screen.getByText('Moderate')).toBeInTheDocument();
      expect(screen.getByText('Spironolactone')).toBeInTheDocument();
    });

    it('renders allergies when present', () => {
      render(<PrescriptionInfoTab prescriptionData={mockPrescriptionData} />);
      
      expect(screen.getByText('Known Allergies')).toBeInTheDocument();
      expect(screen.getByText('Penicillin')).toBeInTheDocument();
      expect(screen.getByText('(Rash)')).toBeInTheDocument();
      expect(screen.getByText('moderate')).toBeInTheDocument();
    });

    it('renders monitoring requirements', () => {
      render(<PrescriptionInfoTab prescriptionData={mockPrescriptionData} />);
      
      expect(screen.getByText('Monitoring Requirements')).toBeInTheDocument();
      expect(screen.getByText('Creatinine')).toBeInTheDocument();
      expect(screen.getByText('Potassium')).toBeInTheDocument();
      expect(screen.getByText('Blood Pressure')).toBeInTheDocument();
      expect(screen.getByText('2 weeks')).toBeInTheDocument();
    });
  });

  describe('Controlled Substance Handling', () => {
    it('shows controlled substance warning when medication is controlled', () => {
      const controlledData = {
        ...mockPrescriptionData,
        medication: {
          ...mockPrescriptionData.medication,
          controlledSubstance: true,
          schedule: 'II',
        },
      };

      render(<PrescriptionInfoTab prescriptionData={controlledData} />);
      
      expect(screen.getByText('Controlled Substance - Schedule II')).toBeInTheDocument();
    });

    it('does not show controlled substance warning when medication is not controlled', () => {
      render(<PrescriptionInfoTab prescriptionData={mockPrescriptionData} />);
      
      expect(screen.queryByText(/Controlled Substance/)).not.toBeInTheDocument();
    });
  });

  describe('Conditional Rendering', () => {
    it('does not render drug interactions section when no interactions', () => {
      const dataWithoutInteractions = {
        ...mockPrescriptionData,
        interactions: [],
      };

      render(<PrescriptionInfoTab prescriptionData={dataWithoutInteractions} />);
      
      expect(screen.queryByText('Drug Interactions')).not.toBeInTheDocument();
    });

    it('does not render allergies section when no allergies', () => {
      const dataWithoutAllergies = {
        ...mockPrescriptionData,
        allergies: [],
      };

      render(<PrescriptionInfoTab prescriptionData={dataWithoutAllergies} />);
      
      expect(screen.queryByText('Known Allergies')).not.toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('formats start date correctly', () => {
      render(<PrescriptionInfoTab prescriptionData={mockPrescriptionData} />);
      
      expect(screen.getByText('1/1/2024')).toBeInTheDocument();
    });

    it('formats end date correctly when present', () => {
      render(<PrescriptionInfoTab prescriptionData={mockPrescriptionData} />);
      
      expect(screen.getByText('1/15/2024')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<PrescriptionInfoTab prescriptionData={mockPrescriptionData} />);
      
      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(7); // 7 main sections: Medication, Prescription, Prescriber, Pharmacy, Interactions, Allergies, Monitoring
    });

    it('has proper labels for form elements', () => {
      render(<PrescriptionInfoTab prescriptionData={mockPrescriptionData} />);
      
      expect(screen.getByText('Medication Name')).toBeInTheDocument();
      expect(screen.getByText('Dosage & Frequency')).toBeInTheDocument();
      expect(screen.getByText('Prescriber')).toBeInTheDocument();
    });
  });
});
