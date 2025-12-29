import React, { useState, useCallback, useMemo } from 'react';
import { CardType, CardTemplate, BaseCardProps } from '../types';
import {
  getCardTemplate,
  getAllCardTemplates,
  registerCardTemplate,
  validateCardProps,
  createCardFromTemplate
} from '../utils/templateRegistryApi';
import {
  getCategoryForType,
  getTemplateMetadata,
  getTemplatesByCategory,
  isValidCategory,
  TEMPLATE_CATEGORIES
} from '../utils/TemplateConstants';

/**
 * Template Handler Configuration
 */
export interface UseTemplateHandlersConfig {
  onTemplateSelect?: (type: CardType) => void;
  onTemplateEdit?: (type: CardType) => void;
  onTemplateDelete?: (type: CardType) => void;
  initialCategory?: string;
  initialSearchQuery?: string;
}

/**
 * Template Handler Return Type
 */
export interface UseTemplateHandlersReturn {
  // State
  activeCategory: string;
  searchQuery: string;
  editingTemplate: CardType | null;
  showTemplateEditor: boolean;
  filteredTemplates: CardType[];
  
  // Category Handlers
  handleCategoryChange: (category: string) => void;
  isValidCategory: (category: string) => boolean;
  
  // Search Handlers
  handleSearch: (query: string) => void;
  handleSearchSubmit: (query: string) => void;
  searchTemplates: (query: string) => CardType[];
  
  // Template Selection Handlers
  handleTemplateSelect: (type: CardType) => void;
  
  // Template CRUD Handlers
  handleTemplateEdit: (type: CardType) => void;
  handleTemplateDelete: (type: CardType) => void;
  handleTemplateSave: (template: CardTemplate) => void;
  handleEditorCancel: () => void;
  
  // Template CRUD Operations
  getTemplate: (type: CardType) => CardTemplate;
  getAllTemplates: () => Record<CardType, CardTemplate>;
  registerTemplate: (type: CardType, template: CardTemplate) => void;
  validateTemplate: (props: BaseCardProps) => boolean;
  createFromTemplate: (type: CardType, props: BaseCardProps) => React.ReactNode;
  
  // Category Operations
  getTemplatesByCategory: (category: string) => CardType[];
  getCategoryForType: (type: CardType) => string;
  
  // Editor State Management
  setShowTemplateEditor: (show: boolean) => void;
  setEditingTemplate: (type: CardType | null) => void;
}

/**
 * Template Handlers Hook
 * Provides comprehensive template management functionality including:
 * - Template selection, editing, deletion
 * - Search and filtering
 * - Category management
 * - Template CRUD operations
 * - Editor state management
 */
export function useTemplateHandlers(
  config: UseTemplateHandlersConfig = {}
): UseTemplateHandlersReturn {
  const {
    onTemplateSelect,
    onTemplateEdit,
    onTemplateDelete,
    initialCategory = 'medical',
    initialSearchQuery = ''
  } = config;

  // State Management
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [editingTemplate, setEditingTemplate] = useState<CardType | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState<boolean>(false);

  // Category Handlers
  const handleCategoryChange = useCallback((category: string) => {
    if (isValidCategory(category)) {
      setActiveCategory(category);
      // Clear search when changing category
      setSearchQuery('');
    }
  }, []);

  const isValidCategoryCheck = useCallback((category: string): boolean => {
    return isValidCategory(category);
  }, []);

  // Search Handlers
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSearchSubmit = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const searchTemplates = useCallback((query: string): CardType[] => {
    const allTemplates = getAllCardTemplates();
    const lowerQuery = query.toLowerCase();
    
    return (Object.keys(allTemplates) as CardType[]).filter(type => {
      const metadata = getTemplateMetadata(type);
      const typeName = type.toLowerCase();
      const category = getCategoryForType(type);
      
      return (
        typeName.includes(lowerQuery) ||
        metadata.name.toLowerCase().includes(lowerQuery) ||
        metadata.description.toLowerCase().includes(lowerQuery) ||
        category.toLowerCase().includes(lowerQuery)
      );
    });
  }, []);

  // Template Selection Handlers
  const handleTemplateSelect = useCallback((type: CardType) => {
    onTemplateSelect?.(type);
  }, [onTemplateSelect]);

  // Template CRUD Handlers
  const handleTemplateEdit = useCallback((type: CardType) => {
    setEditingTemplate(type);
    setShowTemplateEditor(true);
    onTemplateEdit?.(type);
  }, [onTemplateEdit]);

  const handleTemplateDelete = useCallback((type: CardType) => {
    // In a real implementation, this would delete the template from storage
    // For now, we just call the callback
    onTemplateDelete?.(type);
  }, [onTemplateDelete]);

  const handleTemplateSave = useCallback((template: CardTemplate) => {
    registerCardTemplate(template.type, template);
    setShowTemplateEditor(false);
    setEditingTemplate(null);
  }, []);

  const handleEditorCancel = useCallback(() => {
    setShowTemplateEditor(false);
    setEditingTemplate(null);
  }, []);

  // Template CRUD Operations
  const getTemplate = useCallback((type: CardType): CardTemplate => {
    try {
      return getCardTemplate(type);
    } catch (error) {
      throw new Error(`Template '${type}' not found`);
    }
  }, []);

  const getAllTemplates = useCallback((): Record<CardType, CardTemplate> => {
    return getAllCardTemplates();
  }, []);

  const registerTemplate = useCallback((type: CardType, template: CardTemplate): void => {
    registerCardTemplate(type, template);
  }, []);

  const validateTemplate = useCallback((props: BaseCardProps): boolean => {
    return validateCardProps(props);
  }, []);

  const createFromTemplate = useCallback((type: CardType, props: BaseCardProps): React.ReactNode => {
    return createCardFromTemplate(type, props);
  }, []);

  // Category Operations
  const getTemplatesByCategoryHandler = useCallback((category: string): CardType[] => {
    if (!isValidCategory(category)) {
      return [];
    }
    return getTemplatesByCategory(category);
  }, []);

  const getCategoryForTypeHandler = useCallback((type: CardType): string => {
    return getCategoryForType(type);
  }, []);

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    const availableTemplates = Object.keys(getAllCardTemplates()) as CardType[];
    const lowerQuery = searchQuery.toLowerCase();
    
    return availableTemplates.filter(templateType => {
      // Category filter
      const categoryMatch = activeCategory === 'all' || 
                           getCategoryForType(templateType) === activeCategory;
      
      // Search filter - search in template name, description, type, and category
      const searchMatch = searchQuery === '' || (() => {
        const metadata = getTemplateMetadata(templateType);
        const category = getCategoryForType(templateType);
        
        return (
          templateType.toLowerCase().includes(lowerQuery) ||
          metadata.name.toLowerCase().includes(lowerQuery) ||
          metadata.description.toLowerCase().includes(lowerQuery) ||
          category.toLowerCase().includes(lowerQuery)
        );
      })();
      
      return categoryMatch && searchMatch;
    });
  }, [activeCategory, searchQuery]);

  return {
    // State
    activeCategory,
    searchQuery,
    editingTemplate,
    showTemplateEditor,
    filteredTemplates,
    
    // Category Handlers
    handleCategoryChange,
    isValidCategory: isValidCategoryCheck,
    
    // Search Handlers
    handleSearch,
    handleSearchSubmit,
    searchTemplates,
    
    // Template Selection Handlers
    handleTemplateSelect,
    
    // Template CRUD Handlers
    handleTemplateEdit,
    handleTemplateDelete,
    handleTemplateSave,
    handleEditorCancel,
    
    // Template CRUD Operations
    getTemplate,
    getAllTemplates,
    registerTemplate,
    validateTemplate,
    createFromTemplate,
    
    // Category Operations
    getTemplatesByCategory: getTemplatesByCategoryHandler,
    getCategoryForType: getCategoryForTypeHandler,
    
    // Editor State Management
    setShowTemplateEditor,
    setEditingTemplate
  };
}

