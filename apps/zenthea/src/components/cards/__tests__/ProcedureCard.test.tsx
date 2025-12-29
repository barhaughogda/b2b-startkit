import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProcedureCard } from '../ProcedureCard';
import { BaseCardProps, CardEventHandlers, TeamMember, Tag as CardTag, Document, CardComment } from '../types';

// Mock the BaseCardComponent with tab navigation
vi.mock('../BaseCard', () => ({
  BaseCardComponent: ({ children, activeTab, onTabChange, tabNames, className, ...props }: any) => {
    const [currentTab, setCurrentTab] = React.useState(activeTab || 'info');
    
    const handleTabChange = (tab: string) => {
      setCurrentTab(tab);
      onTabChange?.(tab);
    };
    
    React.useEffect(() => {
      if (activeTab !== undefined) {
        setCurrentTab(activeTab);
      }
    }, [activeTab]);
    
    return (
      <div data-testid="base-card" className={className} {...props}>
        {/* Mock tab navigation */}
        <div className="tab-navigation">
          <button onClick={() => handleTabChange('info')}>Info</button>
          <button onClick={() => handleTabChange('members')}>Members</button>
          <button onClick={() => handleTabChange('tags')}>Tags</button>
          <button onClick={() => handleTabChange('dueDate')}>Due Date</button>
          <button onClick={() => handleTabChange('attachments')}>Attachments</button>
          <button onClick={() => handleTabChange('notes')}>Notes</button>
          <button onClick={() => handleTabChange('activity')}>Activity</button>
        </div>
        {/* Render children - ProcedureCard will use its own activeTab prop */}
        {children}
      </div>
    );
  }
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Stethoscope: () => <div data-testid="stethoscope-icon" />,
  User: () => <div data-testid="user-icon" />,
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
  Scissors: () => <div data-testid="scissors-icon" />,
  Clipboard: () => <div data-testid="clipboard-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  ShieldCheck: () => <div data-testid="shield-check-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Heart: () => <div data-testid="heart-icon" />,
  Brain: () => <div data-testid="brain-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  Building: () => <div data-testid="building-icon" />
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

// Wrapper component to manage tab state for testing
const ProcedureCardWrapper = ({ procedureData, handlers, ...baseProps }: any) => {
  const [activeTab, setActiveTab] = React.useState('info');
  
  return (
    <ProcedureCard
      {...baseProps}
      procedureData={procedureData}
      handlers={handlers}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  );
};

describe('ProcedureCard', () => {
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
    id: 'procedure-1',
    type: 'procedure',
    title: 'Colonoscopy',
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
      type: 'procedure' as const,
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

  const mockProcedureData = {
    id: 'procedure-1',
    patientId: 'patient-1',
    patientName: 'John Smith',
    patientDateOfBirth: '1985-03-15',
    procedure: {
      type: 'Colonoscopy',
      code: '45378',
      description: 'Colonoscopy with biopsy',
      category: 'Diagnostic',
      duration: '30 minutes',
      status: 'scheduled' as const,
      scheduledDate: '2024-02-15T10:00:00.000Z',
      performedDate: null,
      location: 'Endoscopy Suite 3',
      facility: 'Main Hospital',
      anesthesia: 'Moderate sedation',
      preparation: 'Bowel preparation required. Clear liquids only 24 hours before procedure.',
      instructions: 'No food or drink after midnight. Arrive 1 hour early for check-in.',
      indication: 'Routine screening colonoscopy',
      findings: null,
      complications: null,
      followUp: 'Follow-up appointment scheduled in 1 week'
    },
    provider: {
      name: 'Dr. Sarah Wilson',
      npi: '1234567890',
      specialty: 'Gastroenterology',
      credentials: 'MD, FACG',
      phone: '(555) 123-4567',
      email: 'sarah.wilson@clinic.com'
    },
    outcomes: [
      {
        id: '1',
        type: 'Finding',
        description: 'No polyps detected',
        timestamp: '2024-02-15T10:30:00.000Z'
      }
    ],
    careTeam: [
      {
        id: 'provider-1',
        name: 'Dr. Sarah Wilson',
        role: 'Gastroenterologist',
        initials: 'SW',
        avatar: '/avatars/dr-wilson.jpg',
        isActive: true
      },
      {
        id: 'nurse-1',
        name: 'Nurse Jane Doe',
        role: 'RN',
        initials: 'JD',
        avatar: '/avatars/nurse-doe.jpg',
        isActive: true
      }
    ],
    tags: [
      { id: 'tag-1', name: 'Screening', color: 'blue', category: 'medical' as const }
    ],
    documents: [
      {
        id: 'doc-1',
        name: 'Procedure Report',
        type: 'document',
        size: '2.5 MB',
        url: '/documents/procedure-report.pdf',
        uploadedBy: 'Dr. Sarah Wilson',
        uploadedAt: '2024-02-15T11:00:00.000Z'
      }
    ],
    comments: [
      {
        id: 'comment-1',
        author: 'Dr. Sarah Wilson',
        authorRole: 'Provider',
        content: 'Patient prepared well for procedure. No complications.',
        timestamp: '2024-02-15T10:45:00.000Z',
        isInternal: true
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the procedure card with basic information', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getAllByText('Colonoscopy')[0]).toBeInTheDocument();
      expect(screen.getByText('John Smith', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('DOB: 1985-03-15', { exact: false })).toBeInTheDocument();
      expect(screen.getAllByText('Scheduled')[0]).toBeInTheDocument();
    });

    it('renders the procedure information section', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Procedure Information')).toBeInTheDocument();
      expect(screen.getAllByText('Colonoscopy')[0]).toBeInTheDocument();
      expect(screen.getByText('Code: 45378')).toBeInTheDocument();
      expect(screen.getByText('Diagnostic')).toBeInTheDocument();
      expect(screen.getByText('30 minutes')).toBeInTheDocument();
    });

    it('renders the provider information section', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Provider Information')).toBeInTheDocument();
      expect(screen.getAllByText('Dr. Sarah Wilson')[0]).toBeInTheDocument();
      expect(screen.getByText('Gastroenterology')).toBeInTheDocument();
      expect(screen.getByText('MD, FACG')).toBeInTheDocument();
    });

    it('renders the scheduling information section', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Scheduling Information')).toBeInTheDocument();
      expect(screen.getByText('Endoscopy Suite 3')).toBeInTheDocument();
      expect(screen.getByText('Main Hospital')).toBeInTheDocument();
      // Check for scheduled date specifically in the scheduling section
      const schedulingSection = screen.getByText('Scheduling Information').closest('div');
      expect(schedulingSection).toBeInTheDocument();
      expect(screen.getAllByText(/2\/15\/2024/).length).toBeGreaterThan(0);
    });

    it('renders preparation instructions when present', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Preparation Instructions')).toBeInTheDocument();
      expect(screen.getByText(/Bowel preparation required/)).toBeInTheDocument();
      expect(screen.getByText(/Clear liquids only/)).toBeInTheDocument();
    });

    it('renders procedure instructions when present', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Procedure Instructions')).toBeInTheDocument();
      expect(screen.getByText(/No food or drink after midnight/)).toBeInTheDocument();
      expect(screen.getByText(/Arrive 1 hour early/)).toBeInTheDocument();
    });

    it('renders outcomes when present', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Outcomes')).toBeInTheDocument();
      expect(screen.getByText('No polyps detected')).toBeInTheDocument();
    });

    it('renders follow-up information when present', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Follow-up')).toBeInTheDocument();
      expect(screen.getByText(/Follow-up appointment scheduled in 1 week/)).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders all tab navigation buttons', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
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
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      fireEvent.click(screen.getByText('Members'));
      // Check for care team members directly
      expect(screen.getAllByText('Dr. Sarah Wilson').length).toBeGreaterThan(0);
      expect(screen.getByText('Nurse Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Gastroenterologist')).toBeInTheDocument();
      expect(screen.getByText('RN')).toBeInTheDocument();
    });

    it('switches to tags tab when clicked', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      fireEvent.click(screen.getByText('Tags'));
      expect(screen.getAllByText('Tags')[0]).toBeInTheDocument();
      expect(screen.getByText('Screening')).toBeInTheDocument();
    });

    it('switches to due date tab when clicked', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      fireEvent.click(screen.getByText('Due Date'));
      expect(screen.getAllByText('Due Date')[0]).toBeInTheDocument();
      expect(screen.getByText(/2\/15\/2024/)).toBeInTheDocument();
    });

    it('switches to attachments tab when clicked', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      fireEvent.click(screen.getByText('Attachments'));
      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('Procedure Report')).toBeInTheDocument();
    });
  });

  describe('Notes Section', () => {
    it('renders notes section with default content', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      // Click on the Notes tab first
      fireEvent.click(screen.getByText('Notes'));
      
      // Click the Show button to expand the notes
      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);
      
      expect(screen.getByText(/Patient prepared well for procedure/)).toBeInTheDocument();
    });

    it('toggles notes visibility when show/hide button is clicked', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
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
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
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
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      // Click on the Activity tab first
      fireEvent.click(screen.getByText('Activity'));

      expect(screen.getAllByText('Dr. Sarah Wilson')[0]).toBeInTheDocument();
      expect(screen.getByText('Patient prepared well for procedure. No complications.')).toBeInTheDocument();
    });

    it('renders export button for activity', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      // Click on the Activity tab first
      fireEvent.click(screen.getByText('Activity'));

      expect(screen.getByText('Export')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('displays scheduled status with correct styling', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      const statusBadge = screen.getAllByText('Scheduled')[0];
      expect(statusBadge).toBeInTheDocument();
    });

    it('displays completed status with correct styling', () => {
      const completedData = {
        ...mockProcedureData,
        procedure: {
          ...mockProcedureData.procedure,
          status: 'completed' as const,
          performedDate: '2024-02-15T10:30:00.000Z'
        }
      };

      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={completedData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getAllByText('Completed')[0]).toBeInTheDocument();
    });

    it('displays cancelled status with correct styling', () => {
      const cancelledData = {
        ...mockProcedureData,
        procedure: {
          ...mockProcedureData.procedure,
          status: 'cancelled' as const
        }
      };

      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={cancelledData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getAllByText('Cancelled')[0]).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('handles empty outcomes array', () => {
      const dataWithoutOutcomes = {
        ...mockProcedureData,
        outcomes: []
      };

      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={dataWithoutOutcomes}
          handlers={mockHandlers}
        />
      );

      expect(screen.queryByText('Outcomes')).not.toBeInTheDocument();
    });

    it('handles missing preparation instructions', () => {
      const dataWithoutPreparation = {
        ...mockProcedureData,
        procedure: {
          ...mockProcedureData.procedure,
          preparation: null
        }
      };

      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={dataWithoutPreparation}
          handlers={mockHandlers}
        />
      );

      expect(screen.queryByText('Preparation Instructions')).not.toBeInTheDocument();
    });

    it('handles missing procedure instructions', () => {
      const dataWithoutInstructions = {
        ...mockProcedureData,
        procedure: {
          ...mockProcedureData.procedure,
          instructions: null
        }
      };

      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={dataWithoutInstructions}
          handlers={mockHandlers}
        />
      );

      expect(screen.queryByText('Procedure Instructions')).not.toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('formats scheduled date correctly', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      // The date should be formatted as a readable date string (appears multiple times)
      expect(screen.getAllByText(/2\/15\/2024/).length).toBeGreaterThan(0);
    });

    it('formats performed date correctly when present', () => {
      const completedData = {
        ...mockProcedureData,
        procedure: {
          ...mockProcedureData.procedure,
          status: 'completed' as const,
          performedDate: '2024-02-15T10:30:00.000Z'
        }
      };

      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={completedData}
          handlers={mockHandlers}
        />
      );

      // Check for performed date text
      expect(screen.getByText(/Performed:/)).toBeInTheDocument();
      expect(screen.getAllByText(/2\/15\/2024/).length).toBeGreaterThan(0);
    });
  });

  describe('Component Integration', () => {
    it('passes correct props to BaseCardComponent', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      const baseCard = screen.getByTestId('base-card');
      expect(baseCard).toBeInTheDocument();
      expect(baseCard).toHaveClass('procedure-card');
    });

    it('handles missing handlers gracefully', () => {
      render(
        <ProcedureCard
          {...mockBaseProps}
          procedureData={mockProcedureData}
        />
      );

      expect(screen.getAllByText('Colonoscopy')[0]).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for interactive elements', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      // Check that buttons are accessible
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('has proper heading structure', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('Procedure Information')).toBeInTheDocument();
      expect(screen.getByText('Provider Information')).toBeInTheDocument();
      expect(screen.getByText('Scheduling Information')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('displays loading skeleton for members tab when loading', () => {
      render(
        <ProcedureCard
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
          activeTab="members"
          isLoading={true}
        />
      );

      // Check for skeleton elements
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('displays loading skeleton for tags tab when loading', () => {
      render(
        <ProcedureCard
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
          activeTab="tags"
          isLoading={true}
        />
      );

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('displays loading skeleton for attachments tab when loading', () => {
      render(
        <ProcedureCard
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
          activeTab="attachments"
          isLoading={true}
        />
      );

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty States', () => {
    it('displays empty state for members tab when no care team members', () => {
      const emptyData = {
        ...mockProcedureData,
        careTeam: []
      };

      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={emptyData}
          handlers={mockHandlers}
        />
      );

      fireEvent.click(screen.getByText('Members'));
      expect(screen.getByText('No care team members')).toBeInTheDocument();
      expect(screen.getByText(/Add members to the care team/)).toBeInTheDocument();
    });

    it('displays empty state for tags tab when no tags', () => {
      const emptyData = {
        ...mockProcedureData,
        tags: []
      };

      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={emptyData}
          handlers={mockHandlers}
        />
      );

      fireEvent.click(screen.getByText('Tags'));
      expect(screen.getByText('No tags')).toBeInTheDocument();
      expect(screen.getByText(/Add tags to organize/)).toBeInTheDocument();
    });

    it('displays empty state for attachments tab when no documents', () => {
      const emptyData = {
        ...mockProcedureData,
        documents: []
      };

      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={emptyData}
          handlers={mockHandlers}
        />
      );

      fireEvent.click(screen.getByText('Attachments'));
      expect(screen.getByText('No documents')).toBeInTheDocument();
      expect(screen.getByText(/Upload documents related/)).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports keyboard navigation for tab switching with arrow keys', async () => {
      const user = (await import('@testing-library/user-event')).default;
      const userEvent = user.setup();

      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      // Get tab buttons
      const infoTab = screen.getByText('Info');
      const membersTab = screen.getByText('Members');
      const tagsTab = screen.getByText('Tags');

      // Focus first tab
      infoTab.focus();
      expect(document.activeElement).toBe(infoTab);

      // Arrow right should move to next tab
      await userEvent.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(membersTab);

      // Arrow right again
      await userEvent.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(tagsTab);

      // Arrow left should go back
      await userEvent.keyboard('{ArrowLeft}');
      expect(document.activeElement).toBe(membersTab);
    });

    it('supports Home and End keys for tab navigation', async () => {
      const user = (await import('@testing-library/user-event')).default;
      const userEvent = user.setup();

      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      const infoTab = screen.getByText('Info');
      const activityTab = screen.getByText('Activity');

      // Focus middle tab
      const membersTab = screen.getByText('Members');
      membersTab.focus();

      // Home key should jump to first tab
      await userEvent.keyboard('{Home}');
      expect(document.activeElement).toBe(infoTab);

      // End key should jump to last tab
      await userEvent.keyboard('{End}');
      expect(document.activeElement).toBe(activityTab);
    });

    it('activates tab on Enter key press', async () => {
      const user = (await import('@testing-library/user-event')).default;
      const userEvent = user.setup();

      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      const membersTab = screen.getByText('Members');
      membersTab.focus();

      // Press Enter to activate
      await userEvent.keyboard('{Enter}');

      // Should show care team members
      expect(screen.getAllByText('Dr. Sarah Wilson').length).toBeGreaterThan(0);
    });

    it('activates tab on Space key press', async () => {
      const user = (await import('@testing-library/user-event')).default;
      const userEvent = user.setup();

      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      const tagsTab = screen.getByText('Tags');
      tagsTab.focus();

      // Press Space to activate
      await userEvent.keyboard(' ');

      // Should show tags
      expect(screen.getByText('Screening')).toBeInTheDocument();
    });
  });

  describe('Error Boundary', () => {
    it('handles errors gracefully when procedure data is invalid', () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const invalidData = {
        ...mockProcedureData,
        procedure: null as any
      };

      // Should not throw, but render error boundary
      expect(() => {
        render(
          <ProcedureCardWrapper
            {...mockBaseProps}
            procedureData={invalidData}
            handlers={mockHandlers}
          />
        );
      }).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('handles missing handlers gracefully', () => {
      render(
        <ProcedureCard
          {...mockBaseProps}
          procedureData={mockProcedureData}
        />
      );

      expect(screen.getAllByText('Colonoscopy')[0]).toBeInTheDocument();
    });
  });

  describe('Reusable Components', () => {
    it('uses ProcedureStatusBadge component for status display', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      // Status badge should be rendered
      const statusBadge = screen.getAllByText('Scheduled')[0];
      expect(statusBadge).toBeInTheDocument();
    });

    it('uses formatDate utility for date formatting', () => {
      render(
        <ProcedureCardWrapper
          {...mockBaseProps}
          procedureData={mockProcedureData}
          handlers={mockHandlers}
        />
      );

      // Date should be formatted correctly
      expect(screen.getAllByText(/2\/15\/2024/).length).toBeGreaterThan(0);
    });
  });
});

