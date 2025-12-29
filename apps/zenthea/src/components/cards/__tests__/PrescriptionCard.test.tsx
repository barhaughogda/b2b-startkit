import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrescriptionCard } from '../PrescriptionCard';
import { BaseCardProps, CardEventHandlers, TeamMember, Tag as CardTag, Document, CardComment } from '../types';

// Mock the BaseCardComponent with tab navigation
vi.mock('../BaseCard', () => ({
  BaseCardComponent: ({ children, activeTab, onTabChange, tabNames, className, ...props }: any) => (
    <div data-testid="base-card" className={className} {...props}>
      {/* Mock tab navigation */}
      <div className="tab-navigation">
        <button onClick={() => onTabChange?.('info')}>Info</button>
        <button onClick={() => onTabChange?.('members')}>Members</button>
        <button onClick={() => onTabChange?.('tags')}>Tags</button>
        <button onClick={() => onTabChange?.('dueDate')}>Due Date</button>
        <button onClick={() => onTabChange?.('attachments')}>Attachments</button>
        <button onClick={() => onTabChange?.('notes')}>Notes</button>
        <button onClick={() => onTabChange?.('activity')}>Activity</button>
      </div>
      {children}
    </div>
  )
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Pill: () => <div data-testid="pill-icon" />,
  User: () => <div data-testid="user-icon" />,
  Stethoscope: () => <div data-testid="stethoscope-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  X: () => <div data-testid="x-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Paperclip: () => <div data-testid="paperclip-icon" />,
  MessageSquare: () => <div data-testid="message-square-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Tag: () => <div data-testid="tag-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Save: () => <div data-testid="save-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  BookOpen: () => <div data-testid="book-open-icon" />,
  PenTool: () => <div data-testid="pen-tool-icon" />,
  Clipboard: () => <div data-testid="clipboard-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  ShieldCheck: () => <div data-testid="shield-check-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Heart: () => <div data-testid="heart-icon" />,
  Brain: () => <div data-testid="brain-icon" />
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className}>{children}</div>
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span className={`badge ${variant || ''} ${className || ''}`}>{children}</span>
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, size, variant }: any) => (
    <button 
      onClick={onClick} 
      className={`button ${variant || ''} ${size || ''} ${className || ''}`}
    >
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => <div className={className}>{children}</div>,
  AvatarFallback: ({ children, className }: any) => <div className={className}>{children}</div>,
  AvatarImage: ({ src, className }: any) => <img src={src} className={className} alt="avatar" />
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, className }: any) => (
    <textarea 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder} 
      className={className}
    />
  )
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

describe('PrescriptionCard', () => {
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
    },
    interactions: [
      {
        id: '1',
        name: 'ACE Inhibitor',
        severity: 'moderate' as const,
        description: 'May increase risk of hyperkalemia when used with potassium-sparing diuretics',
      }
    ],
    allergies: [
      {
        id: '1',
        name: 'Sulfa drugs',
        reaction: 'Rash and hives',
        severity: 'moderate' as const
      }
    ],
    refillHistory: [
      {
        id: '1',
        date: '2024-01-15T00:00:00.000Z',
        quantity: 30,
        pharmacy: 'CVS Pharmacy #1234',
      }
    ],
    monitoring: {
      labTests: ['Serum Potassium', 'Serum Creatinine', 'BUN'],
      vitalSigns: ['Blood Pressure', 'Heart Rate'],
      symptoms: ['Dizziness', 'Dry Cough', 'Swelling'],
      frequency: 'Monthly for first 3 months, then every 3 months',
      followUp: '3 months'
    },
    careTeam: [
      {
        id: 'provider-1',
        name: 'Dr. Sarah Wilson',
        role: 'Primary Care Physician',
        initials: 'SW',
        avatar: '/avatars/dr-wilson.jpg',
        isActive: true
      }
    ],
    tags: [
      { id: 'tag-1', name: 'Hypertension', color: 'red', category: 'medical' as const }
    ],
    documents: [
      {
        id: 'doc-1',
        name: 'Prescription Label',
        type: 'document',
        size: '1.2 MB',
        url: '/documents/prescription-label.pdf',
        uploadedBy: 'Dr. Sarah Wilson',
        uploadedAt: '2024-01-15T00:00:00.000Z'
      }
    ],
    comments: [
      {
        id: 'comment-1',
        author: 'Dr. Sarah Wilson',
        authorRole: 'Provider',
        content: 'Patient started on Lisinopril 10mg daily for hypertension.',
        timestamp: '2024-01-15T00:00:00.000Z',
        isInternal: true
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the prescription card with basic information', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getAllByText('Lisinopril')[0]).toBeInTheDocument();
      expect(screen.getByText('John Smith', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('DOB: 1985-03-15', { exact: false })).toBeInTheDocument();
      expect(screen.getAllByText('Active')[0]).toBeInTheDocument();
    });

    it('renders the medication information section', () => {
      render(
        <PrescriptionCard
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

    it('renders the prescription details section', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Prescription Details')).toBeInTheDocument();
      expect(screen.getByText('10mg Once daily')).toBeInTheDocument();
      expect(screen.getByText('30 tablets • 2 refills remaining')).toBeInTheDocument();
      expect(screen.getByText('30 days')).toBeInTheDocument();
    });

    it('renders the prescriber information section', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Prescriber Information')).toBeInTheDocument();
      expect(screen.getAllByText('Dr. Sarah Wilson')[0]).toBeInTheDocument();
      expect(screen.getByText('Internal Medicine')).toBeInTheDocument();
      expect(screen.getByText('1234567890')).toBeInTheDocument();
    });

    it('renders the pharmacy information section', () => {
      render(
        <PrescriptionCard
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

    it('renders drug interactions when present', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Drug Interactions')).toBeInTheDocument();
      expect(screen.getByText('May increase risk of hyperkalemia when used with potassium-sparing diuretics')).toBeInTheDocument();
      expect(screen.getByText('Moderate')).toBeInTheDocument();
    });

    it('renders allergies when present', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Known Allergies')).toBeInTheDocument();
      expect(screen.getByText('Sulfa drugs')).toBeInTheDocument();
      expect(screen.getByText('(Rash and hives)')).toBeInTheDocument();
      expect(screen.getByText('moderate')).toBeInTheDocument();
    });

    it('renders monitoring requirements', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Monitoring Requirements')).toBeInTheDocument();
      expect(screen.getByText('Serum Potassium')).toBeInTheDocument();
      expect(screen.getByText('Blood Pressure')).toBeInTheDocument();
      expect(screen.getByText('Dizziness')).toBeInTheDocument();
    });

    it('renders refill history when present', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Refill History')).toBeInTheDocument();
      expect(screen.getByText('30 tablets')).toBeInTheDocument();
      expect(screen.getByText('by Dr. Sarah Wilson')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders all tab navigation buttons', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Members')).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
      expect(screen.getByText('Due Date')).toBeInTheDocument();
      expect(screen.getByText('Attachments')).toBeInTheDocument();
    });

    it('switches to members tab when clicked', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      fireEvent.click(screen.getByText('Members'));
      expect(screen.getByText('Care Team')).toBeInTheDocument();
      expect(screen.getAllByText('Dr. Sarah Wilson')[0]).toBeInTheDocument();
    });

    it('switches to tags tab when clicked', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      fireEvent.click(screen.getByText('Tags'));
      expect(screen.getAllByText('Tags')[0]).toBeInTheDocument();
      expect(screen.getByText('Hypertension')).toBeInTheDocument();
    });

    it('switches to due date tab when clicked', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      fireEvent.click(screen.getByText('Due Date'));
      expect(screen.getAllByText('Due Date')[0]).toBeInTheDocument();
      expect(screen.getByText('Next Refill Due')).toBeInTheDocument();
    });

    it('switches to attachments tab when clicked', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      fireEvent.click(screen.getByText('Attachments'));
      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('Prescription Label')).toBeInTheDocument();
    });
  });

  describe('Notes Section', () => {
    it('renders notes section with default content', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      // Click on the Notes tab first
      fireEvent.click(screen.getByText('Notes'));
      
      // Click the Show button to expand the notes
      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);
      
      expect(screen.getByText('Monitor blood pressure and heart rate. Watch for dizziness or swelling.', { exact: false })).toBeInTheDocument();
    });

    it('toggles notes visibility when show/hide button is clicked', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      // Click on the Notes tab first
      fireEvent.click(screen.getByText('Notes'));

      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);
      
      expect(screen.getByText('Hide')).toBeInTheDocument();
    });

    it('enters edit mode when edit button is clicked', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      // Click on the Notes tab first
      fireEvent.click(screen.getByText('Notes'));

      // Click Show button to make notes visible
      fireEvent.click(screen.getByText('Show'));

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('Activity Section', () => {
    it('renders activity section with comments', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      // Click on the Activity tab first
      fireEvent.click(screen.getByText('Activity'));

      expect(screen.getAllByText('Dr. Sarah Wilson')[0]).toBeInTheDocument();
      expect(screen.getByText('Patient started on Lisinopril 10mg daily for hypertension.')).toBeInTheDocument();
    });

    it('renders export button for activity', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      // Click on the Activity tab first
      fireEvent.click(screen.getByText('Activity'));

      expect(screen.getByText('Export')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('displays active status with correct styling', () => {
      render(
        <PrescriptionCard
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
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={discontinuedData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getAllByText('Discontinued')[0]).toBeInTheDocument();
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
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={controlledData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Controlled Substance - Schedule II')).toBeInTheDocument();
    });
  });

  describe('Interaction Severity Display', () => {
    it('displays different severity levels correctly', () => {
      const dataWithMultipleInteractions = {
        ...mockPrescriptionData,
        interactions: [
          {
            id: '1',
            name: 'Drug Interaction 1',
            severity: 'minor' as const,
            description: 'Minor interaction',
          },
          {
            id: '2',
            name: 'Drug Interaction 2',
            severity: 'major' as const,
            description: 'Major interaction',
          },
          {
            id: '3',
            name: 'Drug Interaction 3',
            severity: 'contraindicated' as const,
            description: 'Contraindicated',
          }
        ]
      };

      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={dataWithMultipleInteractions}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Minor')).toBeInTheDocument();
      expect(screen.getByText('Major')).toBeInTheDocument();
      expect(screen.getAllByText('Contraindicated')[0]).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('handles empty interactions array', () => {
      const dataWithoutInteractions = {
        ...mockPrescriptionData,
        interactions: []
      };

      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={dataWithoutInteractions}
          handlers={mockHandlers}
        />
      );

      expect(screen.queryByText('Drug Interactions')).not.toBeInTheDocument();
    });

    it('handles empty allergies array', () => {
      const dataWithoutAllergies = {
        ...mockPrescriptionData,
        allergies: []
      };

      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={dataWithoutAllergies}
          handlers={mockHandlers}
        />
      );

      expect(screen.queryByText('Known Allergies')).not.toBeInTheDocument();
    });

    it('handles empty refill history', () => {
      const dataWithoutRefills = {
        ...mockPrescriptionData,
        refillHistory: []
      };

      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={dataWithoutRefills}
          handlers={mockHandlers}
        />
      );

      expect(screen.queryByText('Refill History')).not.toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('formats start date correctly', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      // The date should be formatted as a readable date string
      expect(screen.getAllByText(/1\/15\/2024/)[0]).toBeInTheDocument();
    });

    it('formats end date correctly when present', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText(/4\/15\/2024/)).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('passes correct props to BaseCardComponent', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      const baseCard = screen.getByTestId('base-card');
      expect(baseCard).toBeInTheDocument();
      expect(baseCard).toHaveClass('prescription-card');
    });

    it('handles missing handlers gracefully', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
        />
      );

      expect(screen.getAllByText('Lisinopril')[0]).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for interactive elements', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      // Check that buttons are accessible
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('has proper heading structure', () => {
      render(
        <PrescriptionCard
          {...mockBaseProps}
          prescriptionData={mockPrescriptionData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Medication Information')).toBeInTheDocument();
      expect(screen.getByText('Prescription Details')).toBeInTheDocument();
      expect(screen.getByText('Prescriber Information')).toBeInTheDocument();
    });
  });
});
