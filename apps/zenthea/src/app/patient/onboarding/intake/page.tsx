'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { usePatientProfileData } from '@/hooks/usePatientProfileData';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Save, Loader2, ChevronRight, ChevronLeft, CheckCircle2, Circle, User, Stethoscope, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Form sections configuration
const FORM_SECTIONS = [
  { id: 'provider', title: 'Choose Your Primary Provider', required: true },
  { id: 'demographics', title: 'Demographics & Personal Information', required: true },
  { id: 'contact', title: 'Contact Information', required: true },
  { id: 'emergency', title: 'Emergency Contacts', required: true },
  { id: 'medical', title: 'Medical History', required: false },
  { id: 'allergies', title: 'Allergies & Reactions', required: false },
  { id: 'medications', title: 'Current Medications', required: false },
  { id: 'insurance', title: 'Insurance Information', required: false },
] as const;

type SectionId = typeof FORM_SECTIONS[number]['id'];

interface IntakeFormData {
  // Primary Provider Selection
  primaryProviderId?: string;
  
  // Demographics
  preferredName?: string;
  gender?: string;
  genderIdentity?: string;
  preferredPronouns?: string;
  maritalStatus?: string;
  occupation?: string;
  primaryLanguage?: string;
  race?: string;
  ethnicity?: string;
  
  // Contact
  email?: string;
  phone?: string;
  cellPhone?: string;
  workPhone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  
  // Emergency Contacts
  emergencyContacts?: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    isPrimary: boolean;
  }>;
  
  // Medical History (simplified for intake)
  medicalHistory?: {
    chronicConditions?: Array<{
      condition: string;
      diagnosisDate: string;
      status: string;
    }>;
  };
  
  // Allergies (simplified)
  allergies?: {
    medications?: Array<{
      substance: string;
      reactionType: string;
      severity: string;
    }>;
  };
  
  // Medications (simplified)
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  
  // Insurance
  insurance?: {
    primary?: {
      provider: string;
      policyNumber: string;
      groupNumber?: string;
      subscriberName: string;
    };
  };
}

const DRAFT_STORAGE_KEY = 'patient_intake_draft';

function PatientIntakePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { patientId, patientProfile, isLoading: profileLoading } = usePatientProfileData();
  const updateProfile = useMutation((api as any).patientProfile?.updatePatientProfile);
  const updatePatient = useMutation((api as any).patients?.updatePatient);
  const setPrimaryProvider = useMutation(api.careTeam.setPrimaryProvider);
  
  // Get the tenant ID and redirect URL from session or search params
  const tenantId = session?.user?.tenantId || 'demo-tenant';
  const redirectTo = searchParams?.get('redirect') || '/patient/dashboard';
  
  // Fetch available providers for the tenant (staff/provider roles only)
  const tenantUsers = useQuery(
    api.users.getUsersByTenant,
    tenantId ? { tenantId } : 'skip'
  );
  
  // Filter to only show staff who can be primary providers
  const availableProviders = useMemo(() => {
    if (!tenantUsers) return [];
    const providerRoles = ['admin', 'provider', 'clinic_user'];
    return tenantUsers
      .filter(user => 
        providerRoles.includes(user.role) && 
        user.role !== 'patient'
      )
      .map(user => ({
        id: user._id,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        role: user.role,
      }));
  }, [tenantUsers]);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [completedSections, setCompletedSections] = useState<Set<SectionId>>(new Set());
  
  const [formData, setFormData] = useState<IntakeFormData>(() => {
    // Load draft from localStorage if available
    if (typeof window !== 'undefined') {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        try {
          return JSON.parse(savedDraft);
        } catch {
          return {};
        }
      }
    }
    return {};
  });

  // Helper function to check if emergency contacts are valid (matches layout validation)
  const hasValidEmergencyContacts = (contacts?: Array<{ name?: string; phone?: string }>): boolean => {
    return !!(
      contacts &&
      contacts.length > 0 &&
      contacts.some((ec) => ec.name && ec.phone)
    );
  };

  // Load existing profile data when available
  useEffect(() => {
    if (patientProfile && !profileLoading) {
      setFormData((prev) => ({
        ...prev,
        primaryProviderId: patientProfile.primaryProviderId || prev.primaryProviderId,
        preferredName: patientProfile.preferredName || prev.preferredName,
        gender: patientProfile.gender || prev.gender,
        genderIdentity: patientProfile.genderIdentity || prev.genderIdentity,
        preferredPronouns: patientProfile.preferredPronouns || prev.preferredPronouns,
        maritalStatus: patientProfile.maritalStatus || prev.maritalStatus,
        occupation: patientProfile.occupation || prev.occupation,
        primaryLanguage: patientProfile.primaryLanguage || prev.primaryLanguage,
        race: patientProfile.race || prev.race,
        ethnicity: patientProfile.ethnicity || prev.ethnicity,
        email: patientProfile.email || prev.email,
        phone: patientProfile.phone || prev.phone,
        cellPhone: patientProfile.cellPhone || prev.cellPhone,
        workPhone: patientProfile.workPhone || prev.workPhone,
        address: patientProfile.address || prev.address,
        emergencyContacts: patientProfile.emergencyContacts || prev.emergencyContacts,
        medicalHistory: patientProfile.medicalHistory || prev.medicalHistory,
        allergies: patientProfile.allergies || prev.allergies,
        medications: patientProfile.medications || prev.medications,
        insurance: patientProfile.insurance || prev.insurance,
      }));
      
      // Mark completed sections (matching layout validation requirements)
      const completed = new Set<SectionId>();
      if (patientProfile.primaryProviderId) completed.add('provider');
      if (patientProfile.gender && patientProfile.primaryLanguage) completed.add('demographics');
      if (patientProfile.email || patientProfile.phone) completed.add('contact');
      if (hasValidEmergencyContacts(patientProfile.emergencyContacts)) completed.add('emergency');
      if (patientProfile.medicalHistory) completed.add('medical');
      if (patientProfile.allergies) completed.add('allergies');
      if (patientProfile.medications?.length) completed.add('medications');
      if (patientProfile.insurance) completed.add('insurance');
      setCompletedSections(completed);
    }
  }, [patientProfile, profileLoading]);

  // Save draft to localStorage whenever form data changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData]);

  // Check if patient already completed intake
  useEffect(() => {
    if (patientProfile && !profileLoading && patientId) {
      // Check if all required sections are complete (matching layout validation)
      const hasRequiredData = 
        patientProfile.primaryProviderId &&
        (patientProfile.gender && patientProfile.primaryLanguage) &&
        (patientProfile.email || patientProfile.phone) &&
        hasValidEmergencyContacts(patientProfile.emergencyContacts);
      
      if (hasRequiredData) {
        // Intake already completed, redirect to specified destination or dashboard
        router.push(redirectTo);
      }
    }
  }, [patientProfile, profileLoading, patientId, router, redirectTo]);

  if (!session || session.user.role !== 'patient') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please sign in to complete your intake form.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading your information...</p>
        </div>
      </div>
    );
  }

  if (!patientId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Patient Not Found</CardTitle>
            <CardDescription>Unable to find your patient record. Please contact support.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentSection = FORM_SECTIONS[currentStep];
  const progress = ((currentStep + 1) / FORM_SECTIONS.length) * 100;
  const totalCompleted = completedSections.size;
  const totalSections = FORM_SECTIONS.length;

  const validateCurrentSection = (): boolean => {
    if (!currentSection) return true;
    const section = currentSection.id;
    
    switch (section) {
      case 'provider':
        return !!formData.primaryProviderId;
      case 'demographics':
        return !!(formData.gender && formData.primaryLanguage);
      case 'contact':
        return !!(formData.email || formData.phone);
      case 'emergency':
        return hasValidEmergencyContacts(formData.emergencyContacts);
      default:
        return true; // Optional sections
    }
  };

  const handleSaveDraft = async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
      toast.success('Draft saved', {
        description: 'Your progress has been saved locally.',
      });
    }
  };

  const handleSaveSection = async () => {
    if (!validateCurrentSection()) {
      toast.error('Validation Error', {
        description: 'Please complete all required fields in this section.',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (!currentSection) throw new Error("Invalid current section");
      const section = currentSection.id;
      let sectionData: any = {};
      let sectionName: string = '';

      switch (section) {
        case 'provider':
          // Save primary provider using setPrimaryProvider mutation
          if (formData.primaryProviderId && patientId && session?.user?.id) {
            await setPrimaryProvider({
              patientId: patientId as Id<'patients'>,
              newProviderId: formData.primaryProviderId as Id<'users'>,
              reason: 'patient_self_selected',
              notes: 'Selected during patient intake form',
              changedBy: session.user.id as Id<'users'>,
              tenantId,
            });
          }
          // Mark section as completed and move to next
          setCompletedSections((prev) => new Set([...prev, section]));
          toast.success('Primary provider saved', {
            description: 'Your primary provider has been assigned.',
          });
          if (currentStep < FORM_SECTIONS.length - 1) {
            setCurrentStep(currentStep + 1);
          }
          setIsSaving(false);
          return;
          
        case 'demographics':
          sectionName = 'demographics';
          sectionData = {
            preferredName: formData.preferredName,
            gender: formData.gender,
            genderIdentity: formData.genderIdentity,
            preferredPronouns: formData.preferredPronouns,
            maritalStatus: formData.maritalStatus,
            occupation: formData.occupation,
            primaryLanguage: formData.primaryLanguage,
            race: formData.race,
            ethnicity: formData.ethnicity,
          };
          break;
        case 'contact':
          // Contact info (email, phone, address) are top-level patient fields
          // They need to be saved via patients.updatePatient mutation
          // Cell phone and work phone can be saved via demographics
          sectionName = 'demographics';
          sectionData = {
            cellPhone: formData.cellPhone,
            workPhone: formData.workPhone,
          };
          // Email, phone, and address will be saved separately via updatePatient mutation
          break;
        case 'emergency':
          sectionName = 'emergencyContacts';
          sectionData = formData.emergencyContacts || [];
          break;
        case 'medical':
          sectionName = 'medicalHistory';
          sectionData = formData.medicalHistory || {};
          break;
        case 'allergies':
          sectionName = 'allergies';
          sectionData = formData.allergies || {};
          break;
        case 'medications':
          sectionName = 'medications';
          sectionData = formData.medications || [];
          break;
        case 'insurance':
          sectionName = 'insurance';
          sectionData = formData.insurance || {};
          break;
      }

      await updateProfile({
        patientId,
        section: sectionName as any,
        data: sectionData,
        userEmail: session?.user?.email,
      });

      // If this is the contact section, also update email, phone, and address via updatePatient
      if (section === 'contact' && updatePatient) {
        try {
          const patientUpdates: any = {};
          if (formData.email) patientUpdates.email = formData.email;
          if (formData.phone) patientUpdates.phone = formData.phone;
          if (formData.address) patientUpdates.address = formData.address;
          
          if (Object.keys(patientUpdates).length > 0) {
            await updatePatient({
              id: patientId,
              ...patientUpdates,
            });
          }
        } catch (error) {
          // Log error but don't fail the whole save
          console.error('Failed to save contact information:', error);
          toast.error('Warning', {
            description: 'Some contact information may not have been saved. Please check your profile.',
          });
        }
      }

      // Mark section as completed
      setCompletedSections((prev) => new Set([...prev, section]));
      
      // Clear draft from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }

      toast.success('Section saved', {
        description: `${currentSection.title} has been saved successfully.`,
      });

      // Move to next section or complete
      if (currentStep < FORM_SECTIONS.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // All sections complete - redirect to specified destination or dashboard
        router.push(redirectTo);
      }
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save section.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (currentStep < FORM_SECTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (path: string[], value: any) => {
    setFormData((prev) => {
      const newData = { ...prev };
      let current: any = newData;
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (key === undefined) continue;
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key];
      }
      const lastKey = path[path.length - 1];
      if (lastKey !== undefined) {
        current[lastKey] = value;
      }
      return newData;
    });
  };

  const addEmergencyContact = () => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: [
        ...(prev.emergencyContacts || []),
        { name: '', relationship: '', phone: '', isPrimary: false },
      ],
    }));
  };

  const updateEmergencyContact = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: (prev.emergencyContacts || []).map((ec, i) =>
        i === index ? { ...ec, [field]: value } : ec
      ),
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: (prev.emergencyContacts || []).filter((_, i) => i !== index),
    }));
  };

  const renderSection = () => {
    if (!currentSection) return null;
    switch (currentSection.id) {
      case 'provider':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zenthea-teal/10 mb-4">
                <Stethoscope className="h-8 w-8 text-zenthea-teal" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Select Your Primary Care Provider
              </h3>
              <p className="text-sm text-text-secondary max-w-md mx-auto">
                Your primary provider will be your main point of contact for appointments 
                and medical care. You can change this later if needed.
              </p>
            </div>
            
            <div className="max-w-md mx-auto space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primaryProvider" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Primary Provider *
                </Label>
                <Select
                  value={formData.primaryProviderId || ''}
                  onValueChange={(value) => updateField('primaryProviderId', value)}
                >
                  <SelectTrigger id="primaryProvider" className="w-full">
                    <SelectValue placeholder="Choose a provider..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.length === 0 ? (
                      <SelectItem value="no-providers" disabled>
                        No providers available
                      </SelectItem>
                    ) : (
                      availableProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <div className="flex items-center gap-2">
                            <span>{provider.name}</span>
                            <span className="text-text-tertiary text-xs capitalize">
                              ({provider.role.replace('_', ' ')})
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {formData.primaryProviderId && (
                <div className="p-4 bg-surface-elevated border border-border-primary rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zenthea-teal/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-zenthea-teal" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">
                        {availableProviders.find(p => p.id === formData.primaryProviderId)?.name}
                      </p>
                      <p className="text-sm text-text-secondary">
                        Will be your primary care provider
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'demographics':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferredName">Preferred Name</Label>
                <Input
                  id="preferredName"
                  value={formData.preferredName || ''}
                  onChange={(e) => updateField('preferredName', e.target.value)}
                  placeholder="How you'd like to be addressed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Biological Sex *</Label>
                <select
                  id="gender"
                  value={formData.gender || ''}
                  onChange={(e) => updateField('gender', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border-primary bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="genderIdentity">Gender Identity</Label>
                <Input
                  id="genderIdentity"
                  value={formData.genderIdentity || ''}
                  onChange={(e) => updateField('genderIdentity', e.target.value)}
                  placeholder="e.g., Non-binary, Transgender"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferredPronouns">Preferred Pronouns</Label>
                <Input
                  id="preferredPronouns"
                  value={formData.preferredPronouns || ''}
                  onChange={(e) => updateField('preferredPronouns', e.target.value)}
                  placeholder="e.g., They/Them, She/Her, He/Him"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maritalStatus">Marital Status</Label>
                <select
                  id="maritalStatus"
                  value={formData.maritalStatus || ''}
                  onChange={(e) => updateField('maritalStatus', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border-primary bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select...</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                  <option value="domestic-partnership">Domestic Partnership</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={formData.occupation || ''}
                  onChange={(e) => updateField('occupation', e.target.value)}
                  placeholder="Your current occupation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryLanguage">Primary Language *</Label>
                <select
                  id="primaryLanguage"
                  value={formData.primaryLanguage || ''}
                  onChange={(e) => updateField('primaryLanguage', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border-primary bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">Select...</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="zh">Chinese</option>
                  <option value="fr">French</option>
                  <option value="ar">Arabic</option>
                  <option value="hi">Hindi</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="race">Race</Label>
                <Input
                  id="race"
                  value={formData.race || ''}
                  onChange={(e) => updateField('race', e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ethnicity">Ethnicity</Label>
                <Input
                  id="ethnicity"
                  value={formData.ethnicity || ''}
                  onChange={(e) => updateField('ethnicity', e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cellPhone">Cell Phone</Label>
                <Input
                  id="cellPhone"
                  type="tel"
                  value={formData.cellPhone || ''}
                  onChange={(e) => updateField('cellPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workPhone">Work Phone</Label>
                <Input
                  id="workPhone"
                  type="tel"
                  value={formData.workPhone || ''}
                  onChange={(e) => updateField('workPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Street Address"
                  value={formData.address?.street || ''}
                  onChange={(e) => updateNestedField(['address', 'street'], e.target.value)}
                />
                <Input
                  placeholder="City"
                  value={formData.address?.city || ''}
                  onChange={(e) => updateNestedField(['address', 'city'], e.target.value)}
                />
                <Input
                  placeholder="State"
                  value={formData.address?.state || ''}
                  onChange={(e) => updateNestedField(['address', 'state'], e.target.value)}
                />
                <Input
                  placeholder="ZIP Code"
                  value={formData.address?.zipCode || ''}
                  onChange={(e) => updateNestedField(['address', 'zipCode'], e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 'emergency':
        return (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Please provide at least one emergency contact. This person will be contacted in case of an emergency.
            </p>
            {(formData.emergencyContacts || []).map((contact, index) => (
              <Card key={index} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={contact.name}
                      onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                      placeholder="Full Name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Relationship *</Label>
                    <Input
                      value={contact.relationship}
                      onChange={(e) => updateEmergencyContact(index, 'relationship', e.target.value)}
                      placeholder="e.g., Spouse, Parent, Friend"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={contact.email || ''}
                      onChange={(e) => updateEmergencyContact(index, 'email', e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`primary-${index}`}
                      checked={contact.isPrimary}
                      onChange={(e) => updateEmergencyContact(index, 'isPrimary', e.target.checked)}
                      className="rounded border-border-primary"
                    />
                    <Label htmlFor={`primary-${index}`} className="cursor-pointer">
                      Primary Contact
                    </Label>
                  </div>
                  {(formData.emergencyContacts || []).length > 1 && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeEmergencyContact(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
            <Button type="button" variant="outline" onClick={addEmergencyContact}>
              Add Another Contact
            </Button>
          </div>
        );

      case 'medical':
        return (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              This section is optional. You can add more details later in your profile.
            </p>
            <div className="space-y-2">
              <Label>Chronic Conditions</Label>
              <p className="text-sm text-text-secondary">
                You can add medical history details after completing your intake form.
              </p>
            </div>
          </div>
        );

      case 'allergies':
        return (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              This section is optional. You can add allergy details later in your profile.
            </p>
            <div className="space-y-2">
              <Label>Allergies & Adverse Reactions</Label>
              <p className="text-sm text-text-secondary">
                You can add allergy information after completing your intake form.
              </p>
            </div>
          </div>
        );

      case 'medications':
        return (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              This section is optional. You can add medication details later in your profile.
            </p>
            <div className="space-y-2">
              <Label>Current Medications</Label>
              <p className="text-sm text-text-secondary">
                You can add medication information after completing your intake form.
              </p>
            </div>
          </div>
        );

      case 'insurance':
        return (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              This section is optional. You can add insurance details later in your profile.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                <Input
                  id="insuranceProvider"
                  value={formData.insurance?.primary?.provider || ''}
                  onChange={(e) => updateNestedField(['insurance', 'primary', 'provider'], e.target.value)}
                  placeholder="Insurance Company Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policyNumber">Policy Number</Label>
                <Input
                  id="policyNumber"
                  value={formData.insurance?.primary?.policyNumber || ''}
                  onChange={(e) => updateNestedField(['insurance', 'primary', 'policyNumber'], e.target.value)}
                  placeholder="Policy Number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupNumber">Group Number</Label>
                <Input
                  id="groupNumber"
                  value={formData.insurance?.primary?.groupNumber || ''}
                  onChange={(e) => updateNestedField(['insurance', 'primary', 'groupNumber'], e.target.value)}
                  placeholder="Group Number (if applicable)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscriberName">Subscriber Name</Label>
                <Input
                  id="subscriberName"
                  value={formData.insurance?.primary?.subscriberName || ''}
                  onChange={(e) => updateNestedField(['insurance', 'primary', 'subscriberName'], e.target.value)}
                  placeholder="Name on Insurance Card"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background-primary py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Patient Intake Form</CardTitle>
                <CardDescription>
                  Please complete the following information to set up your patient profile.
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-sm text-text-secondary">
                  {totalCompleted} of {totalSections} sections completed
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Step {currentStep + 1} of {FORM_SECTIONS.length}: {currentSection?.title}
                </span>
                <span className="text-sm text-text-secondary">
                  {Math.round(progress)}% Complete
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Section Steps */}
            <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2">
              {FORM_SECTIONS.map((section, index) => (
                <div
                  key={section.id}
                  className={`flex items-center ${index < FORM_SECTIONS.length - 1 ? 'flex-1' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setCurrentStep(index)}
                    className={`flex flex-col items-center space-y-1 min-w-0 ${
                      index === currentStep
                        ? 'text-zenthea-teal'
                        : completedSections.has(section.id)
                        ? 'text-status-success'
                        : 'text-text-secondary'
                    }`}
                  >
                    {completedSections.has(section.id) ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                    <span className="text-xs text-center truncate max-w-[80px]">
                      {section.title.split(' ')[0]}
                    </span>
                  </button>
                  {index < FORM_SECTIONS.length - 1 && (
                    <ChevronRight className="h-4 w-4 mx-2 text-text-tertiary flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Form Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">{currentSection?.title}</h3>
              {renderSection()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={isSaving}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>
              </div>
              <div className="flex gap-2">
                {currentStep < FORM_SECTIONS.length - 1 ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleNext}
                      disabled={isSaving}
                    >
                      Skip for Now
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveSection}
                      disabled={isSaving || !validateCurrentSection()}
                      className="bg-zenthea-teal hover:bg-zenthea-teal-600"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Save & Continue
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSaveSection}
                    disabled={isSaving || !validateCurrentSection()}
                    className="bg-zenthea-teal hover:bg-zenthea-teal-600"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Complete Intake
                        <CheckCircle2 className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PatientIntakePage() {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-status-error">
                <AlertCircle className="h-5 w-5" />
                Intake Form Error
              </CardTitle>
              <CardDescription>
                We encountered an error while loading the intake form. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {process.env.NODE_ENV === 'development' && (
                  <details className="text-xs text-text-tertiary">
                    <summary className="cursor-pointer hover:text-text-secondary">
                      Error Details (Development)
                    </summary>
                    <pre className="mt-2 p-2 bg-surface-elevated rounded text-xs overflow-auto">
                      {error.message}
                    </pre>
                  </details>
                )}
                <div className="flex gap-2">
                  <Button onClick={resetError} variant="outline">
                    Try Again
                  </Button>
                  <Button onClick={() => window.location.href = '/patient/dashboard'}>
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-text-secondary">Loading...</p>
            </div>
          </div>
        }
      >
        <PatientIntakePageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
