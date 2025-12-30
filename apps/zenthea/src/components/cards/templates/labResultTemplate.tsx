import React from 'react';
import { TestTube } from 'lucide-react';
import { CardType, CardTemplate, BaseCardProps, CardEventHandlers } from '../types';
import { LabResultCard } from '../LabResultCard';

export const labResultTemplate: CardTemplate = {
  type: 'labResult',
  config: {
    type: 'labResult',
    color: 'bg-purple-50 border-purple-200',
    icon: TestTube,
    size: {
      min: 300,
      max: 500,
      default: 400,
      current: 400
    },
    layout: 'vertical',
    interactions: {
      resizable: true,
      draggable: true,
      stackable: true,
      minimizable: true,
      maximizable: true,
      closable: true
    },
    priority: {
      color: 'text-purple-600',
      borderColor: 'border-purple-500',
      icon: <TestTube className="h-4 w-4" />,
      badge: 'Lab Result'
    }
  },
  render: (props: BaseCardProps) => {
    // Create complete lab result data structure matching LabResultData interface
    const labData = {
      id: props.id,
      patientId: props.patientId || '',
      patientName: props.patientName || '',
      patientAge: 45,
      patientGender: 'Male',
      
      // Test Information
      testName: props.title || 'Comprehensive Metabolic Panel',
      testType: 'routine' as const,
      collectionDate: new Date().toISOString().split('T')[0]!!,
      resultsDate: new Date().toISOString().split('T')[0]!!,
      status: 'reviewed' as const,
      
      // Lab Categories and Panels
      labCategories: [
        {
          id: 'basic-metabolic',
          name: 'Basic Metabolic Panel',
          isActive: true,
          tests: ['Glucose', 'BUN', 'Creatinine', 'Sodium', 'Potassium']
        },
        {
          id: 'lipid-panel',
          name: 'Lipid Panel',
          isActive: false,
          tests: ['Total Cholesterol', 'HDL', 'LDL', 'Triglycerides']
        }
      ],
      activeCategory: 'basic-metabolic',
      
      // Search and Filtering
      searchQuery: '',
      timePeriod: 'past-3-months' as const,
      
      // Laboratory Information
      laboratoryName: 'Central Lab Services',
      laboratoryContact: '(555) 123-4567',
      laboratoryAddress: '123 Medical Center Dr, City, State 12345',
      labAccreditation: 'CAP Accredited',
      
      // Ordering Physician
      orderingPhysician: 'Dr. Smith',
      orderingPhysicianSpecialty: 'Internal Medicine',
      
      // Results Data
      results: [
        {
          testName: 'Glucose',
          value: 95,
          units: 'mg/dL',
          referenceRange: '70-100 mg/dL',
          flag: 'normal' as const,
          trend: 'stable' as const,
          interpretation: 'Within normal limits'
        },
        {
          testName: 'BUN',
          value: 18,
          units: 'mg/dL',
          referenceRange: '7-20 mg/dL',
          flag: 'normal' as const,
          trend: 'stable' as const,
          interpretation: 'Normal kidney function'
        }
      ],
      
      // Clinical Context
      clinicalNotes: 'Patient stable, all values within normal limits.',
      followUpRequired: false,
      followUpRecommendations: 'Continue current treatment plan.',
      criticalAlerts: [],
      
      // Trend Data
      trends: [
        {
          testName: 'Glucose',
          historicalData: [
            { date: '2024-01-01', value: 92, flag: 'normal' },
            { date: '2024-02-01', value: 88, flag: 'normal' },
            { date: '2024-03-01', value: 95, flag: 'normal' }
          ]
        }
      ],
      
      // Actions and Workflow
      canReview: true,
      canAddNotes: true,
      canOrderFollowUp: true,
      canNotifyPatient: true,
      canPrint: true
    };
    
    return <LabResultCard 
      {...props} 
      labData={labData}
      handlers={props.handlers || {} as CardEventHandlers}
    />;
  },
  validate: (props: BaseCardProps) => {
    // Validate that required lab result data is present
    return props.type === 'labResult' && 
           Boolean(props.patientId) && 
           Boolean(props.patientName);
  }
};
