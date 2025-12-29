import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrescriptionNotesTab } from '../components/PrescriptionNotesTab';
import { PrescriptionCardProps } from '../types';
import { Save, Edit, Eye, EyeOff } from 'lucide-react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Save: () => <div data-testid="save-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
}));

describe('PrescriptionNotesTab', () => {
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
    careTeam: [
      {
        id: '1',
        name: 'Dr. Sarah Wilson',
        role: 'Primary Care Physician',
        initials: 'SW',
        avatar: '/avatars/dr-wilson.jpg',
        isActive: true,
      },
    ],
    tags: [
      { id: '1', name: 'Hypertension', color: 'blue', category: 'medical' },
      { id: '2', name: 'Cardiology', color: 'red', category: 'medical' },
    ],
    documents: [
      {
        id: '1',
        name: 'Prescription Label',
        type: 'pdf',
        size: '245 KB',
        url: '/documents/prescription-label.pdf',
        uploadedAt: '2024-01-15T10:30:00Z',
        uploadedBy: 'Dr. Sarah Wilson',
      },
    ],
    comments: [
      {
        id: '1',
        author: 'Dr. Sarah Wilson',
        authorRole: 'Provider',
        content: 'Patient responding well to medication',
        timestamp: '2024-01-15T10:30:00Z',
        isInternal: false,
      },
    ],
    refillHistory: [],
  };

  const mockHandlers = {
    onResize: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onStatusChange: vi.fn(),
    onCommentAdd: vi.fn(),
    onCommentEdit: vi.fn(),
    onCommentDelete: vi.fn(),
    onTagAdd: vi.fn(),
    onTagRemove: vi.fn(),
    onMemberAdd: vi.fn(),
    onMemberRemove: vi.fn(),
    onDocumentAdd: vi.fn(),
    onDocumentRemove: vi.fn(),
    onDueDateSet: vi.fn(),
    onDueDateClear: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders notes section with default content', () => {
      render(
        <PrescriptionNotesTab 
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );
      
      expect(screen.getByText('Clinical Notes')).toBeInTheDocument();
      
      // Click show to make notes visible
      fireEvent.click(screen.getByText('Show'));
      expect(screen.getByText('Monitor blood pressure and heart rate. Watch for dizziness or swelling.')).toBeInTheDocument();
    });

    it('renders show/hide toggle button', () => {
      render(
        <PrescriptionNotesTab 
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );
      
      expect(screen.getByText('Show')).toBeInTheDocument();
    });

    it('renders edit button when notes are visible', () => {
      render(
        <PrescriptionNotesTab 
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );
      
      // Click show to make notes visible
      fireEvent.click(screen.getByText('Show'));
      
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  describe('Notes Visibility Toggle', () => {
    it('shows notes when show button is clicked', () => {
      render(
        <PrescriptionNotesTab 
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );
      
      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);
      
      expect(screen.getByText('Hide')).toBeInTheDocument();
      expect(screen.getByText('Monitor blood pressure and heart rate. Watch for dizziness or swelling.')).toBeInTheDocument();
    });

    it('hides notes when hide button is clicked', () => {
      render(
        <PrescriptionNotesTab 
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );
      
      // First show the notes
      fireEvent.click(screen.getByText('Show'));
      expect(screen.getByText('Hide')).toBeInTheDocument();
      
      // Then hide them
      fireEvent.click(screen.getByText('Hide'));
      expect(screen.getByText('Show')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('enters edit mode when edit button is clicked', () => {
      render(
        <PrescriptionNotesTab 
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );
      
      // Show notes first
      fireEvent.click(screen.getByText('Show'));
      
      // Click edit
      fireEvent.click(screen.getByText('Edit'));
      
      expect(screen.getByDisplayValue('Monitor blood pressure and heart rate. Watch for dizziness or swelling.')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('exits edit mode when cancel button is clicked', () => {
      render(
        <PrescriptionNotesTab 
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );
      
      // Show notes and enter edit mode
      fireEvent.click(screen.getByText('Show'));
      fireEvent.click(screen.getByText('Edit'));
      
      // Click cancel
      fireEvent.click(screen.getByText('Cancel'));
      
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('saves notes when save button is clicked', () => {
      render(
        <PrescriptionNotesTab 
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );
      
      // Show notes and enter edit mode
      fireEvent.click(screen.getByText('Show'));
      fireEvent.click(screen.getByText('Edit'));
      
      // Modify the textarea
      const textarea = screen.getByDisplayValue('Monitor blood pressure and heart rate. Watch for dizziness or swelling.');
      fireEvent.change(textarea, { target: { value: 'Updated clinical notes' } });
      
      // Click save
      fireEvent.click(screen.getByText('Save'));
      
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state message when no notes are present', () => {
      render(
        <PrescriptionNotesTab 
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
          initialNotes=""
        />
      );
      
      // Show notes
      fireEvent.click(screen.getByText('Show'));
      
      expect(screen.getByText('No clinical notes added yet. Click Edit to add notes about this prescription.')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for form elements', () => {
      render(
        <PrescriptionNotesTab 
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );
      
      // Show notes and enter edit mode
      fireEvent.click(screen.getByText('Show'));
      fireEvent.click(screen.getByText('Edit'));
      
      const textarea = screen.getByDisplayValue('Monitor blood pressure and heart rate. Watch for dizziness or swelling.');
      expect(textarea).toHaveAttribute('placeholder', 'Add clinical notes about this prescription...');
    });

    it('has proper button labels', () => {
      render(
        <PrescriptionNotesTab 
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );
      
      expect(screen.getByText('Show')).toBeInTheDocument();
      
      // Show notes
      fireEvent.click(screen.getByText('Show'));
      
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Hide')).toBeInTheDocument();
    });
  });
});
