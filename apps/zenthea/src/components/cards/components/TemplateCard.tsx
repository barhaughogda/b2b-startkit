import React from 'react';
import { CardType } from '../types';
import {
  getTemplateMetadata,
  getCategoryBadgeColors,
  getCategoryLabel
} from '../utils/TemplateConstants';

export interface TemplateCardProps {
  templateType: CardType;
  isSelected: boolean;
  onSelect: (templateType: CardType) => void;
  onEdit: (templateType: CardType) => void;
  onDelete: (templateType: CardType) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  templateType,
  isSelected,
  onSelect,
  onEdit,
  onDelete
}) => {
  const metadata = getTemplateMetadata(templateType);
  const category = metadata.category;

  const handleCardClick = () => {
    onSelect(templateType);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(templateType);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(templateType);
  };

  return (
    <div
      data-testid="template-card"
      className={`
        relative p-4 border rounded-lg cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
      `}
      onClick={handleCardClick}
    >
      {/* Template Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900">
          {metadata.name}
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={handleEditClick}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            aria-label={`Edit ${metadata.name} template`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            aria-label={`Delete ${metadata.name} template`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Template Description */}
      <p className="text-sm text-gray-600 mb-3">
        {metadata.description}
      </p>

      {/* Template Category Badge */}
      <div className="flex items-center justify-between">
        <span className={`
          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
          ${getCategoryBadgeColors(category)}
        `}>
          {getCategoryLabel(category)}
        </span>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="flex items-center text-blue-600">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Selected</span>
          </div>
        )}
      </div>

      {/* Template Preview */}
      <div className="mt-3 p-2 bg-gray-50 rounded border">
        <div className="text-xs text-gray-500 mb-1">Preview:</div>
        <div className="text-sm text-gray-700">
          {metadata.preview || `${metadata.name} template...`}
        </div>
      </div>
    </div>
  );
};

export default TemplateCard;
