'use client';

import React, { useEffect } from 'react';
import { CardType, CardTemplate, BaseCardProps, CardEventHandlers } from './types';
import { TemplateCard } from './components/TemplateCard';
import { TemplateCategories } from './components/TemplateCategories';
import { TemplateSearch } from './components/TemplateSearch';
import { TemplateEditor } from './components/TemplateEditor';
import { TemplateLibrary } from './components/TemplateLibrary';
import { MessageData } from './MessageCard';
import { createMessageCard, createSampleMessageCard } from './utils/MessageSampleData';
import { useTemplateHandlers } from './hooks/useTemplateHandlers';
import { TEMPLATE_CATEGORIES } from './utils/TemplateConstants';

// Import template registry API functions
import {
  getCardTemplate,
  getAllCardTemplates,
  registerCardTemplate,
  validateCardProps,
  createCardFromTemplate
} from './utils/templateRegistryApi';

// Re-export template registry functions for backward compatibility
export {
  getCardTemplate,
  getAllCardTemplates,
  registerCardTemplate,
  validateCardProps,
  createCardFromTemplate
};

// Template registry functions are now in utils/templateRegistryApi.ts
// to avoid circular dependencies with useTemplateHandlers hook

// Template registry hook for React components
export function useCardTemplate(type: CardType) {
  const template = getCardTemplate(type);
  
  return {
    template,
    config: template.config,
    render: (props: BaseCardProps) => template.render(props),
    validate: (props: BaseCardProps) => template.validate(props)
  };
}

// Factory functions for creating cards with default data
export function createMessageCardFromTemplate(
  baseProps: BaseCardProps,
  messageData: MessageData,
  handlers: CardEventHandlers
) {
  return createMessageCard(messageData, handlers, baseProps);
}

export function createSampleMessageCardFromTemplate(
  baseProps: BaseCardProps,
  handlers: CardEventHandlers
) {
  return createSampleMessageCard(baseProps.id, baseProps, handlers);
}

// Main TemplateRegistry component
interface TemplateRegistryProps {
  onTemplateSelect?: (type: CardType) => void;
  selectedTemplate?: CardType;
  className?: string;
  showEditor?: boolean;
  showLibrary?: boolean;
}

export const TemplateRegistry: React.FC<TemplateRegistryProps> = ({
  onTemplateSelect,
  selectedTemplate,
  className = '',
  showEditor = false,
  showLibrary = false
}) => {
  // Use the template handlers hook
  const handlers = useTemplateHandlers({
    onTemplateSelect,
    initialCategory: 'medical',
    initialSearchQuery: ''
  });

  // Sync showTemplateEditor state with showEditor prop
  // setShowTemplateEditor is stable via useCallback in the hook
  useEffect(() => {
    handlers.setShowTemplateEditor(showEditor);
  }, [showEditor, handlers.setShowTemplateEditor]);

  // Show Template Editor if requested
  // Allow rendering when showEditor is true even without editingTemplate (create mode)
  if (handlers.showTemplateEditor) {
    // If we have an editingTemplate, get the template for editing
    // Otherwise, render in create mode (template will be undefined)
    const template = handlers.editingTemplate ? handlers.getTemplate(handlers.editingTemplate) : undefined;
    return (
      <div data-testid="template-registry" className={className}>
        <TemplateEditor
          templateType={handlers.editingTemplate || undefined}
          template={template}
          onSave={handlers.handleTemplateSave}
          onCancel={handlers.handleEditorCancel}
        />
      </div>
    );
  }

  // Show Template Library if requested
  if (showLibrary) {
    return (
      <div data-testid="template-registry" className={className}>
        <TemplateLibrary
          onTemplateSelect={handlers.handleTemplateSelect}
          onTemplateEdit={handlers.handleTemplateEdit}
          onTemplateDelete={handlers.handleTemplateDelete}
        />
      </div>
    );
  }

  // Default view: Simple template registry
  return (
    <div data-testid="template-registry" className={`space-y-6 ${className}`}>
      {/* Search Component */}
      <TemplateSearch 
        searchQuery={handlers.searchQuery}
        onSearchChange={handlers.handleSearch}
        onSearchSubmit={handlers.handleSearchSubmit}
      />
      
      {/* Categories Component */}
      <TemplateCategories
        categories={TEMPLATE_CATEGORIES}
        activeCategory={handlers.activeCategory}
        onCategoryChange={handlers.handleCategoryChange}
      />
      
      {/* Template Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {handlers.filteredTemplates.map((templateType) => (
          <TemplateCard
            key={templateType}
            templateType={templateType}
            isSelected={selectedTemplate === templateType}
            onSelect={handlers.handleTemplateSelect}
            onEdit={handlers.handleTemplateEdit}
            onDelete={handlers.handleTemplateDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default TemplateRegistry;