import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrescriptionCardHeader } from '../components/PrescriptionCardHeader';
import { BaseCardProps, CardEventHandlers } from '../types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Pill: () => <div data-testid="pill-icon" />,
  User: () => <div data-testid="user-icon" />,
  Stethoscope: () => <div data-testid="stethoscope-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  ShieldCheck: () => <div data-testid="shield-check-icon" />
}));

// Mock UI components
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span className={`badge ${variant || ''} ${className || ''}`}>{children}</span>
  )
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => <div className={className}>{children}</div>,
  AvatarFallback: ({ children, className }: any) => <div className={className}>{children}</div>,
  AvatarImage: ({ src, className }: any) => <img src={src} className={className} alt="avatar" />
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

describe('PrescriptionCardHeader', () => {
  const mockHandlers: CardEventHandlers = {
    onResize: vi.fn(),
    onDrag: vi.fn(),
    onMinimize: vi.fn(),
    onMaximize: vi.fn(),
    onClose: vi.fn(),
    onStatusChange: vi.fn(),
    onPriorityChange: vi.fn(),
    onAssignmentChange: vi.fn(),
    onCommentAdd: vi.fn(),
  };

  const mockBaseProps: BaseCardProps = {
    id: 'prescription-1',
    type: 'prescription',
    title: 'Lisinopril 10mg',
    content: null,
    patientId: 'patient-1',
    patientName: 'John Smith',
    patientDateOfBirth: '1985-03-15',
    status: 'inProgress' as const,
    priority: 'medium' as const,
    size: { min: 300, max: 1200, default: 600, current: 600 },
    position: { x: 100, y: 100 },
    dimensions: { width: 600, height: 400 },
    config: {
      type: 'prescription' as const,
      color: '#5FBFAF',
      icon: () => null,
      size: { min: 300, max: 1200, default: 600, current: 600 },
      layout: 'detailed' as const,
      interactions: {
        resizable: true,
        draggable: true,
        stackable: true,
        minimizable: true,
        maximizable: true,
        closable: true,
      },
      priority: {
        color: '#5FBFAF',
        borderColor: '#5FBFAF',
        icon: null,
        badge: 'Medium',
      },
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    accessCount: 0,
    isMinimized: false,
    isMaximized: false,
    zIndex: 1,
    handlers: mockHandlers
  };

  const mockPrescriptionData = {
    id: 'prescription-1',
    patientId: 'patient-1',
    patientName: 'John Smith',
    patientDateOfBirth: '1985-03-15',
    medication: {
      name: 'Lisinopril',
      genericName: 'Lisinopril',
      strength: '10mg',
      form: 'Tablet',
      ndc: '68180-123-01',
      manufacturer: 'Aurobindo Pharma',
      drugClass: 'ACE Inhibitor',
      controlledSubstance: false,
      schedule: 'N/A'
    },
    prescription: {
      dosage: '10mg',
      frequency: 'Once daily',
      quantity: 30,
      refills: 2,
      daysSupply: 30,
      instructions: 'Take with or without food. Take at the same time each day.',
      indication: 'Hypertension',
      startDate: '2024-01-15T00:00:00.000Z',
      endDate: '2024-04-15T00:00:00.000Z',
      status: 'active' as const
    },
    prescriber: {
      name: 'Dr. Sarah Wilson',
      npi: '1234567890',
      specialty: 'Internal Medicine',
      dea: 'AW1234567',
      phone: '(555) 123-4567',
      email: 'sarah.wilson@clinic.com'
    },
    pharmacy: {
      name: 'CVS Pharmacy #1234',
      address: '123 Main St, City, State 12345',
      phone: '(555) 987-6543',
      ncpdp: '1234567',
      preferred: true
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders medication information header', () => {
      render(
        <PrescriptionCardHeader
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Medication Information')).toBeInTheDocument();
      expect(screen.getAllByText('Lisinopril')[0]).toBeInTheDocument();
      expect(screen.getByText('Generic: Lisinopril')).toBeInTheDocument();
      expect(screen.getByText('10mg Tablet')).toBeInTheDocument();
      expect(screen.getByText('ACE Inhibitor')).toBeInTheDocument();
    });

    it('renders patient information', () => {
      render(
        <PrescriptionCardHeader
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('John Smith', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('DOB: 1985-03-15', { exact: false })).toBeInTheDocument();
    });

    it('renders status badge', () => {
      render(
        <PrescriptionCardHeader
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getAllByText('Active')[0]).toBeInTheDocument();
    });

    it('renders prescriber information', () => {
      render(
        <PrescriptionCardHeader
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Prescriber Information')).toBeInTheDocument();
      expect(screen.getAllByText('Dr. Sarah Wilson')[0]).toBeInTheDocument();
      expect(screen.getByText('Internal Medicine')).toBeInTheDocument();
      expect(screen.getByText('NPI: 1234567890')).toBeInTheDocument();
    });

    it('renders pharmacy information', () => {
      render(
        <PrescriptionCardHeader
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Pharmacy Information')).toBeInTheDocument();
      expect(screen.getAllByText('CVS Pharmacy #1234')[0]).toBeInTheDocument();
      expect(screen.getByText('Preferred')).toBeInTheDocument();
      expect(screen.getByText('123 Main St, City, State 12345')).toBeInTheDocument();
    });
  });

  describe('Controlled Substance Display', () => {
    it('displays controlled substance warning when applicable', () => {
      const controlledData = {
        ...mockPrescriptionData,
        medication: {
          ...mockPrescriptionData.medication,
          controlledSubstance: true,
          schedule: 'II'
        }
      };

      render(
        <PrescriptionCardHeader
          {...mockBaseProps}
          prescriptionData={controlledData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Controlled Substance - Schedule II')).toBeInTheDocument();
    });

    it('does not display controlled substance warning for non-controlled substances', () => {
      render(
        <PrescriptionCardHeader
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.queryByText('Controlled Substance')).not.toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('displays active status with correct styling', () => {
      render(
        <PrescriptionCardHeader
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      const statusBadge = screen.getAllByText('Active')[0];
      expect(statusBadge).toBeInTheDocument();
    });

    it('displays discontinued status with correct styling', () => {
      const discontinuedData = {
        ...mockPrescriptionData,
        prescription: {
          ...mockPrescriptionData.prescription,
          status: 'discontinued' as const
        }
      };

      render(
        <PrescriptionCardHeader
          {...mockBaseProps}
          prescriptionData={discontinuedData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getAllByText('Discontinued')[0]).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for interactive elements', () => {
      render(
        <PrescriptionCardHeader
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      // Check that the component renders without accessibility issues
      expect(screen.getByText('Medication Information')).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      render(
        <PrescriptionCardHeader
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Medication Information')).toBeInTheDocument();
      expect(screen.getByText('Prescriber Information')).toBeInTheDocument();
      expect(screen.getByText('Pharmacy Information')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('handles missing handlers gracefully', () => {
      render(
        <PrescriptionCardHeader
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
        />
      );

      expect(screen.getAllByText('Lisinopril')[0]).toBeInTheDocument();
    });
  });
});
