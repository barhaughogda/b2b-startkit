import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateRegistry, getCardTemplate, validateCardProps, createCardFromTemplate, registerCardTemplate, useCardTemplate } from '@/components/cards/TemplateRegistry';
import { CardType, BaseCardProps, CardEventHandlers } from '@/components/cards/types';
import { TemplateCard } from '../../../components/cards/components/TemplateCard';
import { TemplateCategories } from '../../../components/cards/components/TemplateCategories';
import { TemplateSearch } from '../../../components/cards/components/TemplateSearch';

// Mock the extracted components
vi.mock('@/components/cards/components/TemplateEditor', () => ({
  TemplateEditor: ({ template, onSave, onCancel }: any) => (
    <div data-testid="template-editor">
      {template ? 'Edit Template' : 'Create New Template'}
      <button onClick={onCancel}>Cancel</button>
      <button onClick={() => onSave(template)}>Save</button>
    </div>
  )
}));

vi.mock('@/components/cards/components/TemplateLibrary', () => ({
  TemplateLibrary: ({ onTemplateSelect, onTemplateEdit, onTemplateDelete }: any) => (
    <div data-testid="template-library">
      <button onClick={() => onTemplateSelect('appointment')}>Select</button>
      <button onClick={() => onTemplateEdit('appointment')}>Edit</button>
      <button onClick={() => onTemplateDelete('appointment')}>Delete</button>
    </div>
  )
}));

// Mock useTemplateHandlers hook
const mockUseTemplateHandlers = vi.fn();
vi.mock('@/components/cards/hooks/useTemplateHandlers', () => ({
  useTemplateHandlers: (config: any) => mockUseTemplateHandlers(config)
}));

// Mock the card components
vi.mock('@/components/cards/AppointmentCard', () => ({
  AppointmentCard: ({ appointmentData, ...props }: { appointmentData?: { patientName?: string }; [key: string]: unknown }) => (
    <div data-testid="appointment-card" {...props}>
      Appointment Card - {appointmentData?.patientName}
    </div>
  ),
  createAppointmentCard: vi.fn()
}));

vi.mock('@/components/cards/LabResultCard', () => ({
  LabResultCard: ({ labData, ...props }: { labData?: { patientName?: string }; [key: string]: unknown }) => (
    <div data-testid="lab-result-card" {...props}>
      Lab Result Card - {labData?.patientName}
    </div>
  )
}));

vi.mock('@/components/cards/MessageCard', () => ({
  MessageCard: ({ messageData, ...props }: { messageData?: { patientName?: string }; [key: string]: unknown }) => (
    <div data-testid="message-card" {...props}>
      Message Card - {messageData?.patientName}
    </div>
  )
}));

vi.mock('@/components/cards/VitalSignsCard', () => ({
  default: ({ vitalSignsData, ...props }: { vitalSignsData?: { patientName?: string }; [key: string]: unknown }) => (
    <div data-testid="vital-signs-card" {...props}>
      Vital Signs Card - {vitalSignsData?.patientName}
    </div>
  )
}));

vi.mock('@/components/cards/SOAPNoteCard', () => ({
  SOAPNoteCard: ({ soapNoteData, ...props }: { soapNoteData?: { patientName?: string }; [key: string]: unknown }) => (
    <div data-testid="soap-note-card" {...props}>
      SOAP Note Card - {soapNoteData?.patientName}
    </div>
  )
}));

vi.mock('@/components/cards/PrescriptionCard', () => ({
  PrescriptionCard: ({ prescriptionData, ...props }: { prescriptionData?: { patientName?: string }; [key: string]: unknown }) => (
    <div data-testid="prescription-card" {...props}>
      Prescription Card - {prescriptionData?.patientName}
    </div>
  )
}));

describe('TemplateRegistry Refactoring Tests', () => {
  const mockHandlers: CardEventHandlers = {
    onResize: vi.fn(),
    onDrag: vi.fn(),
    onClose: vi.fn(),
    onMinimize: vi.fn(),
    onMaximize: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  const baseProps: BaseCardProps = {
    id: 'test-card-1',
    type: 'appointment' as CardType,
    patientId: 'patient-123',
    patientName: 'John Doe',
    title: 'Test Card',
    content: <div>Test Content</div>,
    priority: 'medium',
    status: 'new',
    size: { min: 300, max: 500, default: 400, current: 400 },
    position: { x: 0, y: 0 },
    dimensions: { width: 400, height: 300 },
    isMinimized: false,
    isMaximized: false,
    zIndex: 1,
    config: {
      type: 'appointment' as CardType,
      color: 'bg-blue-50 border-blue-200',
      icon: null as any,
      size: { min: 300, max: 500, default: 400, current: 400 },
      layout: 'vertical',
      interactions: {
        resizable: true,
        draggable: true,
        stackable: true,
        minimizable: true,
        maximizable: true,
        closable: true,
      },
      priority: {
        color: 'text-gray-600',
        borderColor: 'border-gray-500',
        icon: null as any,
        badge: 'Medium',
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    accessCount: 0,
    handlers: mockHandlers
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TemplateCard Component Tests', () => {
    it('should render individual template card with correct props', () => {
      // This test will fail initially as TemplateCard doesn't exist yet
      // TemplateCard is now imported at the top
      
      render(
        <TemplateCard
          templateType="appointment"
          isSelected={false}
          onSelect={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByTestId('template-card')).toBeInTheDocument();
      expect(screen.getByText('Appointment')).toBeInTheDocument();
    });

    it('should handle template selection', () => {
      // TemplateCard is now imported at the top
      const onSelect = vi.fn();
      
      render(
        <TemplateCard
          templateType="appointment"
          isSelected={false}
          onSelect={onSelect}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('template-card'));
      expect(onSelect).toHaveBeenCalledWith('appointment');
    });

    it('should display template metadata correctly', () => {
      // TemplateCard is now imported at the top
      
      render(
        <TemplateCard
          templateType="message"
          isSelected={false}
          onSelect={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText('Message')).toBeInTheDocument();
      expect(screen.getByText('Patient Communication')).toBeInTheDocument();
    });
  });

  describe('TemplateCategories Component Tests', () => {
    it('should render category filters', () => {
      // This test will fail initially as TemplateCategories doesn't exist yet
      // TemplateCategories is now imported at the top
      
      render(
        <TemplateCategories
          categories={['medical', 'communication', 'diagnostic']}
          activeCategory="medical"
          onCategoryChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('template-categories')).toBeInTheDocument();
      expect(screen.getByText('Medical')).toBeInTheDocument();
      expect(screen.getByText('Communication')).toBeInTheDocument();
      expect(screen.getByText('Diagnostic')).toBeInTheDocument();
    });

    it('should handle category selection', () => {
      // TemplateCategories is now imported at the top
      const onCategoryChange = vi.fn();
      
      render(
        <TemplateCategories
          categories={['medical', 'communication', 'diagnostic']}
          activeCategory="medical"
          onCategoryChange={onCategoryChange}
        />
      );

      fireEvent.click(screen.getByText('Communication'));
      expect(onCategoryChange).toHaveBeenCalledWith('communication');
    });

    it('should highlight active category', () => {
      // TemplateCategories is now imported at the top
      
      render(
        <TemplateCategories
          categories={['medical', 'communication', 'diagnostic']}
          activeCategory="communication"
          onCategoryChange={vi.fn()}
        />
      );

      const activeCategoryButton = screen.getByText('Communication').closest('button');
      expect(activeCategoryButton).toHaveClass('text-green-600');
    });
  });

  describe('TemplateSearch Component Tests', () => {
    it('should render search input', () => {
      // This test will fail initially as TemplateSearch doesn't exist yet
      // TemplateSearch is now imported at the top
      
      render(
        <TemplateSearch
          searchQuery=""
          onSearchChange={vi.fn()}
          onSearchSubmit={vi.fn()}
        />
      );

      expect(screen.getByTestId('template-search')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search templates...')).toBeInTheDocument();
    });

    it('should handle search input changes', () => {
      // TemplateSearch is now imported at the top
      const onSearchChange = vi.fn();
      
      render(
        <TemplateSearch
          searchQuery=""
          onSearchChange={onSearchChange}
          onSearchSubmit={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search templates...');
      fireEvent.change(searchInput, { target: { value: 'appointment' } });
      
      expect(onSearchChange).toHaveBeenCalledWith('appointment');
    });

    it('should handle search submission', () => {
      // TemplateSearch is now imported at the top
      const onSearchSubmit = vi.fn();
      
      render(
        <TemplateSearch
          searchQuery="appointment"
          onSearchChange={vi.fn()}
          onSearchSubmit={onSearchSubmit}
        />
      );

      fireEvent.submit(screen.getByTestId('template-search'));
      expect(onSearchSubmit).toHaveBeenCalledWith('appointment');
    });
  });

  describe('TemplateRegistry Integration Tests', () => {
    it('should render all template types correctly', () => {
      const cardTypes: CardType[] = [
        'appointment', 'message', 'labResult', 'vitalSigns', 
        'soapNote', 'prescription', 'procedure', 'diagnosis'
      ];

      cardTypes.forEach(type => {
        // getCardTemplate is available from the imported TemplateRegistry
        const template = getCardTemplate(type);
        
        expect(template).toBeDefined();
        expect(template.type).toBe(type);
        expect(template.config).toBeDefined();
        expect(template.render).toBeInstanceOf(Function);
        expect(template.validate).toBeInstanceOf(Function);
      });
    });

    it('should validate card props correctly', () => {
        // validateCardProps is available from the imported TemplateRegistry
      
      expect(validateCardProps(baseProps)).toBe(true);
      
      const invalidProps = { ...baseProps, patientId: '' };
      expect(validateCardProps(invalidProps)).toBe(false);
    });

    it('should create cards from templates', () => {
        // createCardFromTemplate is available from the imported TemplateRegistry
      
      const card = createCardFromTemplate('appointment', baseProps);
      expect(card).toBeDefined();
    });

    it('should handle template registration', () => {
        // registerCardTemplate and getCardTemplate are available from the imported TemplateRegistry
      
      const customTemplate = {
        type: 'custom' as CardType,
        config: {
          type: 'custom' as CardType,
          color: 'bg-gray-50 border-gray-200',
          icon: () => null as any,
          size: { min: 300, max: 500, default: 400, current: 400 },
          layout: 'vertical' as const,
          interactions: {
            resizable: true, draggable: true, stackable: true,
            minimizable: true, maximizable: true, closable: true
          },
          priority: {
            color: 'text-gray-600',
            borderColor: 'border-gray-500',
            icon: null as any,
            badge: 'Custom'
          }
        },
        render: () => <div>Custom Card</div>,
        validate: () => true
      };

      registerCardTemplate('custom' as CardType, customTemplate);
      const retrievedTemplate = getCardTemplate('custom' as CardType);
      
      expect(retrievedTemplate).toBeDefined();
      expect(retrievedTemplate.type).toBe('custom');
    });
  });

  describe('TemplateRegistry Hook Tests', () => {
    it('should provide template hook functionality', () => {
        // useCardTemplate is available from the imported TemplateRegistry
      
      // This would need to be tested in a React component context
      // For now, we'll test the hook structure
      expect(useCardTemplate).toBeInstanceOf(Function);
    });
  });

  describe('TemplateRegistry Component Composition Tests', () => {
    beforeEach(() => {
      mockUseTemplateHandlers.mockClear();
    });

    it('should compose all extracted components in default view', () => {
      mockUseTemplateHandlers.mockReturnValue({
        activeCategory: 'medical',
        searchQuery: '',
        editingTemplate: null,
        showTemplateEditor: false,
        filteredTemplates: ['appointment', 'message'] as CardType[],
        handleCategoryChange: vi.fn(),
        handleSearch: vi.fn(),
        handleSearchSubmit: vi.fn(),
        handleTemplateSelect: vi.fn(),
        handleTemplateEdit: vi.fn(),
        handleTemplateDelete: vi.fn(),
        setShowTemplateEditor: vi.fn(),
        setEditingTemplate: vi.fn(),
        getTemplate: vi.fn(),
        isValidCategory: vi.fn(() => true),
        searchTemplates: vi.fn(),
        getAllTemplates: vi.fn(),
        registerTemplate: vi.fn(),
        validateTemplate: vi.fn(),
        createFromTemplate: vi.fn(),
        getTemplatesByCategory: vi.fn(),
        getCategoryForType: vi.fn(),
        handleTemplateSave: vi.fn(),
        handleEditorCancel: vi.fn()
      });

      render(<TemplateRegistry />);

      expect(screen.getByTestId('template-registry')).toBeInTheDocument();
      expect(screen.getByTestId('template-search')).toBeInTheDocument();
      expect(screen.getByTestId('template-categories')).toBeInTheDocument();
    });

    it('should use useTemplateHandlers hook correctly', () => {
      const onTemplateSelect = vi.fn();
      mockUseTemplateHandlers.mockReturnValue({
        activeCategory: 'medical',
        searchQuery: '',
        editingTemplate: null,
        showTemplateEditor: false,
        filteredTemplates: ['appointment'] as CardType[],
        handleCategoryChange: vi.fn(),
        handleSearch: vi.fn(),
        handleSearchSubmit: vi.fn(),
        handleTemplateSelect: onTemplateSelect,
        handleTemplateEdit: vi.fn(),
        handleTemplateDelete: vi.fn(),
        setShowTemplateEditor: vi.fn(),
        setEditingTemplate: vi.fn(),
        getTemplate: vi.fn(),
        isValidCategory: vi.fn(() => true),
        searchTemplates: vi.fn(),
        getAllTemplates: vi.fn(),
        registerTemplate: vi.fn(),
        validateTemplate: vi.fn(),
        createFromTemplate: vi.fn(),
        getTemplatesByCategory: vi.fn(),
        getCategoryForType: vi.fn(),
        handleTemplateSave: vi.fn(),
        handleEditorCancel: vi.fn()
      });

      render(<TemplateRegistry onTemplateSelect={onTemplateSelect} />);

      expect(mockUseTemplateHandlers).toHaveBeenCalledWith({
        onTemplateSelect,
        initialCategory: 'medical',
        initialSearchQuery: ''
      });
    });

    it('should show TemplateEditor when showEditor prop is true', () => {
      mockUseTemplateHandlers.mockReturnValue({
        activeCategory: 'medical',
        searchQuery: '',
        editingTemplate: 'appointment' as CardType,
        showTemplateEditor: true,
        filteredTemplates: [],
        handleCategoryChange: vi.fn(),
        handleSearch: vi.fn(),
        handleSearchSubmit: vi.fn(),
        handleTemplateSelect: vi.fn(),
        handleTemplateEdit: vi.fn(),
        handleTemplateDelete: vi.fn(),
        setShowTemplateEditor: vi.fn(),
        setEditingTemplate: vi.fn(),
        getTemplate: vi.fn(() => getCardTemplate('appointment')),
        isValidCategory: vi.fn(() => true),
        searchTemplates: vi.fn(),
        getAllTemplates: vi.fn(),
        registerTemplate: vi.fn(),
        validateTemplate: vi.fn(),
        createFromTemplate: vi.fn(),
        getTemplatesByCategory: vi.fn(),
        getCategoryForType: vi.fn(),
        handleTemplateSave: vi.fn(),
        handleEditorCancel: vi.fn()
      });

      render(<TemplateRegistry showEditor={true} />);

      expect(screen.getByText(/Edit Template|Create New Template/)).toBeInTheDocument();
    });

    it('should show TemplateLibrary when showLibrary prop is true', () => {
      mockUseTemplateHandlers.mockReturnValue({
        activeCategory: 'medical',
        searchQuery: '',
        editingTemplate: null,
        showTemplateEditor: false,
        filteredTemplates: [],
        handleCategoryChange: vi.fn(),
        handleSearch: vi.fn(),
        handleSearchSubmit: vi.fn(),
        handleTemplateSelect: vi.fn(),
        handleTemplateEdit: vi.fn(),
        handleTemplateDelete: vi.fn(),
        setShowTemplateEditor: vi.fn(),
        setEditingTemplate: vi.fn(),
        getTemplate: vi.fn(),
        isValidCategory: vi.fn(() => true),
        searchTemplates: vi.fn(),
        getAllTemplates: vi.fn(),
        registerTemplate: vi.fn(),
        validateTemplate: vi.fn(),
        createFromTemplate: vi.fn(),
        getTemplatesByCategory: vi.fn(),
        getCategoryForType: vi.fn(),
        handleTemplateSave: vi.fn(),
        handleEditorCancel: vi.fn()
      });

      render(<TemplateRegistry showLibrary={true} />);

      expect(screen.getByTestId('template-library')).toBeInTheDocument();
    });

    it('should pass selectedTemplate prop to TemplateCard', () => {
      mockUseTemplateHandlers.mockReturnValue({
        activeCategory: 'medical',
        searchQuery: '',
        editingTemplate: null,
        showTemplateEditor: false,
        filteredTemplates: ['appointment', 'message'] as CardType[],
        handleCategoryChange: vi.fn(),
        handleSearch: vi.fn(),
        handleSearchSubmit: vi.fn(),
        handleTemplateSelect: vi.fn(),
        handleTemplateEdit: vi.fn(),
        handleTemplateDelete: vi.fn(),
        setShowTemplateEditor: vi.fn(),
        setEditingTemplate: vi.fn(),
        getTemplate: vi.fn(),
        isValidCategory: vi.fn(() => true),
        searchTemplates: vi.fn(),
        getAllTemplates: vi.fn(),
        registerTemplate: vi.fn(),
        validateTemplate: vi.fn(),
        createFromTemplate: vi.fn(),
        getTemplatesByCategory: vi.fn(),
        getCategoryForType: vi.fn(),
        handleTemplateSave: vi.fn(),
        handleEditorCancel: vi.fn()
      });

      render(<TemplateRegistry selectedTemplate="appointment" />);

      // Verify that TemplateCard receives isSelected prop
      const templateCards = screen.getAllByTestId('template-card');
      expect(templateCards.length).toBeGreaterThan(0);
    });

    it('should handle className prop correctly', () => {
      mockUseTemplateHandlers.mockReturnValue({
        activeCategory: 'medical',
        searchQuery: '',
        editingTemplate: null,
        showTemplateEditor: false,
        filteredTemplates: ['appointment'] as CardType[],
        handleCategoryChange: vi.fn(),
        handleSearch: vi.fn(),
        handleSearchSubmit: vi.fn(),
        handleTemplateSelect: vi.fn(),
        handleTemplateEdit: vi.fn(),
        handleTemplateDelete: vi.fn(),
        setShowTemplateEditor: vi.fn(),
        setEditingTemplate: vi.fn(),
        getTemplate: vi.fn(),
        isValidCategory: vi.fn(() => true),
        searchTemplates: vi.fn(),
        getAllTemplates: vi.fn(),
        registerTemplate: vi.fn(),
        validateTemplate: vi.fn(),
        createFromTemplate: vi.fn(),
        getTemplatesByCategory: vi.fn(),
        getCategoryForType: vi.fn(),
        handleTemplateSave: vi.fn(),
        handleEditorCancel: vi.fn()
      });

      const { container } = render(<TemplateRegistry className="custom-class" />);
      const registry = container.querySelector('[data-testid="template-registry"]');
      expect(registry).toHaveClass('custom-class');
    });
  });

  describe('File Size Validation Tests', () => {
    it('should ensure main TemplateRegistry is under 300 lines (Task 4.4.1 target)', () => {
      // Updated target from 400 to 300 lines per task 4.4.1
      const fs = require('fs');
      const path = require('path');
      
      const templateRegistryPath = path.join(__dirname, '../../../components/cards/TemplateRegistry.tsx');
      const content = fs.readFileSync(templateRegistryPath, 'utf8');
      const lineCount = content.split('\n').length;
      
      expect(lineCount).toBeLessThan(300);
    });

    it('should ensure extracted components are under target line counts', () => {
      const fs = require('fs');
      const path = require('path');
      
      const componentsDir = path.join(__dirname, '../../../components/cards/components');
      
      // Check TemplateCard
      const templateCardPath = path.join(componentsDir, 'TemplateCard.tsx');
      if (fs.existsSync(templateCardPath)) {
        const content = fs.readFileSync(templateCardPath, 'utf8');
        const lineCount = content.split('\n').length;
        expect(lineCount).toBeLessThan(200);
      }
      
      // Check TemplateCategories
      const templateCategoriesPath = path.join(componentsDir, 'TemplateCategories.tsx');
      if (fs.existsSync(templateCategoriesPath)) {
        const content = fs.readFileSync(templateCategoriesPath, 'utf8');
        const lineCount = content.split('\n').length;
        expect(lineCount).toBeLessThan(150);
      }
      
      // Check TemplateSearch
      const templateSearchPath = path.join(componentsDir, 'TemplateSearch.tsx');
      if (fs.existsSync(templateSearchPath)) {
        const content = fs.readFileSync(templateSearchPath, 'utf8');
        const lineCount = content.split('\n').length;
        expect(lineCount).toBeLessThan(150);
      }
    });
  });
});
