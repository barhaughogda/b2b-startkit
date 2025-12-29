/**
 * Certification Modal Component
 * 
 * Modal for adding and editing certification entries in provider profile.
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
import { Award, Loader2 } from 'lucide-react';

export interface CertificationEntry {
  name: string;
  issuingOrganization: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  verified: boolean;
}

interface CertificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (certification: CertificationEntry) => void;
  initialData?: CertificationEntry | null;
  isEditing?: boolean;
}

export function CertificationModal({
  open,
  onOpenChange,
  onSave,
  initialData,
  isEditing = false,
}: CertificationModalProps) {
  const [formData, setFormData] = useState<CertificationEntry>({
    name: '',
    issuingOrganization: '',
    issueDate: '',
    expirationDate: '',
    credentialId: '',
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
          name: '',
          issuingOrganization: '',
          issueDate: '',
          expirationDate: '',
          credentialId: '',
          verified: false,
        });
      }
      setErrors({});
    }
  }, [open, initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Certification name is required';
    }
    if (!formData.issuingOrganization.trim()) {
      newErrors.issuingOrganization = 'Issuing organization is required';
    }

    // Validate date order if both dates provided
    if (formData.issueDate && formData.expirationDate) {
      const issueDate = new Date(formData.issueDate);
      const expirationDate = new Date(formData.expirationDate);
      if (expirationDate <= issueDate) {
        newErrors.expirationDate = 'Expiration date must be after issue date';
      }
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

  const handleChange = (field: keyof CertificationEntry, value: string) => {
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
            <Award className="h-5 w-5 text-zenthea-teal" />
            {isEditing ? 'Edit Certification' : 'Add Certification'}
          </DialogTitle>
          <DialogDescription>
            Add your professional certifications and credentials
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Certification Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Certification Name <span className="text-status-error">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., BLS, ACLS, Board Certified"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={errors.name ? 'border-status-error' : ''}
            />
            {errors.name && (
              <p className="text-xs text-status-error">{errors.name}</p>
            )}
          </div>

          {/* Issuing Organization */}
          <div className="space-y-2">
            <Label htmlFor="issuingOrganization">
              Issuing Organization <span className="text-status-error">*</span>
            </Label>
            <Input
              id="issuingOrganization"
              placeholder="e.g., American Heart Association"
              value={formData.issuingOrganization}
              onChange={(e) => handleChange('issuingOrganization', e.target.value)}
              className={errors.issuingOrganization ? 'border-status-error' : ''}
            />
            {errors.issuingOrganization && (
              <p className="text-xs text-status-error">{errors.issuingOrganization}</p>
            )}
          </div>

          {/* Issue Date */}
          <div className="space-y-2">
            <Label htmlFor="issueDate">Issue Date</Label>
            <Input
              id="issueDate"
              type="date"
              value={formData.issueDate || ''}
              onChange={(e) => handleChange('issueDate', e.target.value)}
            />
            <p className="text-xs text-text-tertiary">Optional</p>
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <Label htmlFor="expirationDate">Expiration Date</Label>
            <Input
              id="expirationDate"
              type="date"
              value={formData.expirationDate || ''}
              onChange={(e) => handleChange('expirationDate', e.target.value)}
              className={errors.expirationDate ? 'border-status-error' : ''}
            />
            {errors.expirationDate ? (
              <p className="text-xs text-status-error">{errors.expirationDate}</p>
            ) : (
              <p className="text-xs text-text-tertiary">Optional - leave blank if no expiration</p>
            )}
          </div>

          {/* Credential ID */}
          <div className="space-y-2">
            <Label htmlFor="credentialId">Credential ID</Label>
            <Input
              id="credentialId"
              placeholder="e.g., CERT-12345678"
              value={formData.credentialId || ''}
              onChange={(e) => handleChange('credentialId', e.target.value)}
            />
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
            {isEditing ? 'Save Changes' : 'Add Certification'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

