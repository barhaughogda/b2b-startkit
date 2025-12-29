'use client';

import React, { useState, useEffect } from 'react';
import { CardType, CardTemplate, CardConfig, CardInteractions, CardSize, PriorityConfig } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// Switch component not available, using checkbox instead
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Save, AlertCircle } from 'lucide-react';

export interface TemplateEditorProps {
  templateType?: CardType;
  template?: CardTemplate;
  onSave: (template: CardTemplate) => void;
  onCancel: () => void;
  className?: string;
}

const cardTypes: CardType[] = [
  'appointment',
  'message',
  'labResult',
  'vitalSigns',
  'soapNote',
  'prescription',
  'procedure',
  'diagnosis'
];

const layoutOptions = ['horizontal', 'vertical', 'compact', 'detailed'] as const;
// Use card type colors from centralized color system
const colorOptions = [
  { value: 'card-appointment-bg card-appointment-border', label: 'Appointment (Teal)' },
  { value: 'card-message-bg card-message-border', label: 'Message (Green)' },
  { value: 'card-lab-result-bg card-lab-result-border', label: 'Lab Result (Purple)' },
  { value: 'card-vital-signs-bg card-vital-signs-border', label: 'Vital Signs (Orange)' },
  { value: 'card-soap-note-bg card-soap-note-border', label: 'SOAP Note (Teal)' },
  { value: 'card-prescription-bg card-prescription-border', label: 'Prescription (Yellow)' },
  { value: 'card-procedure-bg card-procedure-border', label: 'Procedure (Purple)' },
  { value: 'card-diagnosis-bg card-diagnosis-border', label: 'Diagnosis (Red)' }
];

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  templateType,
  template,
  onSave,
  onCancel,
  className = ''
}) => {
  const isEditing = !!template;
  const [formData, setFormData] = useState<Partial<CardConfig>>({
    type: templateType || template?.type || 'appointment',
    color: template?.config.color || 'card-appointment-bg card-appointment-border',
    size: template?.config.size || {
      min: 300,
      max: 500,
      default: 400,
      current: 400
    },
    layout: template?.config.layout || 'vertical',
    interactions: template?.config.interactions || {
      resizable: true,
      draggable: true,
      stackable: true,
      minimizable: true,
      maximizable: true,
      closable: true
    },
    priority: template?.config.priority || {
      color: 'text-link',
      borderColor: 'border-focus',
      icon: null,
      badge: 'Template'
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.type) {
      newErrors.type = 'Card type is required';
    }

    if (formData.size) {
      if (formData.size.min < 100) {
        newErrors.sizeMin = 'Minimum size must be at least 100px';
      }
      if (formData.size.max > 2000) {
        newErrors.sizeMax = 'Maximum size cannot exceed 2000px';
      }
      if (formData.size.min >= formData.size.max) {
        newErrors.sizeRange = 'Minimum size must be less than maximum size';
      }
      if (formData.size.default < formData.size.min || formData.size.default > formData.size.max) {
        newErrors.sizeDefault = 'Default size must be within min/max range';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setIsSaving(true);
    try {
      // Create a new template with the form data
      // Note: In a real implementation, this would include the render and validate functions
      const newTemplate: CardTemplate = {
        type: formData.type as CardType,
        config: formData as CardConfig,
        render: template?.render || (() => <div>Template placeholder</div>),
        validate: template?.validate || ((props) => props.type === formData.type)
      };

      onSave(newTemplate);
    } catch (error) {
      console.error('Error saving template:', error);
      setErrors({ save: 'Failed to save template' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSizeChange = (field: keyof CardSize, value: number) => {
    setFormData(prev => ({
      ...prev,
      size: {
        ...(prev.size || {
          min: 300,
          max: 500,
          default: 400,
          current: 400
        }),
        [field]: value
      }
    }));
  };

  const handleInteractionChange = (field: keyof CardInteractions, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      interactions: {
        ...(prev.interactions || {
          resizable: true,
          draggable: true,
          stackable: true,
          minimizable: true,
          maximizable: true,
          closable: true
        }),
        [field]: value
      }
    }));
  };

  const handlePriorityChange = (field: keyof PriorityConfig, value: string) => {
    setFormData(prev => ({
      ...prev,
        priority: {
          ...(prev.priority || {
            color: 'text-link',
            borderColor: 'border-focus',
            icon: null,
            badge: 'Template'
          }),
          [field]: value
        }
    }));
  };

  return (
    <div className={`bg-background-elevated rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text-primary">
          {isEditing ? 'Edit Template' : 'Create New Template'}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Error Messages */}
      {Object.keys(errors).length > 0 && (
        <div className="mb-4 p-3 bg-status-error/10 border border-error rounded-lg">
          <div className="flex items-center gap-2 text-status-error">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Please fix the following errors:</span>
          </div>
          <ul className="mt-2 list-disc list-inside text-sm text-status-error">
            {Object.values(errors).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Form */}
      <div className="space-y-6">
        {/* Card Type */}
        <div>
          <Label htmlFor="cardType" className="text-sm font-medium text-text-primary">
            Card Type
          </Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as CardType }))}
            disabled={isEditing}
          >
            <SelectTrigger id="cardType" className="mt-1">
              <SelectValue placeholder="Select card type" />
            </SelectTrigger>
            <SelectContent>
              {cardTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="mt-1 text-sm text-status-error">{errors.type}</p>
          )}
        </div>

        {/* Color */}
        <div>
          <Label htmlFor="color" className="text-sm font-medium text-text-primary">
            Color Scheme
          </Label>
          <Select
            value={formData.color}
            onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
          >
            <SelectTrigger id="color" className="mt-1">
              <SelectValue placeholder="Select color" />
            </SelectTrigger>
            <SelectContent>
              {colorOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Layout */}
        <div>
          <Label htmlFor="layout" className="text-sm font-medium text-text-primary">
            Layout
          </Label>
          <Select
            value={formData.layout}
            onValueChange={(value) => setFormData(prev => ({ ...prev, layout: value as typeof layoutOptions[number] }))}
          >
            <SelectTrigger id="layout" className="mt-1">
              <SelectValue placeholder="Select layout" />
            </SelectTrigger>
            <SelectContent>
              {layoutOptions.map((layout) => (
                <SelectItem key={layout} value={layout}>
                  {layout.charAt(0).toUpperCase() + layout.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Size Configuration */}
        <div className="space-y-4 p-4 bg-surface-secondary rounded-lg">
          <Label className="text-sm font-medium text-text-primary">Size Configuration</Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sizeMin" className="text-xs text-text-secondary">Minimum (px)</Label>
              <Input
                id="sizeMin"
                type="number"
                min="100"
                max="2000"
                value={formData.size?.min || 300}
                onChange={(e) => handleSizeChange('min', parseInt(e.target.value) || 300)}
                className="mt-1"
              />
              {errors.sizeMin && (
                <p className="mt-1 text-xs text-status-error">{errors.sizeMin}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="sizeMax" className="text-xs text-text-secondary">Maximum (px)</Label>
              <Input
                id="sizeMax"
                type="number"
                min="100"
                max="2000"
                value={formData.size?.max || 500}
                onChange={(e) => handleSizeChange('max', parseInt(e.target.value) || 500)}
                className="mt-1"
              />
              {errors.sizeMax && (
                <p className="mt-1 text-xs text-status-error">{errors.sizeMax}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="sizeDefault" className="text-xs text-text-secondary">Default (px)</Label>
              <Input
                id="sizeDefault"
                type="number"
                min="100"
                max="2000"
                value={formData.size?.default || 400}
                onChange={(e) => handleSizeChange('default', parseInt(e.target.value) || 400)}
                className="mt-1"
              />
              {errors.sizeDefault && (
                <p className="mt-1 text-xs text-status-error">{errors.sizeDefault}</p>
              )}
            </div>
          </div>
          
          {errors.sizeRange && (
            <p className="text-sm text-status-error">{errors.sizeRange}</p>
          )}
        </div>

        {/* Interactions */}
        <div className="space-y-3 p-4 bg-surface-secondary rounded-lg">
          <Label className="text-sm font-medium text-text-primary">Interactions</Label>
          
          <div className="space-y-2">
            {(['resizable', 'draggable', 'stackable', 'minimizable', 'maximizable', 'closable'] as const).map((interaction) => (
              <div key={interaction} className="flex items-center justify-between">
                <Label htmlFor={interaction} className="text-sm text-text-primary capitalize">
                  {interaction}
                </Label>
                <input
                  id={interaction}
                  type="checkbox"
                  checked={formData.interactions?.[interaction] || false}
                  onChange={(e) => handleInteractionChange(interaction, e.target.checked)}
                  className="h-4 w-4 bg-surface-elevated text-interactive-primary border-border-primary rounded focus:ring-border-focus"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Priority Configuration */}
        <div className="space-y-4 p-4 bg-surface-secondary rounded-lg">
          <Label className="text-sm font-medium text-text-primary">Priority Configuration</Label>
          
          <div>
            <Label htmlFor="priorityColor" className="text-xs text-text-secondary">Priority Color</Label>
            <Input
              id="priorityColor"
              type="text"
              value={formData.priority?.color || ''}
              onChange={(e) => handlePriorityChange('color', e.target.value)}
              placeholder="text-link"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="priorityBorder" className="text-xs text-text-secondary">Border Color</Label>
            <Input
              id="priorityBorder"
              type="text"
              value={formData.priority?.borderColor || ''}
              onChange={(e) => handlePriorityChange('borderColor', e.target.value)}
              placeholder="border-focus"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="priorityBadge" className="text-xs text-text-secondary">Badge Text</Label>
            <Input
              id="priorityBadge"
              type="text"
              value={formData.priority?.badge || ''}
              onChange={(e) => handlePriorityChange('badge', e.target.value)}
              placeholder="Template"
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-border-primary">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-interactive-primary hover:bg-interactive-primary-hover text-text-inverse"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </div>
  );
};

export default TemplateEditor;
