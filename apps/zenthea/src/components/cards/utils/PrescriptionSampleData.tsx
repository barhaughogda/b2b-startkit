import React from 'react';
import { BaseCardProps, CardEventHandlers } from '../types';
import { PrescriptionCard } from '../PrescriptionCard';

// Sample data factory for testing
export function createSamplePrescriptionCard(
  id: string,
  baseProps: Omit<BaseCardProps, 'id' | 'type' | 'content'>,
  handlers: CardEventHandlers
): React.ReactElement {
  const samplePrescriptionData = {
    id,
    patientId: 'P123456',
    patientName: 'John Doe',
    patientDateOfBirth: '1980-01-01',
    medication: {
      name: 'Lisinopril',
      genericName: 'Lisinopril',
      strength: '10mg',
      form: 'Tablet',
      drugClass: 'ACE Inhibitor',
      ndc: '12345-678-90',
      manufacturer: 'Generic Pharma',
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
      startDate: '2024-01-01',
      endDate: '2024-04-01',
      instructions: 'Take with food',
      indication: 'Hypertension'
    },
    prescriber: {
      name: 'Dr. Smith',
      specialty: 'Cardiology',
      npi: '1234567890',
      dea: 'AS1234567',
      phone: '555-1234',
      email: 'dr.smith@hospital.com'
    },
    pharmacy: {
      name: 'CVS Pharmacy',
      address: '123 Main St',
      phone: '555-5678',
      ncpdp: '1234567',
      preferred: true
    },
    interactions: [
      { id: '1', name: 'ACE Inhibitor', severity: 'moderate' as const, description: 'May increase risk of hyperkalemia' }
    ],
    allergies: [
      { id: '1', name: 'Penicillin', reaction: 'Rash', severity: 'mild' as const }
    ],
    monitoring: {
      labTests: ['Creatinine', 'Potassium'],
      vitalSigns: ['Blood Pressure'],
      symptoms: ['Dizziness', 'Cough'],
      frequency: 'Monthly',
      followUp: '3 months'
    },
    refillHistory: [
      { id: '1', date: '2024-01-01', pharmacy: 'CVS Pharmacy', quantity: 30 }
    ],
    careTeam: [
      { id: '1', name: 'Dr. Smith', role: 'Prescriber', initials: 'DS', isActive: true }
    ],
    tags: [
      { id: '1', name: 'Cardiology', color: 'blue', category: 'medical' as const }
    ],
    documents: [],
    comments: []
  };

  return (
    <PrescriptionCard
      id={id}
      type="prescription"
      content={null}
      prescriptionData={samplePrescriptionData}
      handlers={handlers}
      {...baseProps}
    />
  );
}

export function createPrescriptionCard(
  id: string,
  prescriptionData: any,
  baseProps: Omit<BaseCardProps, 'id' | 'type' | 'content'>,
  handlers: CardEventHandlers
): React.ReactElement {
  return (
    <PrescriptionCard
      id={id}
      type="prescription"
      content={null}
      prescriptionData={prescriptionData}
      handlers={handlers}
      {...baseProps}
    />
  );
}
