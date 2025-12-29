import React from 'react';
import { BaseCardProps, CardEventHandlers } from '../types';
import { LabResultData, LabResultCard } from '../LabResultCard';

// Sample data factory for testing
export function createSampleLabResultCard(
  id: string,
  baseProps: Omit<BaseCardProps, 'id' | 'type' | 'content'>,
  handlers: CardEventHandlers
): React.ReactElement {
  const sampleLabData: LabResultData = {
    id,
    patientId: 'P123456',
    patientName: 'John Doe',
    patientAge: 45,
    patientGender: 'Male',
    
    testName: 'Complete Blood Count',
    testType: 'routine',
    collectionDate: new Date().toISOString(),
    resultsDate: new Date().toISOString(),
    status: 'reviewed',
    
    // Lab Categories and Panels
    labCategories: [
      { id: 'basic-metabolic', name: 'Basic Metabolic', isActive: true, tests: ['Glucose', 'Sodium', 'Potassium', 'Calcium', 'Alkaline Phosphatase'] },
      { id: 'complete-blood-count', name: 'Complete Blood Count', isActive: false, tests: ['Hemoglobin', 'White Blood Cell Count', 'Platelet Count'] },
      { id: 'prothrombin-time', name: 'Prothrombin Time', isActive: false, tests: ['PT', 'INR'] },
      { id: 'hemoglobin-a1c', name: 'Hemoglobin A1C', isActive: false, tests: ['HbA1c'] },
      { id: 'lipid', name: 'Lipid', isActive: false, tests: ['Total Cholesterol', 'HDL', 'LDL', 'Triglycerides'] },
      { id: 'liver', name: 'Liver', isActive: false, tests: ['ALT', 'AST', 'Bilirubin'] }
    ],
    activeCategory: 'basic-metabolic',
    
    // Search and Filtering
    searchQuery: '',
    timePeriod: 'past-year' as const,
    
    laboratoryName: 'Quest Diagnostics',
    laboratoryContact: '(555) 123-4567',
    laboratoryAddress: '123 Medical Center Dr, City, State 12345',
    labAccreditation: 'CLIA, CAP',
    
    orderingPhysician: 'Dr. Sarah Johnson',
    orderingPhysicianSpecialty: 'Internal Medicine',
    
    results: [
      {
        testName: 'Glucose',
        value: 83,
        units: 'mg/dl',
        referenceRange: '70-100',
        flag: 'normal',
        trend: 'stable',
        interpretation: 'Within normal limits'
      },
      {
        testName: 'Sodium',
        value: 137,
        units: 'mmol/L',
        referenceRange: '136-145',
        flag: 'normal',
        trend: 'stable',
        interpretation: 'Within normal limits'
      },
      {
        testName: 'Potassium',
        value: 4.1,
        units: 'mmol/L',
        referenceRange: '3.5-5.0',
        flag: 'normal',
        trend: 'improving',
        interpretation: 'Within normal limits, trending up'
      }
    ],
    
    clinicalNotes: 'Patient reports fatigue. CBC ordered to rule out anemia.',
    followUpRequired: true,
    followUpRecommendations: 'Repeat CBC in 3 months. Consider iron studies if symptoms persist.',
    criticalAlerts: [],
    
    trends: [
      {
        testName: 'Glucose',
        historicalData: [
          { date: '2023-10-15', value: 92, flag: 'normal' },
          { date: '2023-11-15', value: 88, flag: 'normal' },
          { date: '2024-01-15', value: 83, flag: 'normal' }
        ]
      }
    ],
    
    canReview: true,
    canAddNotes: true,
    canOrderFollowUp: true,
    canNotifyPatient: true,
    canPrint: true,
    
    careTeam: [
      { id: '1', name: 'Dr. Sarah Johnson', role: 'Ordering Physician', initials: 'SJ', isActive: true }
    ],
    tags: [
      { id: '1', name: 'Routine', color: 'blue', category: 'medical' as const }
    ],
    documents: [],
    comments: []
  };

  return createLabResultCard(id, sampleLabData, baseProps, handlers);
}

// Factory function for creating LabResultCard instances
export function createLabResultCard(
  id: string,
  labData: LabResultData,
  baseProps: Omit<BaseCardProps, 'id' | 'type' | 'content'>,
  handlers: CardEventHandlers
): React.ReactElement {
  const props: any = {
    ...baseProps,
    id,
    type: 'labResult',
    content: null, // Will be rendered by the card itself
    labData,
    handlers
  };

  return <LabResultCard {...props} handlers={handlers} />;
}
