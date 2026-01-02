'use client';

/**
 * How It Works Content Config Form
 *
 * Configuration panel for editing How It Works block content in the Website Builder sidebar.
 * Allows adding, editing, reordering, and deleting steps with icon selection.
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Calendar,
  Clock,
  CalendarCheck,
  Timer,
  MapPin,
  Building2,
  Home,
  Navigation,
  Heart,
  Stethoscope,
  Pill,
  Thermometer,
  Activity,
  HeartPulse,
  Phone,
  Mail,
  MessageCircle,
  Video,
  CheckCircle,
  Star,
  Shield,
  Users,
  FileText,
  Award,
  LucideIcon,
} from 'lucide-react';
import { HowItWorksIcons, type HowItWorksIcon } from '@/lib/website-builder/schema';

// =============================================================================
// TYPES
// =============================================================================

interface HowItWorksStep {
  id: string;
  number: number;
  title: string;
  description: string;
  icon?: HowItWorksIcon;
}

interface HowItWorksContentConfigFormProps {
  props: Record<string, unknown>;
  onUpdate: (props: Record<string, unknown>) => void;
  disabled?: boolean;
}

// =============================================================================
// ICON MAPPING
// =============================================================================

const ICON_MAP: Record<HowItWorksIcon, LucideIcon> = {
  // Scheduling
  'calendar': Calendar,
  'clock': Clock,
  'calendar-check': CalendarCheck,
  'timer': Timer,
  // Location
  'map-pin': MapPin,
  'building-2': Building2,
  'home': Home,
  'navigation': Navigation,
  // Medical
  'heart': Heart,
  'stethoscope': Stethoscope,
  'pill': Pill,
  'thermometer': Thermometer,
  'activity': Activity,
  'heart-pulse': HeartPulse,
  // Communication
  'phone': Phone,
  'mail': Mail,
  'message-circle': MessageCircle,
  'video': Video,
  // General
  'check-circle': CheckCircle,
  'star': Star,
  'shield': Shield,
  'users': Users,
  'file-text': FileText,
  'award': Award,
};

const ICON_CATEGORIES: { label: string; icons: HowItWorksIcon[] }[] = [
  {
    label: 'Scheduling',
    icons: ['calendar', 'clock', 'calendar-check', 'timer'],
  },
  {
    label: 'Location',
    icons: ['map-pin', 'building-2', 'home', 'navigation'],
  },
  {
    label: 'Medical',
    icons: ['heart', 'stethoscope', 'pill', 'thermometer', 'activity', 'heart-pulse'],
  },
  {
    label: 'Communication',
    icons: ['phone', 'mail', 'message-circle', 'video'],
  },
  {
    label: 'General',
    icons: ['check-circle', 'star', 'shield', 'users', 'file-text', 'award'],
  },
];

function getIconLabel(icon: HowItWorksIcon): string {
  return icon
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// =============================================================================
// ICON PICKER COMPONENT
// =============================================================================

interface IconPickerProps {
  value: HowItWorksIcon | undefined;
  onChange: (value: HowItWorksIcon) => void;
  disabled?: boolean;
}

function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  const selectedIcon = value ? ICON_MAP[value] : Calendar;
  const SelectedIconComponent = selectedIcon;

  return (
    <Select
      value={value || 'calendar'}
      onValueChange={(v) => onChange(v as HowItWorksIcon)}
      disabled={disabled}
    >
      <SelectTrigger className="h-9">
        <SelectValue>
          <div className="flex items-center gap-2">
            <SelectedIconComponent className="w-4 h-4" />
            <span>{value ? getIconLabel(value) : 'Select icon'}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {ICON_CATEGORIES.map((category) => (
          <div key={category.label}>
            <div className="px-2 py-1.5 text-xs font-semibold text-text-tertiary">
              {category.label}
            </div>
            {category.icons.map((iconName) => {
              const IconComponent = ICON_MAP[iconName];
              return (
                <SelectItem key={iconName} value={iconName}>
                  <div className="flex items-center gap-2">
                    <IconComponent className="w-4 h-4" />
                    <span>{getIconLabel(iconName)}</span>
                  </div>
                </SelectItem>
              );
            })}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function HowItWorksContentConfigForm({
  props,
  onUpdate,
  disabled,
}: HowItWorksContentConfigFormProps) {
  const title = (props.title as string) || 'How It Works';
  const subtitle = (props.subtitle as string) || '';
  const steps = (props.steps as HowItWorksStep[]) || [];

  // Add a new step
  const handleAddStep = () => {
    const newStep: HowItWorksStep = {
      id: Date.now().toString(),
      number: steps.length + 1,
      title: 'New Step',
      description: 'Step description',
      icon: 'check-circle',
    };
    onUpdate({ ...props, steps: [...steps, newStep] });
  };

  // Update an existing step
  const handleUpdateStep = (index: number, updates: Partial<HowItWorksStep>) => {
    const newSteps = [...steps];
    const existing = newSteps[index];
    if (existing) {
      newSteps[index] = { ...existing, ...updates } as HowItWorksStep;
      onUpdate({ ...props, steps: newSteps });
    }
  };

  // Remove a step
  const handleRemoveStep = (index: number) => {
    const newSteps = steps
      .filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, number: i + 1 }));
    onUpdate({ ...props, steps: newSteps });
  };

  // Move step up in the list
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSteps = [...steps];
    const item1 = newSteps[index - 1];
    const item2 = newSteps[index];
    if (item1 && item2) {
      newSteps[index - 1] = item2;
      newSteps[index] = item1;
      // Update step numbers
      newSteps.forEach((step, i) => {
        step.number = i + 1;
      });
      onUpdate({ ...props, steps: newSteps });
    }
  };

  // Move step down in the list
  const handleMoveDown = (index: number) => {
    if (index === steps.length - 1) return;
    const newSteps = [...steps];
    const item1 = newSteps[index];
    const item2 = newSteps[index + 1];
    if (item1 && item2) {
      newSteps[index] = item2;
      newSteps[index + 1] = item1;
      // Update step numbers
      newSteps.forEach((step, i) => {
        step.number = i + 1;
      });
      onUpdate({ ...props, steps: newSteps });
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="how-it-works-title">Section Title</Label>
        <Input
          id="how-it-works-title"
          value={title}
          onChange={(e) => onUpdate({ ...props, title: e.target.value })}
          disabled={disabled}
          placeholder="How It Works"
        />
      </div>

      {/* Subtitle */}
      <div className="space-y-2">
        <Label htmlFor="how-it-works-subtitle">Subtitle</Label>
        <Input
          id="how-it-works-subtitle"
          value={subtitle}
          onChange={(e) => onUpdate({ ...props, subtitle: e.target.value || undefined })}
          disabled={disabled}
          placeholder="Optional subtitle"
        />
      </div>

      {/* Steps */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Steps</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddStep}
            disabled={disabled}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Step
          </Button>
        </div>

        {steps.length === 0 && (
          <p className="text-sm text-text-tertiary text-center py-4">
            No steps yet. Click &quot;Add Step&quot; to create your first step.
          </p>
        )}

        {steps.map((step, index) => (
          <div
            key={step.id}
            className="p-4 bg-surface-secondary rounded-lg space-y-4 border border-border-primary"
          >
            {/* Step Header with Reorder & Delete */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">
                Step {step.number}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleMoveUp(index)}
                  disabled={disabled || index === 0}
                  className="h-7 w-7"
                  aria-label="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleMoveDown(index)}
                  disabled={disabled || index === steps.length - 1}
                  className="h-7 w-7"
                  aria-label="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemoveStep(index)}
                  disabled={disabled || steps.length <= 1}
                  className="h-7 w-7 text-status-error hover:text-status-error hover:bg-status-error/10"
                  aria-label={`Delete step ${step.number}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Icon Picker */}
            <div className="space-y-1">
              <Label className="text-xs text-text-secondary">Icon</Label>
              <IconPicker
                value={step.icon}
                onChange={(icon) => handleUpdateStep(index, { icon })}
                disabled={disabled}
              />
            </div>

            {/* Step Title */}
            <div className="space-y-1">
              <Label htmlFor={`step-title-${index}`} className="text-xs text-text-secondary">
                Title
              </Label>
              <Input
                id={`step-title-${index}`}
                value={step.title}
                onChange={(e) => handleUpdateStep(index, { title: e.target.value })}
                disabled={disabled}
                placeholder="Step title"
              />
            </div>

            {/* Step Description */}
            <div className="space-y-1">
              <Label htmlFor={`step-description-${index}`} className="text-xs text-text-secondary">
                Description
              </Label>
              <Textarea
                id={`step-description-${index}`}
                value={step.description}
                onChange={(e) => handleUpdateStep(index, { description: e.target.value })}
                disabled={disabled}
                placeholder="Step description"
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HowItWorksContentConfigForm;
