'use client';

import React, { useState, useCallback } from 'react';
import { CardType, CardTemplate, BaseCardProps } from '../types';
import { getCardTemplate, getAllCardTemplates, registerCardTemplate, validateCardProps, createCardFromTemplate } from '../utils/templateRegistryApi';
import { getCategoryForType } from '../utils/TemplateConstants';

export interface TemplateLibraryProps {
  onTemplateSelect?: (type: CardType) => void;
  onTemplateEdit?: (type: CardType) => void;
  onTemplateDelete?: (type: CardType) => void;
  className?: string;
}

export interface TemplateLibraryStats {
  totalTemplates: number;
  templatesByCategory: Record<string, number>;
  recentlyUsed: CardType[];
  mostPopular: CardType[];
}

// Template Library Management Hook
export function useTemplateLibrary() {
  const [templates, setTemplates] = useState<Record<CardType, CardTemplate>>(() => getAllCardTemplates());
  const [stats, setStats] = useState<TemplateLibraryStats>(() => {
    const allTemplates = getAllCardTemplates();
    const categories: Record<string, number> = {};
    const templateTypes = Object.keys(allTemplates) as CardType[];
    
    templateTypes.forEach(type => {
      const category = getCategoryForType(type);
      categories[category] = (categories[category] || 0) + 1;
    });

    return {
      totalTemplates: templateTypes.length,
      templatesByCategory: categories,
      recentlyUsed: [],
      mostPopular: []
    };
  });


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
    // Check if this is a new template type before registration
    const wasTemplateNew = !templates[type];
    
    registerCardTemplate(type, template);
    setTemplates(prev => ({ ...prev, [type]: template }));
    setStats(prev => {
      // Recalculate totalTemplates from the global registry after registration
      const allTemplates = getAllCardTemplates();
      const category = getCategoryForType(type);
      
      return {
        ...prev,
        totalTemplates: Object.keys(allTemplates).length,
        templatesByCategory: {
          ...prev.templatesByCategory,
          [category]: wasTemplateNew
            ? (prev.templatesByCategory[category] || 0) + 1
            : prev.templatesByCategory[category] || 0
        }
      };
    });
  }, [templates]);

  const validateTemplate = useCallback((props: BaseCardProps): boolean => {
    return validateCardProps(props);
  }, []);

  const createFromTemplate = useCallback((type: CardType, props: BaseCardProps): React.ReactNode => {
    return createCardFromTemplate(type, props);
  }, []);

  const getTemplatesByCategory = useCallback((category: string): CardType[] => {
    const allTemplates = getAllCardTemplates();
    return (Object.keys(allTemplates) as CardType[]).filter(type => 
      getCategoryForType(type) === category
    );
  }, []);

  const searchTemplates = useCallback((query: string): CardType[] => {
    const allTemplates = getAllCardTemplates();
    const lowerQuery = query.toLowerCase();
    
    return (Object.keys(allTemplates) as CardType[]).filter(type => 
      type.toLowerCase().includes(lowerQuery) ||
      type.replace(/([A-Z])/g, ' $1').toLowerCase().includes(lowerQuery)
    );
  }, []);

  const getTemplateStats = useCallback((): TemplateLibraryStats => {
    return stats;
  }, [stats]);

  return {
    getTemplate,
    getAllTemplates,
    registerTemplate,
    validateTemplate,
    createFromTemplate,
    getTemplatesByCategory,
    searchTemplates,
    getTemplateStats,
    templates
  };
}

// Template Library Component
export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  onTemplateSelect,
  onTemplateEdit,
  onTemplateDelete,
  className = ''
}) => {
  const library = useTemplateLibrary();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['all', 'medical', 'communication', 'diagnostic', 'administrative'];

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery(''); // Clear search when changing category
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const getFilteredTemplates = (): CardType[] => {
    let filtered: CardType[];

    if (searchQuery) {
      filtered = library.searchTemplates(searchQuery);
    } else if (selectedCategory === 'all') {
      filtered = Object.keys(library.getAllTemplates()) as CardType[];
    } else {
      filtered = library.getTemplatesByCategory(selectedCategory);
    }

    return filtered;
  };

  const handleTemplateAction = (type: CardType, action: 'select' | 'edit' | 'delete') => {
    switch (action) {
      case 'select':
        onTemplateSelect?.(type);
        break;
      case 'edit':
        onTemplateEdit?.(type);
        break;
      case 'delete':
        if (window.confirm(`Are you sure you want to delete the ${type} template?`)) {
          onTemplateDelete?.(type);
        }
        break;
    }
  };

  const stats = library.getTemplateStats();
  const filteredTemplates = getFilteredTemplates();

  return (
    <div className={`template-library ${className}`} data-testid="template-library">
      {/* Library Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">Template Library</h2>
            <p className="text-sm text-text-secondary mt-1">
              {stats.totalTemplates} templates available
            </p>
          </div>
          <div className="text-sm text-text-secondary">
            {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'} shown
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 border-b border-border-primary">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`
                px-4 py-2 text-sm font-medium transition-colors
                ${selectedCategory === category
                  ? 'border-b-2 border-focus text-link'
                  : 'text-text-secondary hover:text-text-primary'
                }
              `}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
              {category !== 'all' && (
                <span className="ml-2 text-xs text-text-tertiary">
                  ({stats.templatesByCategory[category] || 0})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-4 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent"
        />
      </div>

      {/* Template List */}
      <div className="space-y-2">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-text-tertiary">
            <p>No templates found</p>
            {searchQuery && (
              <p className="text-sm mt-2">Try a different search term</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((templateType) => {
              const template = library.getTemplate(templateType);
              return (
                <div
                  key={templateType}
                  className="p-4 border border-border-primary rounded-lg hover:border-focus hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleTemplateAction(templateType, 'select')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-text-primary capitalize">
                      {templateType}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateAction(templateType, 'edit');
                        }}
                        className="text-text-tertiary hover:text-link transition-colors"
                        aria-label={`Edit ${templateType} template`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateAction(templateType, 'delete');
                        }}
                        className="text-text-tertiary hover:text-status-error transition-colors"
                        aria-label={`Delete ${templateType} template`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-text-secondary">
                    Layout: {template.config.layout}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">
                    Size: {template.config.size.min}-{template.config.size.max}px
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Library Stats Footer */}
      <div className="mt-6 pt-6 border-t border-border-primary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-text-secondary">Total Templates</div>
            <div className="text-lg font-semibold text-text-primary">{stats.totalTemplates}</div>
          </div>
          {Object.entries(stats.templatesByCategory).map(([category, count]) => (
            <div key={category}>
              <div className="text-text-secondary capitalize">{category}</div>
              <div className="text-lg font-semibold text-text-primary">{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TemplateLibrary;
