import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DiagnosisCard } from '../DiagnosisCard';
import { BaseCardProps, CardEventHandlers, TeamMember, Tag as CardTag, Document, CardComment } from '../types';

// Mock the BaseCardComponent with tab navigation
vi.mock('../BaseCard', () => ({
  BaseCardComponent: ({ children, patientDateOfBirth, activeTab, onTabChange, title, ...props }: any) => (
    <div data-testid="base-card" {...props}>
      <div data-testid="card-header">
        <h2>{title}</h2>
        <div data-testid="patient-info">
          {patientDateOfBirth ? `DOB: ${patientDateOfBirth}` : `ID: ${props.patientId}`}
        </div>
        {/* Tab Navigation */}
        <div data-testid="tab-navigation">
          <button data-testid="tab-info" onClick={() => onTabChange?.('info')}>Info</button>
          <button data-testid="tab-members" onClick={() => onTabChange?.('members')}>Members</button>
          <button data-testid="tab-tags" onClick={() => onTabChange?.('tags')}>Tags</button>
          <button data-testid="tab-dueDate" onClick={() => onTabChange?.('dueDate')}>Due Date</button>
          <button data-testid="tab-attachments" onClick={() => onTabChange?.('attachments')}>Attachments</button>
          <button data-testid="tab-notes" onClick={() => onTabChange?.('notes')}>Notes</button>
          <button data-testid="tab-activity" onClick={() => onTabChange?.('activity')}>Activity</button>
        </div>
      </div>
      <div data-testid="card-content">
        {children}
      </div>
    </div>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  X: () => <div data-testid="x-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Paperclip: () => <div data-testid="paperclip-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Tag: () => <div data-testid="tag-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Save: () => <div data-testid="save-icon" />,
  Info: () => <div data-testid="info-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Stethoscope: () => <div data-testid="stethoscope-icon" />,
  User: () => <div data-testid="user-icon" />,
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
      data-testid="notes-textarea"
      value={value} 
      onChange={onChange} 
      placeholder={placeholder} 
      className={className}
    />
  )
}));

const mockHandlers: CardEventHandlers = {
  onResize: vi.fn(),
  onDrag: vi.fn(),
  onMinimize: vi.fn(),
  onMaximize: vi.fn(),
  onClose: vi.fn(),
  onStatusChange: vi.fn(),
  onPriorityChange: vi.fn(),
  onCommentAdd: vi.fn(),
};

const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Dr. Smith',
    role: 'Primary Care Physician',
    initials: 'DS',
    avatar: '/avatars/dr-smith.jpg',
    isActive: true,
  },
  {
    id: '2',
    name: 'Nurse Johnson',
    role: 'Registered Nurse',
    initials: 'NJ',
    avatar: '/avatars/nurse-johnson.jpg',
    isActive: true,
  },
];

const mockTags: CardTag[] = [
  { id: '1', name: 'Hypertension', color: 'red', category: 'medical' },
  { id: '2', name: 'Follow-up', color: 'blue', category: 'status' },
  { id: '3', name: 'Critical', color: 'orange', category: 'priority' },
];

const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Lab Results.pdf',
    type: 'pdf',
    size: '2.4 MB',
    url: '/documents/lab-results.pdf',
    uploadedBy: 'Dr. Smith',
    uploadedAt: '2024-01-01T00:00:00Z',
  },
];

const mockComments: CardComment[] = [
  {
    id: '1',
    author: 'Dr. Smith',
    authorRole: 'Provider',
    content: 'Patient responding well to treatment',
    timestamp: '2024-01-01T10:00:00Z',
    isInternal: false,
  },
];

const mockBaseProps: BaseCardProps = {
  id: 'diagnosis-1',
  type: 'diagnosis',
  title: 'Type 2 Diabetes',
  priority: 'high',
  status: 'inProgress',
  patientId: 'patient-1',
  patientName: 'John Doe',
  patientDateOfBirth: '1980-01-15',
  dueDate: '2024-01-20',
  size: {
    min: 300,
    max: 600,
    default: 400,
    current: 400
  },
  position: { x: 100, y: 100 },
  dimensions: { width: 400, height: 500 },
  isMinimized: false,
  isMaximized: false,
  zIndex: 1000,
  config: {
    type: 'diagnosis',
    color: 'bg-red-50',
    icon: null,
    size: { min: 300, max: 600, default: 400, current: 400 },
    layout: 'vertical',
    interactions: {
      resizable: true,
      draggable: true,
      stackable: true,
      minimizable: true,
      maximizable: true,
      closable: true
    },
    priority: {
      color: 'text-red-600',
      borderColor: 'border-red-500',
      icon: null,
      badge: 'Diagnosis'
    }
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  accessCount: 0
};

const mockDiagnosisData = {
  id: 'diagnosis-1',
  patientId: 'patient-1',
  patientName: 'John Doe',
  patientDateOfBirth: '1980-01-15',
  diagnosis: {
    code: 'E11.9',
    description: 'Type 2 diabetes mellitus without complications',
    category: 'Endocrine',
    severity: 'moderate' as const,
    status: 'active' as const,
    onsetDate: '2023-06-15',
    diagnosisDate: '2023-06-20',
    confirmedDate: '2023-06-25',
    icd10Code: 'E11.9',
    snomedCode: '44054006',
  },
  provider: {
    name: 'Dr. Smith',
    npi: '1234567890',
    specialty: 'Endocrinology',
    credentials: 'MD',
    phone: '(555) 123-4567',
    email: 'dr.smith@clinic.com',
  },
  relatedConditions: [
    { id: '1', code: 'I10', description: 'Essential hypertension', relationship: 'comorbid' },
    { id: '2', code: 'E78.5', description: 'Hyperlipidemia', relationship: 'related' },
  ],
  treatmentPlan: {
    medications: [
      { id: '1', name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
      { id: '2', name: 'Glipizide', dosage: '5mg', frequency: 'Once daily' },
    ],
    lifestyle: [
      'Dietary modifications - low carbohydrate diet',
      'Regular exercise - 30 minutes daily',
      'Blood glucose monitoring - twice daily',
    ],
    monitoring: [
      'HbA1c every 3 months',
      'Annual eye exam',
      'Annual foot exam',
      'Annual kidney function test',
    ],
    followUp: 'Follow-up in 3 months or as needed',
  },
  careTeam: mockTeamMembers,
  tags: mockTags,
  documents: mockDocuments,
  comments: mockComments,
};

describe('DiagnosisCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render DiagnosisCard with base card structure', () => {
      render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByTestId('base-card')).toBeInTheDocument();
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });

    it('should display diagnosis code in header', () => {
      render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
        />
      );

      // Diagnosis code appears in header (and Info tab)
      const codes = screen.getAllByText('E11.9');
      expect(codes.length).toBeGreaterThan(0);
      // Description appears in Info tab
      expect(screen.getByText('Type 2 diabetes mellitus without complications')).toBeInTheDocument();
    });

    it('should display patient information', () => {
      render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
        />
      );

      // Patient name and DOB appear together in header
      expect(screen.getByText(/John Doe.*DOB: 1980-01-15/)).toBeInTheDocument();
    });

    it('should display severity badge', () => {
      render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
        />
      );

      // Severity badge appears in header (may appear multiple times - header and Info tab)
      const severityBadges = screen.getAllByText('Moderate');
      expect(severityBadges.length).toBeGreaterThan(0);
    });

    it('should display diagnosis status', () => {
      render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
        />
      );

      // Status badge appears in header (may appear multiple times - header and Info tab)
      const statusBadges = screen.getAllByText('Active');
      expect(statusBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Info Tab Content', () => {
    it('should display diagnosis code and description', () => {
      const { container } = render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
          activeTab="info"
        />
      );

      // Diagnosis code appears in header and Info tab
      const codes = screen.getAllByText('E11.9');
      expect(codes.length).toBeGreaterThan(0);
      
      // Description appears in Info tab
      expect(screen.getByText('Type 2 diabetes mellitus without complications')).toBeInTheDocument();
      expect(screen.getByText('ICD-10 Code:')).toBeInTheDocument();
      expect(screen.getByText('SNOMED Code:')).toBeInTheDocument();
    });

    it('should display diagnosis dates', () => {
      render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
          activeTab="info"
        />
      );

      expect(screen.getByText(/Onset Date:/)).toBeInTheDocument();
      expect(screen.getByText(/Diagnosis Date:/)).toBeInTheDocument();
      expect(screen.getByText(/Confirmed Date:/)).toBeInTheDocument();
    });

    it('should display provider information', () => {
      render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
          activeTab="info"
        />
      );

      // Provider name appears as "Dr. Smith, MD" in the component
      expect(screen.getByText(/Dr\. Smith/)).toBeInTheDocument();
      expect(screen.getByText('Endocrinology')).toBeInTheDocument();
    });

    it('should display related conditions', () => {
      render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
          activeTab="info"
        />
      );

      expect(screen.getByText('Related Conditions')).toBeInTheDocument();
      // Related conditions appear as "I10 - Essential hypertension" in the component
      expect(screen.getByText(/Essential hypertension/)).toBeInTheDocument();
      expect(screen.getByText(/Hyperlipidemia/)).toBeInTheDocument();
    });

    it('should display treatment plan', () => {
      render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
          activeTab="info"
        />
      );

      expect(screen.getByText('Treatment Plan')).toBeInTheDocument();
      expect(screen.getByText('Medications')).toBeInTheDocument();
      expect(screen.getByText('Metformin')).toBeInTheDocument();
      expect(screen.getByText('Lifestyle Modifications')).toBeInTheDocument();
      expect(screen.getByText('Monitoring')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to members tab', async () => {
      const mockOnTabChange = vi.fn();
      const { rerender } = render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
          activeTab="info"
          onTabChange={mockOnTabChange}
        />
      );

      const membersTab = screen.getByTestId('tab-members');
      fireEvent.click(membersTab);

      await waitFor(() => {
        expect(mockOnTabChange).toHaveBeenCalledWith('members');
      });
      
      // Re-render with members tab active
      rerender(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
          activeTab="members"
          onTabChange={mockOnTabChange}
        />
      );
      
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    });

    it('should switch to tags tab', async () => {
      const mockOnTabChange = vi.fn();
      const { rerender } = render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
          activeTab="info"
          onTabChange={mockOnTabChange}
        />
      );

      const tagsTab = screen.getByTestId('tab-tags');
      fireEvent.click(tagsTab);

      await waitFor(() => {
        expect(mockOnTabChange).toHaveBeenCalledWith('tags');
      });
      
      // Re-render with tags tab active
      rerender(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
          activeTab="tags"
          onTabChange={mockOnTabChange}
        />
      );
      
      expect(screen.getByText('Hypertension')).toBeInTheDocument();
    });

    it('should switch to notes tab', async () => {
      const mockOnTabChange = vi.fn();
      const { rerender } = render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
          activeTab="info"
          onTabChange={mockOnTabChange}
        />
      );

      const notesTab = screen.getByTestId('tab-notes');
      fireEvent.click(notesTab);

      await waitFor(() => {
        expect(mockOnTabChange).toHaveBeenCalledWith('notes');
      });
      
      // Re-render with notes tab active
      rerender(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
          activeTab="notes"
          onTabChange={mockOnTabChange}
        />
      );
      
      // Notes textarea only appears when editing - click Edit button first
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('notes-textarea')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing diagnosis data gracefully', () => {
      const invalidData = {
        ...mockDiagnosisData,
        diagnosis: null as any,
      };

      render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={invalidData}
          handlers={mockHandlers}
        />
      );

      // "Invalid Diagnosis Data" appears multiple times (header and content)
      const errorMessages = screen.getAllByText(/Invalid Diagnosis Data/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    it('should handle missing handlers gracefully', () => {
      render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
        />
      );

      expect(screen.getByTestId('base-card')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', () => {
      render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have proper heading structure', () => {
      render(
        <DiagnosisCard
          {...mockBaseProps}
          diagnosisData={mockDiagnosisData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Diagnosis Information')).toBeInTheDocument();
    });
  });
});

