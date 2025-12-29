/**
 * Provider Credentials Section Component
 * 
 * Handles NPI, license, education and board certifications
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, Award, Hash, FileText, Pencil, Trash2, Plus } from 'lucide-react';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';
import { EducationModal, type EducationEntry } from '../modals/EducationModal';
import { CertificationModal, type CertificationEntry } from '../modals/CertificationModal';

interface ProviderCredentialsSectionProps {
  formData: ProviderProfileUpdateData;
  updateField: <K extends keyof ProviderProfileUpdateData>(
    field: K,
    value: ProviderProfileUpdateData[K]
  ) => void;
  errors: any;
}

export function ProviderCredentialsSection({
  formData,
  updateField,
  errors,
}: ProviderCredentialsSectionProps) {
  // Modal states
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [isCertificationModalOpen, setIsCertificationModalOpen] = useState(false);
  const [editingEducationIndex, setEditingEducationIndex] = useState<number | null>(null);
  const [editingCertificationIndex, setEditingCertificationIndex] = useState<number | null>(null);

  // Get current education and certification arrays from form data
  const educationList = (formData.education as EducationEntry[] | undefined) || [];
  const certificationList = (formData.certifications as CertificationEntry[] | undefined) || [];

  // Education handlers
  const handleAddEducation = () => {
    setEditingEducationIndex(null);
    setIsEducationModalOpen(true);
  };

  const handleEditEducation = (index: number) => {
    setEditingEducationIndex(index);
    setIsEducationModalOpen(true);
  };

  const handleDeleteEducation = (index: number) => {
    const newEducation = educationList.filter((_, i) => i !== index);
    updateField('education' as keyof ProviderProfileUpdateData, newEducation as any);
  };

  const handleSaveEducation = (education: EducationEntry) => {
    let newEducation: EducationEntry[];
    
    if (editingEducationIndex !== null) {
      // Editing existing entry
      newEducation = [...educationList];
      newEducation[editingEducationIndex] = education;
    } else {
      // Adding new entry
      newEducation = [...educationList, education];
    }
    
    updateField('education' as keyof ProviderProfileUpdateData, newEducation as any);
    setEditingEducationIndex(null);
  };

  // Certification handlers
  const handleAddCertification = () => {
    setEditingCertificationIndex(null);
    setIsCertificationModalOpen(true);
  };

  const handleEditCertification = (index: number) => {
    setEditingCertificationIndex(index);
    setIsCertificationModalOpen(true);
  };

  const handleDeleteCertification = (index: number) => {
    const newCertifications = certificationList.filter((_, i) => i !== index);
    updateField('certifications' as keyof ProviderProfileUpdateData, newCertifications as any);
  };

  const handleSaveCertification = (certification: CertificationEntry) => {
    let newCertifications: CertificationEntry[];
    
    if (editingCertificationIndex !== null) {
      // Editing existing entry
      newCertifications = [...certificationList];
      newCertifications[editingCertificationIndex] = certification;
    } else {
      // Adding new entry
      newCertifications = [...certificationList, certification];
    }
    
    updateField('certifications' as keyof ProviderProfileUpdateData, newCertifications as any);
    setEditingCertificationIndex(null);
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* NPI and License Fields - Available to all clinic users */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="npi" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            NPI Number
          </Label>
          <Input
            id="npi"
            type="text"
            placeholder="10-digit NPI"
            value={(formData as any).npi || ''}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 10);
              updateField('npi' as any, value);
            }}
            maxLength={10}
            className={errors.npi ? 'border-status-error' : ''}
          />
          {errors.npi && (
            <p className="text-xs text-status-error mt-1">
              {errors.npi.message as string}
            </p>
          )}
          <p className="text-xs text-text-tertiary mt-1">
            National Provider Identifier (optional)
          </p>
        </div>

        <div>
          <Label htmlFor="licenseNumber" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            License Number
          </Label>
          <Input
            id="licenseNumber"
            type="text"
            placeholder="e.g., MD123456"
            value={(formData as any).licenseNumber || ''}
            onChange={(e) => updateField('licenseNumber' as any, e.target.value)}
            className={errors.licenseNumber ? 'border-status-error' : ''}
          />
          {errors.licenseNumber && (
            <p className="text-xs text-status-error mt-1">
              {errors.licenseNumber.message as string}
            </p>
          )}
          <p className="text-xs text-text-tertiary mt-1">
            Medical license number (optional)
          </p>
        </div>

        <div>
          <Label htmlFor="licenseState">License State</Label>
          <Input
            id="licenseState"
            type="text"
            placeholder="e.g., CA, NY, TX"
            value={(formData as any).licenseState || ''}
            onChange={(e) => updateField('licenseState' as any, e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
            className={errors.licenseState ? 'border-status-error' : ''}
          />
          {errors.licenseState && (
            <p className="text-xs text-status-error mt-1">
              {errors.licenseState.message as string}
            </p>
          )}
          <p className="text-xs text-text-tertiary mt-1">
            State where license was issued (optional)
          </p>
        </div>
      </div>

      {/* Education Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Education
            </Label>
            <p className="text-sm text-text-secondary">
              Add your medical education and degrees
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleAddEducation}>
            <Plus className="h-4 w-4 mr-2" />
            Add Education
          </Button>
        </div>

        {/* Education List */}
        {educationList.length > 0 ? (
          <div className="space-y-2">
            {educationList.map((edu, index) => (
              <Card key={index} className="bg-surface-elevated">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">
                          {edu.degree}
                        </span>
                        {edu.graduationYear && (
                          <span className="text-sm text-text-secondary">
                            ({edu.graduationYear})
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary mt-1">
                        {edu.institution}
                      </p>
                      {edu.field && (
                        <p className="text-xs text-text-tertiary mt-1">
                          Field: {edu.field}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEducation(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEducation(index)}
                        className="h-8 w-8 p-0 text-status-error hover:text-status-error hover:bg-status-error/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-surface-elevated border-dashed">
            <CardContent className="p-6 text-center">
              <GraduationCap className="h-8 w-8 mx-auto text-text-tertiary mb-2" />
              <p className="text-sm text-text-tertiary">
                No education entries added yet
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={handleAddEducation}
                className="mt-2"
              >
                Add your first education entry
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Certifications Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Certifications
            </Label>
            <p className="text-sm text-text-secondary">
              Add your professional certifications
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleAddCertification}>
            <Plus className="h-4 w-4 mr-2" />
            Add Certification
          </Button>
        </div>

        {/* Certification List */}
        {certificationList.length > 0 ? (
          <div className="space-y-2">
            {certificationList.map((cert, index) => (
              <Card key={index} className="bg-surface-elevated">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">
                          {cert.name}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary mt-1">
                        {cert.issuingOrganization}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {cert.issueDate && (
                          <span className="text-xs text-text-tertiary">
                            Issued: {formatDate(cert.issueDate)}
                          </span>
                        )}
                        {cert.expirationDate && (
                          <span className="text-xs text-text-tertiary">
                            Expires: {formatDate(cert.expirationDate)}
                          </span>
                        )}
                        {cert.credentialId && (
                          <span className="text-xs text-text-tertiary">
                            ID: {cert.credentialId}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCertification(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCertification(index)}
                        className="h-8 w-8 p-0 text-status-error hover:text-status-error hover:bg-status-error/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-surface-elevated border-dashed">
            <CardContent className="p-6 text-center">
              <Award className="h-8 w-8 mx-auto text-text-tertiary mb-2" />
              <p className="text-sm text-text-tertiary">
                No certifications added yet
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={handleAddCertification}
                className="mt-2"
              >
                Add your first certification
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Education Modal */}
      <EducationModal
        open={isEducationModalOpen}
        onOpenChange={setIsEducationModalOpen}
        onSave={handleSaveEducation}
        initialData={editingEducationIndex !== null ? educationList[editingEducationIndex] : null}
        isEditing={editingEducationIndex !== null}
      />

      {/* Certification Modal */}
      <CertificationModal
        open={isCertificationModalOpen}
        onOpenChange={setIsCertificationModalOpen}
        onSave={handleSaveCertification}
        initialData={editingCertificationIndex !== null ? certificationList[editingCertificationIndex] : null}
        isEditing={editingCertificationIndex !== null}
      />
    </div>
  );
}
