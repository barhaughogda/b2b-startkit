import React from 'react';
import {
  getCategoryLabel,
  getCategoryColors,
  getCategoryDescription,
  TemplateCategory
} from '../utils/TemplateConstants';

export interface TemplateCategoriesProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export const TemplateCategories: React.FC<TemplateCategoriesProps> = ({
  categories,
  activeCategory,
  onCategoryChange
}) => {

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medical':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case 'communication':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'diagnostic':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'administrative':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        );
    }
  };

  const getCategoryColor = (category: string) => {
    if (category === 'medical' || category === 'communication' || 
        category === 'diagnostic' || category === 'administrative') {
      return getCategoryColors(category as TemplateCategory);
    }
    return 'text-gray-600 border-gray-200 bg-gray-50';
  };

  return (
    <div data-testid="template-categories" className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const isActive = category === activeCategory;
          const label = (category === 'medical' || category === 'communication' || 
                        category === 'diagnostic' || category === 'administrative')
            ? getCategoryLabel(category as TemplateCategory)
            : category.charAt(0).toUpperCase() + category.slice(1);
          const colorClasses = getCategoryColor(category);
          
          return (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`
                inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive 
                  ? `${colorClasses} border-2 shadow-sm` 
                  : `text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300`
                }
              `}
            >
              {getCategoryIcon(category)}
              <span className="ml-2">{label}</span>
              {isActive && (
                <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Category Description */}
      <div className="text-sm text-gray-600 mt-2">
        {(activeCategory === 'medical' || activeCategory === 'communication' || 
          activeCategory === 'diagnostic' || activeCategory === 'administrative')
          ? getCategoryDescription(activeCategory as TemplateCategory)
          : ''}
      </div>

      {/* Category Stats */}
      <div className="flex items-center space-x-4 text-xs text-gray-500">
        <span>Active: {activeCategory}</span>
        <span>Total: {categories.length} categories</span>
      </div>
    </div>
  );
};

export default TemplateCategories;
