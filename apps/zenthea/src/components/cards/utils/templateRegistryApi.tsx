'use client';

import React from 'react';
import { CardType, CardTemplate, BaseCardProps, CardEventHandlers, TaskStatus } from '../types';
import { appointmentTemplate, messageTemplate, labResultTemplate } from '../templates';
import VitalSignsCard from '../VitalSignsCard';
import SOAPNoteCard from '../SOAPNoteCard';
import { PrescriptionCard } from '../PrescriptionCard';
import { ProcedureCard } from '../ProcedureCard';
import { DiagnosisCard } from '../DiagnosisCard';

/**
 * Template Registry Core API
 * 
 * This file contains the core template registry functionality to avoid circular dependencies.
 * Both TemplateRegistry.tsx and useTemplateHandlers.ts import from this file.
 */

// Template registry - centralized template definitions
const cardTemplates: Record<CardType, CardTemplate> = {
  appointment: appointmentTemplate,
  message: messageTemplate,
  labResult: labResultTemplate,
  // Add other templates as they are extracted
  vitalSigns: {
    type: 'vitalSigns',
    config: {
      type: 'vitalSigns',
      color: 'bg-orange-50 border-orange-200',
      icon: React.lazy(() => import('lucide-react').then(lucideModule => ({ default: lucideModule.Activity }))),
      size: { min: 300, max: 500, default: 400, current: 400 },
      layout: 'vertical',
      interactions: { resizable: true, draggable: true, stackable: true, minimizable: true, maximizable: true, closable: true },
      priority: { color: 'text-orange-600', borderColor: 'border-orange-500', icon: null, badge: 'Vital Signs' }
    },
    render: (props: BaseCardProps) => {
      // Create default vital signs data structure matching VitalSignsCardProps interface
      const vitalSignsData = {
        id: props.id,
        patientId: props.patientId || '',
        patientName: props.patientName || '',
        date: new Date().toISOString().split('T')[0]!!!,
        time: new Date().toLocaleTimeString(),
        readings: {
          bloodPressure: {
            systolic: 120,
            diastolic: 80,
            unit: 'mmHg',
            status: 'normal' as const
          },
          heartRate: {
            value: 72,
            unit: 'bpm',
            status: 'normal' as const
          },
          temperature: {
            value: 98.6,
            unit: '°F',
            status: 'normal' as const
          },
          weight: {
            value: 150,
            unit: 'lbs',
            status: 'normal' as const
          },
          height: {
            value: 68,
            unit: 'inches',
            status: 'normal' as const
          }
        },
        trends: {
          bloodPressure: 'stable' as const,
          heartRate: 'stable' as const,
          temperature: 'stable' as const,
          weight: 'stable' as const
        },
        historicalData: {
          bloodPressure: [],
          heartRate: [],
          temperature: [],
          weight: [],
          height: []
        },
        notes: 'Vital signs within normal range.',
        careTeam: [],
        tags: [],
        documents: [],
        comments: [],
        activity: []
      };
      
      console.log('VitalSignsCard template - props.handlers:', props.handlers);
      return <VitalSignsCard 
        {...props} 
        vitalSignsData={vitalSignsData}
        handlers={props.handlers || {} as CardEventHandlers}
      />;
    },
    validate: (props: BaseCardProps) => props.type === 'vitalSigns'
  },
  soapNote: {
    type: 'soapNote',
    config: {
      type: 'soapNote',
      color: 'bg-indigo-50 border-indigo-200',
      icon: React.lazy(() => import('lucide-react').then(lucideModule => ({ default: lucideModule.FileText }))),
      size: { min: 300, max: 600, default: 400, current: 400 },
      layout: 'vertical',
      interactions: { resizable: true, draggable: true, stackable: true, minimizable: true, maximizable: true, closable: true },
      priority: { color: 'text-indigo-600', borderColor: 'border-indigo-500', icon: null, badge: 'SOAP Note' }
    },
    render: (props: BaseCardProps) => {
      // Create default SOAP note data structure matching SOAPNoteCardProps interface
      const soapData = {
        id: props.id,
        patientId: props.patientId || '',
        patientName: props.patientName || '',
        provider: 'Dr. Smith',
        date: new Date().toISOString().split('T')[0]!!!,
        subjective: {
          chiefComplaint: 'Patient reports feeling well.',
          historyOfPresentIllness: 'No acute concerns at this time.',
          reviewOfSystems: 'No significant symptoms reported.',
          socialHistory: 'Non-smoker, occasional alcohol use.',
          familyHistory: 'No significant family history of disease.'
        },
        objective: {
          vitalSigns: 'Vital signs within normal limits.',
          physicalExam: 'Physical examination reveals no abnormalities.',
          laboratoryResults: 'Recent lab results within normal range.',
          imagingResults: 'No recent imaging studies.',
          otherFindings: 'No other significant findings.'
        },
        assessment: {
          diagnosis: 'Well patient visit.',
          differentialDiagnosis: ['Routine follow-up', 'Preventive care'],
          clinicalImpression: 'Patient appears to be in good health.',
          riskFactors: ['Age-appropriate screening needed']
        },
        plan: {
          medications: ['Continue current medications as prescribed'],
          procedures: ['Annual physical examination'],
          followUp: 'Return in 1 year for routine follow-up.',
          patientEducation: 'Continue healthy lifestyle habits.',
          referrals: []
        },
        status: 'draft' as const,
        careTeam: [],
        tags: [],
        documents: [],
        comments: []
      };
      
      return <SOAPNoteCard 
        {...props} 
        soapNoteData={soapData}
        handlers={props.handlers || {} as CardEventHandlers}
      />;
    },
    validate: (props: BaseCardProps) => props.type === 'soapNote'
  },
  prescription: {
    type: 'prescription',
    config: {
      type: 'prescription',
      color: 'bg-red-50 border-red-200',
      icon: React.lazy(() => import('lucide-react').then(lucideModule => ({ default: lucideModule.Pill }))),
      size: { min: 300, max: 500, default: 400, current: 400 },
      layout: 'vertical',
      interactions: { resizable: true, draggable: true, stackable: true, minimizable: true, maximizable: true, closable: true },
      priority: { color: 'text-red-600', borderColor: 'border-red-500', icon: null, badge: 'Prescription' }
    },
    render: (props: BaseCardProps) => {
      // Create default prescription data structure matching PrescriptionCardProps interface
      const prescriptionData = {
        id: props.id,
        patientId: props.patientId || '',
        patientName: props.patientName || '',
        patientDateOfBirth: '1990-01-01',
        medication: {
          name: 'Sample Medication',
          genericName: 'Generic Sample',
          strength: '10mg',
          form: 'Tablet',
          drugClass: 'Sample Class',
          ndc: '12345-678-90',
          manufacturer: 'Sample Pharma',
          controlledSubstance: false,
          schedule: null
        },
        prescription: {
          status: 'active' as const,
          dosage: '10mg',
          frequency: 'Once daily',
          quantity: 30,
          refills: 3,
          daysSupply: 30,
          startDate: new Date().toISOString().split('T')[0]!!,
          endDate: null,
          instructions: 'Take with food',
          indication: 'Sample indication'
        },
        prescriber: {
          name: 'Dr. Smith',
          specialty: 'Internal Medicine',
          npi: '1234567890',
          dea: 'AS1234567',
          phone: '(555) 123-4567',
          email: 'dr.smith@example.com'
        },
        pharmacy: {
          name: 'Local Pharmacy',
          address: '123 Main St, City, State 12345',
          phone: '(555) 987-6543',
          ncpdp: '1234567',
          preferred: true
        },
        interactions: [],
        allergies: [],
        refillHistory: [],
        monitoring: {
          labTests: ['Blood pressure monitoring'],
          vitalSigns: ['Heart rate', 'Blood pressure'],
          symptoms: ['Dizziness', 'Swelling'],
          frequency: 'Weekly',
          followUp: 'Return in 1 month'
        },
        careTeam: [],
        tags: [],
        documents: [],
        comments: []
      };
      
      return <PrescriptionCard 
        {...props} 
        prescriptionData={prescriptionData}
        handlers={props.handlers || {} as CardEventHandlers}
      />;
    },
    validate: (props: BaseCardProps) => props.type === 'prescription'
  },
  procedure: {
    type: 'procedure',
    config: {
      type: 'procedure',
      color: 'card-procedure-bg card-procedure-border',
      icon: React.lazy(() => import('lucide-react').then(lucideModule => ({ default: lucideModule.Stethoscope }))),
      size: { min: 300, max: 1200, default: 600, current: 600 },
      layout: 'detailed',
      interactions: { resizable: true, draggable: true, stackable: true, minimizable: true, maximizable: true, closable: true },
      priority: { color: 'text-purple-600', borderColor: 'border-purple-500', icon: null, badge: 'Procedure' }
    },
    render: (props: BaseCardProps) => {
      // Create sample procedure data
      // Map TaskStatus to procedure status
      const getProcedureStatus = (taskStatus: TaskStatus): 'scheduled' | 'in-progress' | 'completed' | 'cancelled' => {
        switch (taskStatus) {
          case 'completed':
            return 'completed';
          case 'cancelled':
            return 'cancelled';
          case 'inProgress':
            return 'in-progress';
          default:
            return 'scheduled';
        }
      };

      const procedureData = {
        id: props.id,
        patientId: props.patientId,
        patientName: props.patientName,
        patientDateOfBirth: props.patientDateOfBirth || '',
        procedure: {
          type: props.title || 'Medical Procedure',
          code: '00000',
          description: 'Medical procedure',
          category: 'General',
          duration: '30 minutes',
          status: getProcedureStatus(props.status),
          scheduledDate: props.dueDate || new Date().toISOString(),
          performedDate: props.status === 'completed' ? new Date().toISOString() : null,
          location: 'Procedure Room',
          facility: 'Main Hospital',
          anesthesia: 'Local',
          preparation: null,
          instructions: null,
          indication: 'Medical procedure',
          findings: null,
          complications: null,
          followUp: null
        },
        provider: {
          name: 'Dr. Provider',
          npi: '0000000000',
          specialty: 'General Medicine',
          credentials: 'MD',
          phone: '(555) 000-0000',
          email: 'provider@clinic.com'
        },
        outcomes: [],
        careTeam: [],
        tags: [],
        documents: [],
        comments: []
      };
      
      return <ProcedureCard 
        {...props} 
        procedureData={procedureData}
        handlers={props.handlers || {} as CardEventHandlers}
      />;
    },
    validate: (props: BaseCardProps) => props.type === 'procedure'
  },
  diagnosis: {
    type: 'diagnosis',
    config: {
      type: 'diagnosis',
      color: 'card-diagnosis-bg card-diagnosis-border',
      icon: React.lazy(() => import('lucide-react').then(lucideModule => ({ default: lucideModule.AlertCircle }))),
      size: { min: 300, max: 600, default: 400, current: 400 },
      layout: 'vertical',
      interactions: { resizable: true, draggable: true, stackable: true, minimizable: true, maximizable: true, closable: true },
      priority: { color: 'text-red-600', borderColor: 'border-red-500', icon: null, badge: 'Diagnosis' }
    },
    render: (props: BaseCardProps) => {
      // Create default diagnosis data structure matching DiagnosisCardProps interface
      const diagnosisData = {
        id: props.id,
        patientId: props.patientId || '',
        patientName: props.patientName || '',
        patientDateOfBirth: props.patientDateOfBirth || '1990-01-01',
        diagnosis: {
          code: 'E11.9',
          description: props.title || 'Type 2 diabetes mellitus without complications',
          category: 'Endocrine',
          severity: 'moderate' as const,
          status: 'active' as const,
          onsetDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!!, // 6 months ago
          diagnosisDate: new Date(Date.now() - 175 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!!, // 5.8 months ago
          confirmedDate: new Date(Date.now() - 170 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!!, // 5.6 months ago
          icd10Code: 'E11.9',
          snomedCode: '44054006'
        },
        provider: {
          name: 'Dr. Smith',
          npi: '1234567890',
          specialty: 'Endocrinology',
          credentials: 'MD',
          phone: '(555) 123-4567',
          email: 'dr.smith@clinic.com'
        },
        relatedConditions: [],
        treatmentPlan: {
          medications: [],
          lifestyle: ['Dietary modifications', 'Regular exercise'],
          monitoring: ['HbA1c every 3 months'],
          followUp: 'Follow-up in 3 months'
        },
        careTeam: [],
        tags: [],
        documents: [],
        comments: []
      };
      
      return <DiagnosisCard 
        {...props} 
        diagnosisData={diagnosisData}
        handlers={props.handlers || {} as CardEventHandlers}
      />;
    },
    validate: (props: BaseCardProps) => props.type === 'diagnosis'
  }
};

/**
 * Get a card template by type
 */
export function getCardTemplate(type: CardType): CardTemplate {
  const template = cardTemplates[type];
  if (!template) {
    throw new Error(`Card template for type '${type}' not found`);
  }
  return template;
}

/**
 * Get all card templates
 */
export function getAllCardTemplates(): Record<CardType, CardTemplate> {
  return cardTemplates;
}

/**
 * Register a new card template
 */
export function registerCardTemplate(type: CardType, template: CardTemplate): void {
  cardTemplates[type] = template;
}

/**
 * Validate card props against template
 */
export function validateCardProps(props: BaseCardProps): boolean {
  const template = getCardTemplate(props.type);
  return template.validate(props);
}

/**
 * Create a card component from a template
 */
export function createCardFromTemplate(
  type: CardType,
  props: BaseCardProps
): React.ReactNode {
  const template = getCardTemplate(type);
  
  if (!template.validate(props)) {
    throw new Error(`Invalid props for card type '${type}'`);
  }
  
  return template.render(props);
}

