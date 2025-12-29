'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PatientAvatarUpload } from '../PatientAvatarUpload';
import { ProfileSection } from '../profile/ProfileSection';
import { ProfileCompletenessIndicator } from '../profile/ProfileCompletenessIndicator';
import { DemographicsForm } from '../profile/DemographicsForm';
import { MedicalHistoryForm } from '../profile/MedicalHistoryForm';
import { AllergiesForm } from '../profile/AllergiesForm';
import { MedicationsForm } from '../profile/MedicationsForm';
import { EmergencyContactsForm } from '../profile/EmergencyContactsForm';
import { InsuranceForm } from '../profile/InsuranceForm';
import { LifestyleForm } from '../profile/LifestyleForm';
import { FamilyHistoryForm } from '../profile/FamilyHistoryForm';
import { ImmunizationsForm } from '../profile/ImmunizationsForm';
import { AdvanceDirectivesForm } from '../profile/AdvanceDirectivesForm';
import { MedicalBioForm } from '../profile/MedicalBioForm';
import { 
  User,
  Heart, 
  AlertTriangle,
  Pill,
  Phone,
  CreditCard,
  Activity, 
  Users,
  Syringe,
  FileText,
  BookOpen,
} from 'lucide-react';
import { Id } from '../../../../convex/_generated/dataModel';
import { getPatientInitials, calculateAge } from '@/lib/utils/patientProfileHelpers';

interface PatientDashboardLayoutProps {
  patientId: Id<'patients'>;
  patientProfile: any;
  expandedSections: Set<string>;
  onToggleSection: (section: string) => void;
  getSectionCompleteness: (section: string) => boolean;
  sectionsCompleted: string[];
  onAvatarChange: (avatarUrl: string) => Promise<void>;
  isUpdatingAvatar: boolean;
  fallbackName?: string;
}

export function PatientDashboardLayout({
  patientId,
  patientProfile,
  expandedSections,
  onToggleSection,
  getSectionCompleteness,
  sectionsCompleted,
  onAvatarChange,
  isUpdatingAvatar,
  fallbackName,
}: PatientDashboardLayoutProps) {
  const initials = getPatientInitials(patientProfile, fallbackName);
  const age = calculateAge(patientProfile?.dateOfBirth);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary">Patient Profile</h1>
          <p className="text-text-secondary mt-1">
            Manage your complete medical information and share it with your healthcare providers
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Avatar and Completeness */}
          <div className="lg:col-span-1 space-y-6">
            {/* Avatar Card */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <PatientAvatarUpload
                    currentAvatar={patientProfile.avatar}
                    patientName={`${patientProfile.firstName} ${patientProfile.lastName}`}
                    onAvatarChange={onAvatarChange}
                    disabled={isUpdatingAvatar || !patientId}
                  />
                </div>
                <h3 className="font-semibold text-lg text-text-primary">
                  {patientProfile.firstName} {patientProfile.lastName}
                </h3>
                {age && (
                  <p className="text-sm text-text-secondary mt-1">
                    {age} years old
                    {patientProfile.gender && ` • ${patientProfile.gender}`}
                  </p>
                )}
                {patientProfile.email && (
                  <p className="text-sm text-text-secondary mt-2">{patientProfile.email}</p>
                )}
              </CardContent>
            </Card>

            {/* Profile Completeness Indicator */}
            <ProfileCompletenessIndicator
              sectionsCompleted={sectionsCompleted}
              totalSections={12}
            />
          </div>

          {/* Right Side - Expandable Sections */}
          <div className="lg:col-span-2 space-y-4">
            {/* Demographics */}
            <ProfileSection
              title="Demographics & Personal Information"
              icon={User}
              isExpanded={expandedSections.has('demographics')}
              onToggle={() => onToggleSection('demographics')}
              isComplete={getSectionCompleteness('demographics')}
            >
              <DemographicsForm
                patientId={patientId}
                initialData={{
                  preferredName: patientProfile.preferredName,
                  gender: patientProfile.gender,
                  genderIdentity: patientProfile.genderIdentity,
                  preferredPronouns: patientProfile.preferredPronouns,
                  maritalStatus: patientProfile.maritalStatus,
                  occupation: patientProfile.occupation,
                  primaryLanguage: patientProfile.primaryLanguage,
                  race: patientProfile.race,
                  ethnicity: patientProfile.ethnicity,
                  cellPhone: patientProfile.cellPhone,
                  workPhone: patientProfile.workPhone,
                }}
              />
            </ProfileSection>

            {/* Medical History */}
            <ProfileSection
              title="Medical History"
              icon={Heart}
              isExpanded={expandedSections.has('medicalHistory')}
              onToggle={() => onToggleSection('medicalHistory')}
              isComplete={getSectionCompleteness('medicalHistory')}
            >
              <MedicalHistoryForm
                patientId={patientId}
                initialData={patientProfile.medicalHistory}
              />
            </ProfileSection>

            {/* Allergies */}
            <ProfileSection
              title="Allergies & Adverse Reactions"
              icon={AlertTriangle}
              isExpanded={expandedSections.has('allergies')}
              onToggle={() => onToggleSection('allergies')}
              isComplete={getSectionCompleteness('allergies')}
            >
              <AllergiesForm patientId={patientId} initialData={patientProfile.allergies} />
            </ProfileSection>

            {/* Medications */}
            <ProfileSection
              title="Current Medications"
              icon={Pill}
              isExpanded={expandedSections.has('medications')}
              onToggle={() => onToggleSection('medications')}
              isComplete={getSectionCompleteness('medications')}
            >
              <MedicationsForm patientId={patientId} initialData={patientProfile.medications} />
            </ProfileSection>

            {/* Emergency Contacts */}
            <ProfileSection
              title="Emergency Contacts & Healthcare Proxy"
              icon={Phone}
              isExpanded={expandedSections.has('emergencyContacts')}
              onToggle={() => onToggleSection('emergencyContacts')}
              isComplete={getSectionCompleteness('emergencyContacts') || getSectionCompleteness('healthcareProxy')}
            >
              <EmergencyContactsForm
                patientId={patientId}
                initialData={{
                  emergencyContacts: patientProfile.emergencyContacts,
                  healthcareProxy: patientProfile.healthcareProxy,
                }}
              />
            </ProfileSection>

            {/* Insurance */}
            <ProfileSection
              title="Insurance Information"
              icon={CreditCard}
              isExpanded={expandedSections.has('insurance')}
              onToggle={() => onToggleSection('insurance')}
              isComplete={getSectionCompleteness('insurance')}
            >
              <InsuranceForm patientId={patientId} initialData={patientProfile.insurance} />
            </ProfileSection>

            {/* Lifestyle */}
            <ProfileSection
              title="Lifestyle Factors"
              icon={Activity}
              isExpanded={expandedSections.has('lifestyle')}
              onToggle={() => onToggleSection('lifestyle')}
              isComplete={getSectionCompleteness('lifestyle')}
            >
              <LifestyleForm patientId={patientId} initialData={patientProfile.lifestyle} />
            </ProfileSection>

            {/* Family History */}
            <ProfileSection
              title="Family Medical History"
              icon={Users}
              isExpanded={expandedSections.has('familyHistory')}
              onToggle={() => onToggleSection('familyHistory')}
              isComplete={getSectionCompleteness('familyHistory')}
            >
              <FamilyHistoryForm
                patientId={patientId}
                initialData={patientProfile.familyHistory}
              />
            </ProfileSection>

            {/* Immunizations */}
            <ProfileSection
              title="Immunization Records"
              icon={Syringe}
              isExpanded={expandedSections.has('immunizations')}
              onToggle={() => onToggleSection('immunizations')}
              isComplete={getSectionCompleteness('immunizations')}
            >
              <ImmunizationsForm
                patientId={patientId}
                initialData={patientProfile.immunizations}
              />
            </ProfileSection>

            {/* Advance Directives */}
            <ProfileSection
              title="Advance Directives"
              icon={FileText}
              isExpanded={expandedSections.has('advanceDirectives')}
              onToggle={() => onToggleSection('advanceDirectives')}
              isComplete={getSectionCompleteness('advanceDirectives')}
            >
              <AdvanceDirectivesForm
                patientId={patientId}
                initialData={patientProfile.advanceDirectives}
              />
            </ProfileSection>

            {/* Medical Bio */}
            <ProfileSection
              title="Medical Biography"
              icon={BookOpen}
              isExpanded={expandedSections.has('medicalBio')}
              onToggle={() => onToggleSection('medicalBio')}
              isComplete={getSectionCompleteness('medicalBio')}
            >
              <MedicalBioForm patientId={patientId} initialData={patientProfile.medicalBio} />
            </ProfileSection>
          </div>
        </div>
      </div>
    </div>
  );
}

