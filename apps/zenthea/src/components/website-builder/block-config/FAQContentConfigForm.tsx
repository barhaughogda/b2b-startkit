'use client';

/**
 * FAQ Content Config Form
 * 
 * Configuration panel for editing FAQ block content in the Website Builder sidebar.
 * Allows adding, editing, and deleting Q&A items.
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQContentConfigFormProps {
  props: Record<string, unknown>;
  onUpdate: (props: Record<string, unknown>) => void;
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function FAQContentConfigForm({
  props,
  onUpdate,
  disabled,
}: FAQContentConfigFormProps) {
  const title = (props.title as string) || 'Frequently Asked Questions';
  const subtitle = (props.subtitle as string) || '';
  const items = (props.items as FAQItem[]) || [];

  // Add a new FAQ item
  const handleAddItem = () => {
    const newItem: FAQItem = {
      id: Date.now().toString(),
      question: 'New Question?',
      answer: 'Answer here...',
    };
    // Validate new item has non-empty question and answer
    if (newItem.question.trim().length > 0 && newItem.answer.trim().length > 0) {
      onUpdate({ ...props, items: [...items, newItem] });
    }
  };

  // Update an existing FAQ item
  const handleUpdateItem = (index: number, updates: Partial<FAQItem>) => {
    const newItems = [...items];
    const existing = newItems[index];
    if (!existing) return;
    
    const updatedItem = { ...existing, ...updates };
    
    // Validate question and answer are not empty (allow whitespace during editing)
    // Only prevent saving completely empty items
    if (updates.question !== undefined && updates.question.trim().length === 0 && updatedItem.answer.trim().length === 0) {
      // Both question and answer are empty - don't update
      return;
    }
    
    newItems[index] = updatedItem as FAQItem;
    onUpdate({ ...props, items: newItems });
  };

  // Remove an FAQ item
  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onUpdate({ ...props, items: newItems });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="faq-title">Section Title</Label>
        <Input
          id="faq-title"
          value={title}
          onChange={(e) => onUpdate({ ...props, title: e.target.value })}
          disabled={disabled}
          placeholder="Frequently Asked Questions"
        />
      </div>

      {/* Subtitle */}
      <div className="space-y-2">
        <Label htmlFor="faq-subtitle">Subtitle</Label>
        <Input
          id="faq-subtitle"
          value={subtitle}
          onChange={(e) => onUpdate({ ...props, subtitle: e.target.value || undefined })}
          disabled={disabled}
          placeholder="Optional subtitle"
        />
      </div>

      {/* FAQ Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>FAQ Items</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddItem}
            disabled={disabled}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {items.length === 0 && (
          <p className="text-sm text-text-tertiary text-center py-4">
            No FAQ items yet. Click &quot;Add&quot; to create your first question.
          </p>
        )}

        {items.map((item, index) => (
          <div
            key={item.id}
            className="p-4 bg-surface-secondary rounded-lg space-y-3 border border-border-primary"
          >
            {/* Item Header */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">
                Q{index + 1}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemoveItem(index)}
                disabled={disabled}
                className="h-8 w-8 text-status-error hover:text-status-error hover:bg-status-error/10"
                aria-label={`Delete question ${index + 1}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Question Input */}
            <div className="space-y-1">
              <Label htmlFor={`faq-question-${index}`} className="text-xs text-text-secondary">
                Question
              </Label>
              <Input
                id={`faq-question-${index}`}
                value={item.question}
                onChange={(e) => handleUpdateItem(index, { question: e.target.value })}
                disabled={disabled}
                placeholder="Enter question"
              />
            </div>

            {/* Answer Input */}
            <div className="space-y-1">
              <Label htmlFor={`faq-answer-${index}`} className="text-xs text-text-secondary">
                Answer
              </Label>
              <Textarea
                id={`faq-answer-${index}`}
                value={item.answer}
                onChange={(e) => handleUpdateItem(index, { answer: e.target.value })}
                disabled={disabled}
                placeholder="Enter answer"
                rows={3}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FAQContentConfigForm;

