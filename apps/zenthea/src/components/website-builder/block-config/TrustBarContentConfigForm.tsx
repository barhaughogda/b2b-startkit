'use client';

/**
 * Trust Bar Content Config Form
 *
 * Configuration panel for editing Trust Bar block content in the Website Builder sidebar.
 * Features quick-add presets for insurance, accreditations, ratings, and more.
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Shield,
  Award,
  ShieldCheck,
  Star,
  Users,
  Trophy,
  ExternalLink,
  ChevronDown as Collapse,
  ChevronRight as Expand,
} from 'lucide-react';
import { ImageUpload } from '../ImageUpload';
import { TrustBarItem } from '@/lib/website-builder/schema';
import {
  TRUST_CATEGORIES,
  INSURANCE_PRESETS,
  ACCREDITATION_PRESETS,
  COMPLIANCE_PRESETS,
  AFFILIATION_PRESETS,
  AWARD_PRESETS,
  RATING_SOURCES,
  TrustItemCategory,
  TrustBarPreset,
  getPresetsForCategory,
  findRatingSourceById,
} from '@/lib/website-builder/trust-bar-constants';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface TrustBarContentConfigFormProps {
  props: Record<string, unknown>;
  onUpdate: (props: Record<string, unknown>) => void;
  disabled?: boolean;
}

// =============================================================================
// ICON MAP
// =============================================================================

const categoryIcons: Record<string, React.ElementType> = {
  Shield: Shield,
  Award: Award,
  ShieldCheck: ShieldCheck,
  Star: Star,
  Users: Users,
  Trophy: Trophy,
  Plus: Plus,
};

function getCategoryIconComponent(iconName: string): React.ElementType {
  return categoryIcons[iconName] || Shield;
}

// =============================================================================
// QUICK ADD PANEL
// =============================================================================

interface QuickAddPanelProps {
  onAddPreset: (preset: TrustBarPreset, category: TrustItemCategory) => void;
  onAddRating: (sourceId: string) => void;
  onAddCustom: () => void;
  disabled?: boolean;
}

function QuickAddPanel({ onAddPreset, onAddRating, onAddCustom, disabled }: QuickAddPanelProps) {
  const [activeCategory, setActiveCategory] = useState<TrustItemCategory>('insurance');

  const renderPresetButtons = () => {
    if (activeCategory === 'rating') {
      return (
        <div className="grid grid-cols-2 gap-2">
          {RATING_SOURCES.filter((s) => s.id !== 'custom').map((source) => (
            <Button
              key={source.id}
              variant="outline"
              size="sm"
              onClick={() => onAddRating(source.id)}
              disabled={disabled}
              className="justify-start text-xs h-auto py-2 px-3"
            >
              <Star className="w-3 h-3 mr-2 flex-shrink-0" />
              <span className="truncate">{source.shortLabel || source.label}</span>
            </Button>
          ))}
        </div>
      );
    }

    if (activeCategory === 'custom') {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-text-secondary mb-3">
            Add a custom trust signal with your own label and image.
          </p>
          <Button variant="outline" onClick={onAddCustom} disabled={disabled}>
            <Plus className="w-4 h-4 mr-2" />
            Add Custom Item
          </Button>
        </div>
      );
    }

    const presets = getPresetsForCategory(activeCategory);
    return (
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => {
          const Icon = getCategoryIconComponent(
            TRUST_CATEGORIES.find((c) => c.id === activeCategory)?.icon || 'Shield'
          );
          return (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              onClick={() => onAddPreset(preset, activeCategory)}
              disabled={disabled}
              className="justify-start text-xs h-auto py-2 px-3"
              title={preset.description}
            >
              <Icon className="w-3 h-3 mr-2 flex-shrink-0" />
              <span className="truncate">{preset.shortLabel || preset.label}</span>
            </Button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4 bg-surface-secondary rounded-lg border border-border-primary">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Quick Add</Label>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1">
        {TRUST_CATEGORIES.map((category) => {
          const Icon = getCategoryIconComponent(category.icon);
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors',
                isActive
                  ? 'bg-interactive-primary text-text-inverse'
                  : 'bg-surface-primary text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              title={category.description}
            >
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{category.label}</span>
            </button>
          );
        })}
      </div>

      {/* Preset Buttons */}
      <div className="max-h-48 overflow-y-auto">{renderPresetButtons()}</div>
    </div>
  );
}

// =============================================================================
// TRUST ITEM EDITOR
// =============================================================================

interface TrustItemEditorProps {
  item: TrustBarItem;
  index: number;
  totalItems: number;
  onUpdate: (updates: Partial<TrustBarItem>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disabled?: boolean;
}

function TrustItemEditor({
  item,
  index,
  totalItems,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  disabled,
}: TrustItemEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRating = item.type === 'rating';
  const categoryInfo = TRUST_CATEGORIES.find((c) => c.id === item.type);
  const Icon = getCategoryIconComponent(categoryInfo?.icon || 'Shield');

  return (
    <div className="p-3 bg-surface-secondary rounded-lg border border-border-primary">
      {/* Header Row */}
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-text-secondary flex-shrink-0" />
        <span className="flex-1 text-sm font-medium truncate">{item.label}</span>

        {/* Reorder & Actions */}
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={onMoveUp}
            disabled={disabled || index === 0}
            className="h-6 w-6"
            aria-label="Move up"
          >
            <ChevronUp className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onMoveDown}
            disabled={disabled || index === totalItems - 1}
            className="h-6 w-6"
            aria-label="Move down"
          >
            <ChevronDown className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Collapse className="w-3 h-3" /> : <Expand className="w-3 h-3" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onRemove}
            disabled={disabled}
            className="h-6 w-6 text-status-error hover:text-status-error hover:bg-status-error/10"
            aria-label="Remove"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Expanded Editor */}
      {isExpanded && (
        <div className="mt-4 space-y-4 pt-4 border-t border-border-primary">
          {/* Type Selection */}
          <div className="space-y-2">
            <Label className="text-xs">Type</Label>
            <Select
              value={item.type}
              onValueChange={(value) => onUpdate({ type: value as TrustItemCategory })}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRUST_CATEGORIES.filter((c) => c.id !== 'custom').map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label className="text-xs">Label</Label>
            <Input
              value={item.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              disabled={disabled}
              placeholder="Display label"
              className="h-8 text-sm"
            />
          </div>

          {/* Short Label */}
          <div className="space-y-2">
            <Label className="text-xs">Short Label (optional)</Label>
            <Input
              value={item.shortLabel || ''}
              onChange={(e) => onUpdate({ shortLabel: e.target.value || undefined })}
              disabled={disabled}
              placeholder="Compact label for small displays"
              className="h-8 text-sm"
            />
          </div>

          {/* Rating-specific fields */}
          {isRating && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Rating Source</Label>
                <Select
                  value={item.ratingSource || 'custom'}
                  onValueChange={(value) => onUpdate({ ratingSource: value })}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATING_SOURCES.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Rating (e.g., 4.9)</Label>
                  <Input
                    value={item.ratingValue || ''}
                    onChange={(e) => onUpdate({ ratingValue: e.target.value || undefined })}
                    disabled={disabled}
                    placeholder="4.9"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Review Count</Label>
                  <Input
                    value={item.ratingCount || ''}
                    onChange={(e) => onUpdate({ ratingCount: e.target.value || undefined })}
                    disabled={disabled}
                    placeholder="238"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Profile URL (optional)</Label>
                <Input
                  value={item.profileUrl || ''}
                  onChange={(e) => onUpdate({ profileUrl: e.target.value || undefined })}
                  disabled={disabled}
                  placeholder="https://www.google.com/maps/place/..."
                  className="h-8 text-sm"
                />
              </div>
            </>
          )}

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="text-xs">Logo / Badge (optional)</Label>
            <ImageUpload
              value={item.imageUrl || ''}
              onChange={(url) => onUpdate({ imageUrl: url || undefined })}
              disabled={disabled}
              aspectRatio="square"
              maxSize={2}
              imageType="logo"
              className="max-w-[100px]"
            />
          </div>

          {/* Verification URL */}
          {!isRating && (
            <div className="space-y-2">
              <Label className="text-xs">Verification URL (optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={item.verifyUrl || ''}
                  onChange={(e) => onUpdate({ verifyUrl: e.target.value || undefined })}
                  disabled={disabled}
                  placeholder="https://www.jointcommission.org/..."
                  className="h-8 text-sm flex-1"
                />
                {item.verifyUrl && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => window.open(item.verifyUrl, '_blank')}
                    aria-label="Open verification URL"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-text-tertiary">
                Link to verification page (makes item clickable)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TrustBarContentConfigForm({
  props,
  onUpdate,
  disabled,
}: TrustBarContentConfigFormProps) {
  const items = (props.items as TrustBarItem[]) || [];

  // Add item from preset
  const handleAddPreset = (preset: TrustBarPreset, category: TrustItemCategory) => {
    const newItem: TrustBarItem = {
      id: Date.now().toString(),
      type: category,
      presetId: preset.id,
      label: preset.label,
      shortLabel: preset.shortLabel,
      verifyUrl: preset.verifyUrl,
    };
    onUpdate({ ...props, items: [...items, newItem] });
  };

  // Add rating item
  const handleAddRating = (sourceId: string) => {
    const source = findRatingSourceById(sourceId);
    if (!source) return;

    const newItem: TrustBarItem = {
      id: Date.now().toString(),
      type: 'rating',
      ratingSource: sourceId,
      label: source.label,
      shortLabel: source.shortLabel,
      ratingValue: '',
      ratingCount: '',
    };
    onUpdate({ ...props, items: [...items, newItem] });
  };

  // Add custom item
  const handleAddCustom = () => {
    const newItem: TrustBarItem = {
      id: Date.now().toString(),
      type: 'custom',
      label: 'Custom Badge',
    };
    onUpdate({ ...props, items: [...items, newItem] });
  };

  // Update item
  const handleUpdateItem = (index: number, updates: Partial<TrustBarItem>) => {
    const newItems = [...items];
    const existing = newItems[index];
    if (existing) {
      newItems[index] = { ...existing, ...updates } as TrustBarItem;
      onUpdate({ ...props, items: newItems });
    }
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onUpdate({ ...props, items: newItems });
  };

  // Move item up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    const item1 = newItems[index - 1];
    const item2 = newItems[index];
    if (item1 && item2) {
      newItems[index - 1] = item2;
      newItems[index] = item1;
      onUpdate({ ...props, items: newItems });
    }
  };

  // Move item down
  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    const item1 = newItems[index];
    const item2 = newItems[index + 1];
    if (item1 && item2) {
      newItems[index] = item2;
      newItems[index + 1] = item1;
      onUpdate({ ...props, items: newItems });
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Add Panel */}
      <QuickAddPanel
        onAddPreset={handleAddPreset}
        onAddRating={handleAddRating}
        onAddCustom={handleAddCustom}
        disabled={disabled}
      />

      {/* Item List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Trust Items ({items.length})</Label>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-6 bg-surface-secondary rounded-lg border border-dashed border-border-primary">
            No items yet. Use Quick Add above to add trust signals.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <TrustItemEditor
                key={item.id}
                item={item}
                index={index}
                totalItems={items.length}
                onUpdate={(updates) => handleUpdateItem(index, updates)}
                onRemove={() => handleRemoveItem(index)}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TrustBarContentConfigForm;
