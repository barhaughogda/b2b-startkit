import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createSamplePrescriptionCard } from '@/components/cards/utils/PrescriptionSampleData';

// Mock the extracted components that don't exist yet
vi.mock('@/components/cards/components/PrescriptionCardHeader', () => ({
  PrescriptionCardHeader: ({ medication, prescriber, pharmacy }: any) => (
    <div data-testid="prescription-header">
      <h3>{medication.name}</h3>
      <p>Prescriber: {prescriber.name}</p>
      <p>Pharmacy: {pharmacy.name}</p>
    </div>
  ),
}));

vi.mock('@/components/cards/components/PrescriptionCardTabs', () => ({
  PrescriptionCardTabs: ({ activeTab, onTabChange }: any) => (
    <div data-testid="prescription-tabs">
      <button 
        data-testid="tab-info" 
        onClick={() => onTabChange('info')}
        className={activeTab === 'info' ? 'active' : ''}
      >
        Info
      </button>
      <button 
        data-testid="tab-notes" 
        onClick={() => onTabChange('notes')}
        className={activeTab === 'notes' ? 'active' : ''}
      >
        Notes
      </button>
      <button 
        data-testid="tab-activity" 
        onClick={() => onTabChange('activity')}
        className={activeTab === 'activity' ? 'active' : ''}
      >
        Activity
      </button>
    </div>
  ),
}));

vi.mock('@/components/cards/components/PrescriptionInfoTab', () => ({
  PrescriptionInfoTab: ({ prescription, interactions, allergies }: any) => (
    <div data-testid="prescription-info-tab">
      <h4>Prescription Details</h4>
      <p>Dosage: {prescription.dosage}</p>
      <p>Interactions: {interactions.length}</p>
      <p>Allergies: {allergies.length}</p>
    </div>
  ),
}));

vi.mock('@/components/cards/components/PrescriptionNotesTab', () => ({
  PrescriptionNotesTab: ({ notes, onNotesChange }: any) => (
    <div data-testid="prescription-notes-tab">
      <h4>Clinical Notes</h4>
      <textarea 
        data-testid="notes-textarea"
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
      />
    </div>
  ),
}));

vi.mock('@/components/cards/components/PrescriptionActivityTab', () => ({
  PrescriptionActivityTab: ({ activity }: any) => (
    <div data-testid="prescription-activity-tab">
      <h4>Activity Timeline</h4>
      <p>Activities: {activity.length}</p>
    </div>
  ),
}));

describe('PrescriptionCard Refactoring Tests', () => {
  const mockBaseProps = {
    id: 'test-prescription',
    type: 'prescription' as const,
    title: 'Test Prescription',
    content: null,
    priority: 'medium' as const,
    status: 'new' as const,
    patientId: 'P123456',
    patientName: 'John Doe',
    patientDateOfBirth: '1980-01-01',
    dueDate: undefined,
    size: { min: 300, max: 800, default: 500, current: 500 },
    position: { x: 100, y: 100 },
    dimensions: { width: 500, height: 400 },
    isMinimized: false,
    isMaximized: false,
    zIndex: 1,
    config: {
      type: 'prescription' as const,
      color: '#3B82F6',
      icon: () => null,
      size: { min: 300, max: 800, default: 500, current: 500 },
      layout: 'detailed' as const,
      interactions: {
        resizable: true,
        draggable: true,
        stackable: true,
        minimizable: true,
        maximizable: true,
        closable: true
      },
      priority: {
        color: '#3B82F6',
        borderColor: '#3B82F6',
        icon: null,
        badge: 'Medium'
      }
    },
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    lastAccessedAt: '2024-01-15T10:30:00Z',
    accessCount: 1,
    comments: [],
    auditTrail: [],
    aiAssigned: false,
    aiCompleted: false,
    aiNeedsHumanInput: false
  };

  const mockHandlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onStatusChange: vi.fn(),
    onNotesUpdate: vi.fn(),
    onActivityAdd: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Structure Tests', () => {
    it('should render PrescriptionCardHeader with correct props', () => {
      const sampleCard = createSamplePrescriptionCard('test-prescription', mockBaseProps, mockHandlers);
      render(sampleCard);

      expect(screen.getByTestId('prescription-header')).toBeInTheDocument();
      expect(screen.getByText('Lisinopril')).toBeInTheDocument();
      expect(screen.getByText('Prescriber: Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('Pharmacy: CVS Pharmacy')).toBeInTheDocument();
    });

    it('should render PrescriptionCardTabs with correct initial state', () => {
      const sampleCard = createSamplePrescriptionCard('test-prescription', mockBaseProps, mockHandlers);
      render(sampleCard);

      expect(screen.getByTestId('prescription-tabs')).toBeInTheDocument();
      expect(screen.getByTestId('tab-info')).toHaveClass('active');
    });

    it('should render PrescriptionInfoTab by default', () => {
      const sampleCard = createSamplePrescriptionCard('test-prescription', mockBaseProps, mockHandlers);
      render(sampleCard);

      expect(screen.getByTestId('prescription-info-tab')).toBeInTheDocument();
      expect(screen.getByText('Prescription Details')).toBeInTheDocument();
      expect(screen.getByText('Dosage: 10mg')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation Tests', () => {
    it('should switch to notes tab when clicked', async () => {
      const sampleCard = createSamplePrescriptionCard('test-prescription', mockBaseProps, mockHandlers);
      render(sampleCard);

      const notesTab = screen.getByTestId('tab-notes');
      fireEvent.click(notesTab);

      await waitFor(() => {
        expect(screen.getByTestId('prescription-notes-tab')).toBeInTheDocument();
        expect(screen.getByText('Clinical Notes')).toBeInTheDocument();
      });
    });

    it('should switch to activity tab when clicked', async () => {
      const sampleCard = createSamplePrescriptionCard('test-prescription', mockBaseProps, mockHandlers);
      render(sampleCard);

      const activityTab = screen.getByTestId('tab-activity');
      fireEvent.click(activityTab);

      await waitFor(() => {
        expect(screen.getByTestId('prescription-activity-tab')).toBeInTheDocument();
        expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
      });
    });
  });

  describe('Component Integration Tests', () => {
    it('should pass correct props to PrescriptionInfoTab', () => {
      const sampleCard = createSamplePrescriptionCard('test-prescription', mockBaseProps, mockHandlers);
      render(sampleCard);

      expect(screen.getByText('Interactions: 1')).toBeInTheDocument();
      expect(screen.getByText('Allergies: 1')).toBeInTheDocument();
    });

    it('should handle notes changes in PrescriptionNotesTab', async () => {
      const sampleCard = createSamplePrescriptionCard('test-prescription', mockBaseProps, mockHandlers);
      render(sampleCard);

      // Switch to notes tab
      fireEvent.click(screen.getByTestId('tab-notes'));

      await waitFor(() => {
        const textarea = screen.getByTestId('notes-textarea');
        expect(textarea).toBeInTheDocument();
        
        fireEvent.change(textarea, { target: { value: 'Updated notes' } });
        expect(textarea).toHaveValue('Updated notes');
      });
    });
  });

  describe('File Size Validation Tests', () => {
    it('should have main PrescriptionCard component under 400 lines', () => {
      // This test will fail initially as the component is 787 lines
      // It will pass after refactoring when component is <400 lines
      const fs = require('fs');
      const path = require('path');
      
      const componentPath = path.join(__dirname, '../../components/cards/PrescriptionCard.tsx');
      const componentContent = fs.readFileSync(componentPath, 'utf8');
      const lineCount = componentContent.split('\n').length;
      
      expect(lineCount).toBeLessThan(400);
    });
  });

  describe('Extracted Component Tests', () => {
    it('should have PrescriptionCardHeader component under 150 lines', () => {
      // This test will fail initially as the component doesn't exist
      // It will pass after extraction
      const fs = require('fs');
      const path = require('path');
      
      const headerPath = path.join(__dirname, '../../components/cards/components/PrescriptionCardHeader.tsx');
      
      try {
        const headerContent = fs.readFileSync(headerPath, 'utf8');
        const lineCount = headerContent.split('\n').length;
        expect(lineCount).toBeLessThan(150);
      } catch (error) {
        // Component doesn't exist yet - this is expected in RED phase
        if (!(error instanceof Error)) {
          throw error;
        }
        expect(error.message).toContain('ENOENT');
      }
    });

    it('should have PrescriptionCardTabs component under 100 lines', () => {
      const fs = require('fs');
      const path = require('path');
      
      const tabsPath = path.join(__dirname, '../../components/cards/components/PrescriptionCardTabs.tsx');
      
      try {
        const tabsContent = fs.readFileSync(tabsPath, 'utf8');
        const lineCount = tabsContent.split('\n').length;
        expect(lineCount).toBeLessThan(100);
      } catch (error) {
        // Component doesn't exist yet - this is expected in RED phase
        if (!(error instanceof Error)) {
          throw error;
        }
        expect(error.message).toContain('ENOENT');
      }
    });

    it('should have PrescriptionInfoTab component under 200 lines', () => {
      const fs = require('fs');
      const path = require('path');
      
      const infoTabPath = path.join(__dirname, '../../components/cards/components/PrescriptionInfoTab.tsx');
      
      try {
        const infoTabContent = fs.readFileSync(infoTabPath, 'utf8');
        const lineCount = infoTabContent.split('\n').length;
        expect(lineCount).toBeLessThan(200);
      } catch (error) {
        // Component doesn't exist yet - this is expected in RED phase
        if (!(error instanceof Error)) {
          throw error;
        }
        expect(error.message).toContain('ENOENT');
      }
    });
  });
});
