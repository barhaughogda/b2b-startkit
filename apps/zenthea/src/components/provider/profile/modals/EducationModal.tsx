/**
 * Education Modal Component
 * 
 * Modal for adding and editing education entries in provider profile.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GraduationCap, Loader2 } from 'lucide-react';

export interface EducationEntry {
  degree: string;
  institution: string;
  field?: string;
  graduationYear?: number;
  verified: boolean;
}

interface EducationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (education: EducationEntry) => void;
  initialData?: EducationEntry | null;
  isEditing?: boolean;
}

const DEGREE_OPTIONS = [
  { value: 'MD', label: 'Doctor of Medicine (MD)' },
  { value: 'DO', label: 'Doctor of Osteopathic Medicine (DO)' },
  { value: 'PhD', label: 'Doctor of Philosophy (PhD)' },
  { value: 'PharmD', label: 'Doctor of Pharmacy (PharmD)' },
  { value: 'DDS', label: 'Doctor of Dental Surgery (DDS)' },
  { value: 'DMD', label: 'Doctor of Medicine in Dentistry (DMD)' },
  { value: 'DPT', label: 'Doctor of Physical Therapy (DPT)' },
  { value: 'DNP', label: 'Doctor of Nursing Practice (DNP)' },
  { value: 'MSN', label: 'Master of Science in Nursing (MSN)' },
  { value: 'PA', label: 'Physician Assistant (PA)' },
  { value: 'NP', label: 'Nurse Practitioner (NP)' },
  { value: 'RN', label: 'Registered Nurse (RN)' },
  { value: 'BSN', label: 'Bachelor of Science in Nursing (BSN)' },
  { value: 'MS', label: 'Master of Science (MS)' },
  { value: 'BS', label: 'Bachelor of Science (BS)' },
  { value: 'BA', label: 'Bachelor of Arts (BA)' },
  { value: 'MPH', label: 'Master of Public Health (MPH)' },
  { value: 'MBA', label: 'Master of Business Administration (MBA)' },
  { value: 'Other', label: 'Other' },
];

// Generate year options from 1950 to current year
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from(
  { length: currentYear - 1949 },
  (_, i) => currentYear - i
);

export function EducationModal({
  open,
  onOpenChange,
  onSave,
  initialData,
  isEditing = false,
}: EducationModalProps) {
  const [formData, setFormData] = useState<EducationEntry>({
    degree: '',
    institution: '',
    field: '',
    graduationYear: undefined,
    verified: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        // Ensure verified field is always set (fallback for backward compatibility)
        setFormData({
          ...initialData,
          verified: initialData.verified ?? false,
        });
      } else {
        setFormData({
          degree: '',
          institution: '',
          field: '',
          graduationYear: undefined,
          verified: false,
        });
      }
      setErrors({});
    }
  }, [open, initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.degree.trim()) {
      newErrors.degree = 'Degree is required';
    }
    if (!formData.institution.trim()) {
      newErrors.institution = 'Institution is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      onSave(formData);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof EducationEntry, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-zenthea-teal" />
            {isEditing ? 'Edit Education' : 'Add Education'}
          </DialogTitle>
          <DialogDescription>
            Add your medical education and degrees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Degree */}
          <div className="space-y-2">
            <Label htmlFor="degree">
              Degree <span className="text-status-error">*</span>
            </Label>
            <Select
              value={formData.degree}
              onValueChange={(value) => handleChange('degree', value)}
            >
              <SelectTrigger
                id="degree"
                className={errors.degree ? 'border-status-error' : ''}
              >
                <SelectValue placeholder="Select a degree" />
              </SelectTrigger>
              <SelectContent>
                {DEGREE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.degree && (
              <p className="text-xs text-status-error">{errors.degree}</p>
            )}
          </div>

          {/* Institution */}
          <div className="space-y-2">
            <Label htmlFor="institution">
              Institution <span className="text-status-error">*</span>
            </Label>
            <Input
              id="institution"
              placeholder="e.g., Harvard Medical School"
              value={formData.institution}
              onChange={(e) => handleChange('institution', e.target.value)}
              className={errors.institution ? 'border-status-error' : ''}
            />
            {errors.institution && (
              <p className="text-xs text-status-error">{errors.institution}</p>
            )}
          </div>

          {/* Field of Study */}
          <div className="space-y-2">
            <Label htmlFor="field">Field of Study</Label>
            <Input
              id="field"
              placeholder="e.g., Internal Medicine, Pediatrics"
              value={formData.field || ''}
              onChange={(e) => handleChange('field', e.target.value)}
            />
            <p className="text-xs text-text-tertiary">Optional</p>
          </div>

          {/* Graduation Year */}
          <div className="space-y-2">
            <Label htmlFor="graduationYear">Graduation Year</Label>
            <Select
              value={formData.graduationYear?.toString() || ''}
              onValueChange={(value) =>
                handleChange('graduationYear', value ? parseInt(value) : undefined)
              }
            >
              <SelectTrigger id="graduationYear">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {YEAR_OPTIONS.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-text-tertiary">Optional</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Add Education'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

