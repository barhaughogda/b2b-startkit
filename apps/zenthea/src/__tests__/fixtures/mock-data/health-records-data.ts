// Mock health records data for testing (no real PHI)
export const mockVitals = [
  {
    id: 'vital-001',
    date: '2024-01-15',
    bloodPressure: '120/80',
    heartRate: 72,
    temperature: 98.6,
    weight: 175,
    height: "5'10\"",
    bmi: 25.1,
    recordedBy: 'Dr. Sarah Johnson',
    notes: 'Patient reports feeling well'
  }
];

export const mockLabResults = [
  {
    id: 'lab-001',
    date: '2024-01-10',
    testName: 'Complete Blood Count',
    testCode: 'CBC',
    results: {
      hemoglobin: '14.2 g/dL',
      hematocrit: '42%',
      whiteBloodCells: '7.2 K/μL'
    },
    status: 'normal',
    provider: 'Dr. Sarah Johnson',
    labName: 'Quest Diagnostics',
    attachments: [
      {
        id: 'att-001',
        name: 'lab-results.pdf',
        type: 'application/pdf',
        size: 245760
      }
    ]
  }
];

export const mockMedications = [
  {
    id: 'med-001',
    name: 'Lisinopril',
    genericName: 'Lisinopril',
    dosage: '10mg',
    frequency: 'Once daily',
    startDate: '2023-12-01',
    prescriber: 'Dr. Sarah Johnson',
    status: 'active',
    instructions: 'Take with food',
    sideEffects: ['Dry cough', 'Dizziness'],
    interactions: []
  }
];

export const mockAllergies = [
  {
    id: 'allergy-001',
    allergen: 'Penicillin',
    severity: 'Moderate',
    reaction: 'Rash',
    dateReported: '2023-11-15',
    reportedBy: 'Dr. Sarah Johnson'
  }
];

export const mockVisitSummaries = [
  {
    id: 'visit-001',
    date: '2024-01-15',
    provider: 'Dr. Sarah Johnson',
    type: 'Annual Physical',
    diagnosis: ['Hypertension', 'Type 2 Diabetes'],
    procedures: ['Blood pressure check', 'Weight measurement'],
    medications: ['Lisinopril 10mg daily'],
    followUp: 'Return in 3 months',
    notes: 'Patient doing well on current medication'
  }
];

export const mockHealthRecords = {
  vitals: mockVitals,
  labResults: mockLabResults,
  medications: mockMedications,
  allergies: mockAllergies,
  visitSummaries: mockVisitSummaries
};
