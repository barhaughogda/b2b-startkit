import { CardType } from '../types';

/**
 * Template Category Types
 */
export type TemplateCategory = 'medical' | 'communication' | 'diagnostic' | 'administrative';

/**
 * Template Metadata Schema
 */
export interface TemplateMetadata {
  name: string;
  description: string;
  category: TemplateCategory;
  icon?: string;
  preview?: string;
}

/**
 * Template Metadata Mapping
 * Maps each card type to its metadata including name, description, and category
 */
export const TEMPLATE_METADATA: Record<CardType, TemplateMetadata> = {
  appointment: {
    name: 'Appointment',
    description: 'Schedule and manage patient appointments',
    category: 'medical',
    preview: '📅 Appointment scheduled for...'
  },
  message: {
    name: 'Message',
    description: 'Patient Communication',
    category: 'communication',
    preview: '💬 Patient message thread...'
  },
  labResult: {
    name: 'Lab Result',
    description: 'Laboratory test results and analysis',
    category: 'diagnostic',
    preview: '🧪 Lab results and analysis...'
  },
  vitalSigns: {
    name: 'Vital Signs',
    description: 'Patient vital signs monitoring',
    category: 'medical',
    preview: '📊 Vital signs monitoring...'
  },
  soapNote: {
    name: 'SOAP Note',
    description: 'Clinical documentation and notes',
    category: 'medical',
    preview: '📝 Clinical documentation...'
  },
  prescription: {
    name: 'Prescription',
    description: 'Medication prescriptions and management',
    category: 'medical',
    preview: '💊 Medication prescription...'
  },
  procedure: {
    name: 'Procedure',
    description: 'Medical procedures and treatments',
    category: 'medical',
    preview: '🏥 Medical procedure...'
  },
  diagnosis: {
    name: 'Diagnosis',
    description: 'Patient diagnosis and conditions',
    category: 'medical',
    preview: '🔍 Patient diagnosis...'
  }
};

/**
 * Template Category to CardType Mapping
 * Maps each category to the card types that belong to it
 */
export const CATEGORY_TO_TYPES: Record<TemplateCategory, CardType[]> = {
  medical: ['appointment', 'vitalSigns', 'soapNote', 'prescription', 'procedure', 'diagnosis'],
  communication: ['message'],
  diagnostic: ['labResult'],
  administrative: []
};

/**
 * CardType to Category Mapping
 * Maps each card type to its category
 */
export const TYPE_TO_CATEGORY: Record<CardType, TemplateCategory> = {
  appointment: 'medical',
  message: 'communication',
  labResult: 'diagnostic',
  vitalSigns: 'medical',
  soapNote: 'medical',
  prescription: 'medical',
  procedure: 'medical',
  diagnosis: 'medical'
};

/**
 * All Available Categories
 */
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'medical',
  'communication',
  'diagnostic',
  'administrative'
];

/**
 * Category Labels
 * Human-readable labels for each category
 */
export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  medical: 'Medical',
  communication: 'Communication',
  diagnostic: 'Diagnostic',
  administrative: 'Administrative'
};

/**
 * Category Descriptions
 * Detailed descriptions for each category
 */
export const CATEGORY_DESCRIPTIONS: Record<TemplateCategory, string> = {
  medical: 'Medical templates for patient care and treatment',
  communication: 'Communication templates for patient interaction',
  diagnostic: 'Diagnostic templates for test results and analysis',
  administrative: 'Administrative templates for practice management'
};

/**
 * Category Color Classes
 * Tailwind CSS classes for category styling
 */
export const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  medical: 'text-blue-600 border-blue-200 bg-blue-50',
  communication: 'text-green-600 border-green-200 bg-green-50',
  diagnostic: 'text-purple-600 border-purple-200 bg-purple-50',
  administrative: 'text-gray-600 border-gray-200 bg-gray-50'
};

/**
 * Category Badge Colors
 * Colors for category badges in template cards
 */
export const CATEGORY_BADGE_COLORS: Record<TemplateCategory, string> = {
  medical: 'bg-blue-100 text-blue-800',
  communication: 'bg-green-100 text-green-800',
  diagnostic: 'bg-purple-100 text-purple-800',
  administrative: 'bg-gray-100 text-gray-800'
};

/**
 * Get Category for Card Type
 * Returns the category that a specific card type belongs to
 */
export function getCategoryForType(type: CardType): TemplateCategory {
  return TYPE_TO_CATEGORY[type] || 'administrative';
}

/**
 * Get Template Metadata
 * Returns the metadata for a specific card type
 */
export function getTemplateMetadata(type: CardType): TemplateMetadata {
  return TEMPLATE_METADATA[type];
}

/**
 * Get Templates by Category
 * Returns all card types that belong to a specific category
 */
export function getTemplatesByCategory(category: TemplateCategory): CardType[] {
  return CATEGORY_TO_TYPES[category] || [];
}

/**
 * Validate Category
 * Checks if a category string is a valid template category
 */
export function isValidCategory(category: string): category is TemplateCategory {
  return TEMPLATE_CATEGORIES.includes(category as TemplateCategory);
}

/**
 * Get Category Label
 * Returns the human-readable label for a category
 */
export function getCategoryLabel(category: TemplateCategory): string {
  return CATEGORY_LABELS[category];
}

/**
 * Get Category Description
 * Returns the description for a category
 */
export function getCategoryDescription(category: TemplateCategory): string {
  return CATEGORY_DESCRIPTIONS[category];
}

/**
 * Get Category Colors
 * Returns the color classes for a category
 */
export function getCategoryColors(category: TemplateCategory): string {
  return CATEGORY_COLORS[category];
}

/**
 * Get Category Badge Colors
 * Returns the badge color classes for a category
 */
export function getCategoryBadgeColors(category: TemplateCategory): string {
  return CATEGORY_BADGE_COLORS[category];
}

