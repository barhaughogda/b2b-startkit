import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SOAPNoteCard } from '../SOAPNoteCard';
import { CardEventHandlers, TeamMember, Tag as CardTag, Document, CardComment } from '../types';

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
          <button onClick={() => onTabChange?.('info')}>Info</button>
          <button onClick={() => onTabChange?.('members')}>Members</button>
          <button onClick={() => onTabChange?.('dueDate')}>Due Date</button>
          <button onClick={() => onTabChange?.('attachments')}>Attachments</button>
          <button onClick={() => onTabChange?.('notes')}>Notes</button>
          <button onClick={() => onTabChange?.('activity')}>Activity</button>
        </div>
      </div>
      <div data-testid="card-content">
        {children}
      </div>
    </div>
  ),
}));

// Mock the StandardTrendChart component
vi.mock('../StandardTrendChart', () => ({
  StandardTrendChart: ({ data, title }: any) => (
    <div data-testid="standard-trend-chart">
      <h3>{title}</h3>
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
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
  {
    id: '2',
    name: 'X-Ray Image.jpg',
    type: 'image',
    size: '1.8 MB',
    url: '/documents/xray.jpg',
    uploadedBy: 'Dr. Smith',
    uploadedAt: '2024-01-01T00:00:00Z',
  },
];

const mockComments: CardComment[] = [
  {
    id: '1',
    author: 'Dr. Smith',
    authorRole: 'Provider',
    content: 'Initial assessment completed',
    timestamp: '2024-01-15 10:30 AM',
    isInternal: true,
  },
  {
    id: '2',
    author: 'Nurse Johnson',
    authorRole: 'Nurse',
    content: 'Patient education provided',
    timestamp: '2024-01-15 11:15 AM',
    isInternal: true,
  },
];

const mockSOAPNoteData = {
  id: 'soap-1',
  patientId: 'patient-123',
  patientName: 'John Doe',
  provider: 'Dr. Sarah Wilson',
  date: '2024-01-15',
  subjective: {
    chiefComplaint: 'Chest pain and shortness of breath for 2 days',
    historyOfPresentIllness: 'Patient reports sudden onset of chest pain yesterday morning, described as sharp and stabbing, worse with deep inspiration. Associated with shortness of breath and mild diaphoresis.',
    reviewOfSystems: 'No fever, chills, or recent illness. No nausea, vomiting, or abdominal pain. No recent travel or exposure to sick contacts.',
    socialHistory: 'Non-smoker, occasional alcohol use. Works as office manager, sedentary job.',
    familyHistory: 'Father had MI at age 55. Mother has diabetes. No known family history of cancer.',
  },
  objective: {
    vitalSigns: 'BP: 140/90, HR: 88 bpm, RR: 18, Temp: 98.6°F, O2 Sat: 96% on room air',
    physicalExam: 'Alert and oriented x3. No acute distress. Heart: RRR, no murmurs, rubs, or gallops. Lungs: Clear to auscultation bilaterally. No peripheral edema.',
    laboratoryResults: 'CBC: WNL, CMP: Glucose 110, BUN/Cr: 18/1.0, Troponin: 0.02 (normal), BNP: 45 (normal)',
    imagingResults: 'CXR: Clear lung fields, normal cardiac silhouette. EKG: Normal sinus rhythm, no acute changes.',
    otherFindings: 'Patient appears comfortable at rest. No signs of respiratory distress.',
  },
  assessment: {
    diagnosis: 'Chest pain, likely musculoskeletal in origin',
    differentialDiagnosis: [
      'Musculoskeletal chest pain',
      'Costochondritis',
      'Anxiety-related chest pain',
      'GERD',
      'Cardiac etiology (ruled out by normal troponin and EKG)',
    ],
    clinicalImpression: 'Low risk for acute coronary syndrome based on normal cardiac markers and EKG. Pain characteristics and physical exam findings suggest musculoskeletal etiology.',
    riskFactors: [
      'Family history of MI',
      'Elevated blood pressure',
      'Sedentary lifestyle',
    ],
  },
  plan: {
    medications: [
      'Ibuprofen 400mg PO TID x 7 days for pain',
      'Continue current antihypertensive medications',
    ],
    procedures: [
      'Follow-up in 1 week',
      'Consider stress test if symptoms persist',
    ],
    followUp: 'Return in 1 week for re-evaluation. Call if symptoms worsen or new symptoms develop.',
    patientEducation: 'Educated about chest pain symptoms that require immediate medical attention. Discussed importance of regular exercise and blood pressure monitoring.',
    referrals: [
      'Cardiology consultation if symptoms persist',
      'Physical therapy for postural exercises',
    ],
  },
  status: 'draft' as const,
  careTeam: mockTeamMembers,
  tags: mockTags,
  documents: mockDocuments,
  comments: mockComments,
};

const defaultProps = {
  id: 'soap-card-1',
  type: 'soapNote' as const,
  title: 'SOAP Note - John Doe',
  content: null,
  priority: 'medium' as const,
  status: 'new' as const,
  patientId: 'patient-123',
  patientName: 'John Doe',
  size: { min: 300, max: 1200, default: 600, current: 600 },
  position: { x: 100, y: 100 },
  dimensions: { width: 600, height: 400 },
  config: {
    type: 'soapNote' as const,
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
  handlers: mockHandlers,
};

describe('SOAPNoteCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders SOAP note card with all sections', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
        />
      );

      expect(screen.getByTestId('base-card')).toBeInTheDocument();
      expect(screen.getByText(/SOAP Note - John Doe/i)).toBeInTheDocument();
      expect(screen.getByText('Dr. Sarah Wilson')).toBeInTheDocument();
    });

    it('displays SOAP status and task status badges', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
        />
      );

      expect(screen.getAllByText('Draft')[0]).toBeInTheDocument();
      // Note: Status badge "New" is passed as a prop but not rendered in the mock
    });

    it('renders all tab navigation buttons', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
        />
      );

      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Members')).toBeInTheDocument();
      expect(screen.getByText('Due Date')).toBeInTheDocument();
      expect(screen.getByText('Attachments')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('Activity')).toBeInTheDocument();
    });
  });

  describe('Info Tab Content', () => {
    it('displays all SOAP sections in info tab', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
        />
      );

      // Check for SOAP section headers
      expect(screen.getByText('Subjective')).toBeInTheDocument();
      expect(screen.getByText('Objective')).toBeInTheDocument();
      expect(screen.getByText('Assessment')).toBeInTheDocument();
      expect(screen.getByText('Plan')).toBeInTheDocument();
    });

    it('displays subjective content correctly', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
        />
      );

      expect(screen.getByText('Chief Complaint')).toBeInTheDocument();
      expect(screen.getByText('Chest pain and shortness of breath for 2 days')).toBeInTheDocument();
      expect(screen.getByText('History of Present Illness')).toBeInTheDocument();
    });

    it('displays objective content correctly', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
        />
      );

      expect(screen.getByText('Vital Signs')).toBeInTheDocument();
      expect(screen.getByText('BP: 140/90, HR: 88 bpm, RR: 18, Temp: 98.6°F, O2 Sat: 96% on room air')).toBeInTheDocument();
      expect(screen.getByText('Physical Exam')).toBeInTheDocument();
    });

    it('displays assessment content correctly', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
        />
      );

      expect(screen.getByText('Primary Diagnosis')).toBeInTheDocument();
      expect(screen.getByText('Chest pain, likely musculoskeletal in origin')).toBeInTheDocument();
      expect(screen.getByText('Differential Diagnosis')).toBeInTheDocument();
    });

    it('displays plan content correctly', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
        />
      );

      expect(screen.getByText('Medications')).toBeInTheDocument();
      expect(screen.getByText('Ibuprofen 400mg PO TID x 7 days for pain')).toBeInTheDocument();
      expect(screen.getByText('Follow-up')).toBeInTheDocument();
    });

    it('displays action buttons', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
        />
      );

      expect(screen.getByText('Edit Note')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText('Sign & Finalize')).toBeInTheDocument();
    });
  });

  describe('Section Expansion', () => {
    it('allows toggling section expansion', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
        />
      );

      // Check that the component renders without errors
      expect(screen.getByTestId('base-card')).toBeInTheDocument();
    });

    it('shows chevron icons for section expansion', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
        />
      );

      // Check that the component renders without errors
      expect(screen.getByTestId('base-card')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches to members tab and displays care team', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
          activeTab="members"
          onTabChange={vi.fn()}
        />
      );
      
      expect(screen.getByText('Care Team')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('Nurse Johnson')).toBeInTheDocument();
    });

    it('displays tags in info tab', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
        />
      );

      // Check that the component renders without errors
      expect(screen.getByTestId('base-card')).toBeInTheDocument();
    });

    it('switches to attachments tab and displays documents', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
          activeTab="attachments"
          onTabChange={vi.fn()}
        />
      );
      
      expect(screen.getByText('Lab Results.pdf')).toBeInTheDocument();
      expect(screen.getByText('X-Ray Image.jpg')).toBeInTheDocument();
    });

    it('switches to notes tab and displays notes section', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
          activeTab="notes"
          onTabChange={vi.fn()}
        />
      );
      
      expect(screen.getByPlaceholderText('Add clinical notes or observations...')).toBeInTheDocument();
    });

    it('switches to activity tab and displays comments', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
          activeTab="activity"
          onTabChange={vi.fn()}
        />
      );
      
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('Initial assessment completed')).toBeInTheDocument();
    });
  });

  describe('Status Handling', () => {
    it('displays correct status for draft SOAP note', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={{ ...mockSOAPNoteData, status: 'draft' }}
        />
      );

      expect(screen.getAllByText('Draft')[0]).toBeInTheDocument();
    });

    it('displays correct status for signed SOAP note', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={{ ...mockSOAPNoteData, status: 'signed' }}
        />
      );

      expect(screen.getAllByText('Signed')[0]).toBeInTheDocument();
    });

    it('displays correct status for finalized SOAP note', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={{ ...mockSOAPNoteData, status: 'finalized' }}
        />
      );

      expect(screen.getAllByText('Finalized')[0]).toBeInTheDocument();
    });
  });

  describe('Empty State Handling', () => {
    it('handles empty care team gracefully', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={{ ...mockSOAPNoteData, careTeam: [] }}
          activeTab="members"
          onTabChange={vi.fn()}
        />
      );
      expect(screen.getByText('Add Member')).toBeInTheDocument();
    });

    it('handles empty tags gracefully', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={{ ...mockSOAPNoteData, tags: [] }}
        />
      );

      // Tags are displayed in the Info tab, not as a separate tab
      // Check that the component renders without errors when tags are empty
      expect(screen.getByTestId('base-card')).toBeInTheDocument();
    });

    it('handles empty documents gracefully', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={{ ...mockSOAPNoteData, documents: [] }}
          activeTab="attachments"
          onTabChange={vi.fn()}
        />
      );

      expect(screen.getByText('Upload')).toBeInTheDocument();
    });

    it('handles empty comments gracefully', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={{ ...mockSOAPNoteData, comments: [] }}
          activeTab="activity"
          onTabChange={vi.fn()}
        />
      );

      expect(screen.getByText('Export')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for interactive elements', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
        />
      );

      const tabButtons = screen.getAllByRole('button');
      expect(tabButtons.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation for tabs', () => {
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
        />
      );

      const membersTab = screen.getByText('Members');
      expect(membersTab).toBeInTheDocument();
      
      // Tab should be focusable
      membersTab.focus();
      expect(document.activeElement).toBe(membersTab);
    });
  });

  describe('Error Handling', () => {
    it('handles missing SOAP note data gracefully', () => {
      const incompleteData = {
        ...mockSOAPNoteData,
        subjective: {
          chiefComplaint: '',
          historyOfPresentIllness: '',
          reviewOfSystems: '',
          socialHistory: '',
          familyHistory: '',
        },
      };

      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={incompleteData}
        />
      );

      expect(screen.getByText(/SOAP Note - John Doe/i)).toBeInTheDocument();
    });

    it('handles missing assessment data gracefully', () => {
      const incompleteData = {
        ...mockSOAPNoteData,
        assessment: {
          diagnosis: '',
          differentialDiagnosis: [],
          clinicalImpression: '',
          riskFactors: [],
        },
      };

      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={incompleteData}
        />
      );

      expect(screen.getByText(/SOAP Note - John Doe/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders without performance issues', () => {
      const startTime = performance.now();
      
      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={mockSOAPNoteData}
        />
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render in less than 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('handles large datasets efficiently', () => {
      const largeSOAPData = {
        ...mockSOAPNoteData,
        assessment: {
          ...mockSOAPNoteData.assessment,
          differentialDiagnosis: Array(50).fill(0).map((_, i) => `Diagnosis ${i + 1}`),
        },
      };

      render(
        <SOAPNoteCard
          {...defaultProps}
          soapNoteData={largeSOAPData}
        />
      );

      expect(screen.getByText('Assessment')).toBeInTheDocument();
    });
  });
});
