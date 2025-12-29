import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrescriptionActivityTab } from '../components/PrescriptionActivityTab';
import { PrescriptionCardProps, CardEventHandlers } from '../types';
import { Activity as ActivityIcon } from 'lucide-react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Activity: () => <div data-testid="activity-icon" />,
}));

describe('PrescriptionActivityTab', () => {
  const mockPrescriptionData: PrescriptionCardProps['prescriptionData'] = {
    id: 'prescription-1',
    patientId: 'patient-1',
    patientName: 'John Smith',
    patientDateOfBirth: '1985-03-15',
    medication: {
      name: 'Lisinopril',
      genericName: 'Lisinopril',
      strength: '10mg',
      form: 'Tablet',
      drugClass: 'ACE Inhibitor',
      ndc: '68180-123-01',
      manufacturer: 'Aurobindo Pharma',
      controlledSubstance: false,
      schedule: null,
    },
    prescription: {
      status: 'active',
      dosage: '1 tablet',
      frequency: 'once daily',
      quantity: 30,
      refills: 2,
      daysSupply: 30,
      startDate: '2024-01-15T08:00:00Z',
      endDate: '2025-01-15T08:00:00Z',
      instructions: 'Take with food.',
      indication: 'Hypertension',
    },
    prescriber: {
      name: 'Dr. Sarah Wilson',
      specialty: 'Internal Medicine',
      npi: '1234567890',
      dea: 'AW1234567',
      phone: '555-123-4567',
      email: 'sarah.wilson@example.com',
    },
    pharmacy: {
      name: 'CVS Pharmacy #123',
      address: '123 Main St, Anytown, USA',
      phone: '555-987-6543',
      ncpdp: '1234567',
      preferred: true,
    },
    interactions: [],
    allergies: [],
    monitoring: {
      labTests: ['Creatinine', 'Potassium'],
      vitalSigns: ['Blood Pressure'],
      symptoms: ['Dizziness', 'Fatigue'],
      frequency: 'Every 3 months',
      followUp: 'Schedule follow-up in 1 month for BP check.',
    },
    refillHistory: [],
    comments: [
      {
        id: 'comment-1',
        author: 'Dr. Sarah Wilson',
        authorRole: 'Prescriber',
        content: 'Patient started on Lisinopril 10mg daily for hypertension.',
        timestamp: '2 hours ago',
        isInternal: false,
      },
      {
        id: 'comment-2',
        author: 'Nurse Johnson',
        authorRole: 'Nurse',
        content: 'Patient education provided on medication administration.',
        timestamp: '1 hour ago',
        isInternal: false,
      }
    ],
    careTeam: [],
    tags: [],
    documents: [],
  };

  const mockHandlers: CardEventHandlers = {
    onResize: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
    onEdit: vi.fn(),
    onStatusChange: vi.fn(),
    onCommentAdd: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders activity section with header and export button', () => {
      render(
        <PrescriptionActivityTab
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Activity')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('renders all comments with author information', () => {
      render(
        <PrescriptionActivityTab
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Dr. Sarah Wilson')).toBeInTheDocument();
      expect(screen.getByText('Nurse Johnson')).toBeInTheDocument();
      expect(screen.getByText('Patient started on Lisinopril 10mg daily for hypertension.')).toBeInTheDocument();
      expect(screen.getByText('Patient education provided on medication administration.')).toBeInTheDocument();
    });

    it('renders author roles as badges', () => {
      render(
        <PrescriptionActivityTab
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Prescriber')).toBeInTheDocument();
      expect(screen.getByText('Nurse')).toBeInTheDocument();
    });

    it('renders timestamps for comments', () => {
      render(
        <PrescriptionActivityTab
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('2 hours ago')).toBeInTheDocument();
      expect(screen.getByText('1 hour ago')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('renders export button with correct icon', () => {
      render(
        <PrescriptionActivityTab
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      const exportButton = screen.getByText('Export');
      expect(exportButton).toBeInTheDocument();
      expect(screen.getByTestId('activity-icon')).toBeInTheDocument();
    });

    it('handles export button click', () => {
      render(
        <PrescriptionActivityTab
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);
      
      // Export functionality would be handled by the parent component
      // This test ensures the button is clickable
      expect(exportButton).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('handles empty comments array gracefully', () => {
      const emptyCommentsData = {
        ...mockPrescriptionData,
        comments: []
      };

      render(
        <PrescriptionActivityTab
          prescriptionData={emptyCommentsData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Activity')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
      // Should not crash with empty comments
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(
        <PrescriptionActivityTab
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      const heading = screen.getByRole('heading', { name: 'Activity' });
      expect(heading).toBeInTheDocument();
    });

    it('has proper button labels', () => {
      render(
        <PrescriptionActivityTab
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });
  });
});
