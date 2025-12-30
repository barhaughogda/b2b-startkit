// Demo data service for mock data in demo mode
import { faker } from '@faker-js/faker';

// Set faker seed for consistent demo data
faker.seed(12345);

export interface DemoPatient {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  insurance: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalHistory: string[];
  allergies: string[];
  medications: string[];
}

export interface DemoAppointment {
  id: string;
  patientId: string;
  providerId: string;
  date: string;
  time: string;
  duration: number;
  type: 'consultation' | 'follow-up' | 'checkup' | 'urgent';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
  location: string;
}

export interface DemoMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  attachments?: string[];
}

export interface DemoProvider {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  licenseNumber: string;
  npi: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  availability: {
    monday: string[];
    tuesday: string[];
    wednesday: string[];
    thursday: string[];
    friday: string[];
  };
}

// Generate demo patients
export function generateDemoPatients(count: number = 20): DemoPatient[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `demo-patient-${i + 1}`,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    dateOfBirth: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }).toISOString().split('T')[0]!,
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode(),
    },
    insurance: {
      provider: faker.helpers.arrayElement(['Blue Cross Blue Shield', 'Aetna', 'Cigna', 'UnitedHealth', 'Humana']),
      policyNumber: faker.string.alphanumeric(10).toUpperCase(),
      groupNumber: faker.string.alphanumeric(8).toUpperCase(),
    },
    emergencyContact: {
      name: faker.person.fullName(),
      phone: faker.phone.number(),
      relationship: faker.helpers.arrayElement(['Spouse', 'Parent', 'Child', 'Sibling', 'Friend']),
    },
    medicalHistory: faker.helpers.arrayElements([
      'Hypertension', 'Diabetes', 'Asthma', 'High Cholesterol', 'Arthritis',
      'Heart Disease', 'Depression', 'Anxiety', 'Migraine', 'Allergies'
    ], { min: 0, max: 3 }),
    allergies: faker.helpers.arrayElements([
      'Penicillin', 'Latex', 'Shellfish', 'Nuts', 'Dairy', 'Pollen', 'Dust'
    ], { min: 0, max: 2 }),
    medications: faker.helpers.arrayElements([
      'Lisinopril', 'Metformin', 'Atorvastatin', 'Albuterol', 'Lisinopril',
      'Omeprazole', 'Levothyroxine', 'Amlodipine', 'Metoprolol', 'Simvastatin'
    ], { min: 0, max: 3 }),
  }));
}

// Generate demo providers
export function generateDemoProviders(count: number = 10): DemoProvider[] {
  const specialties = [
    'Internal Medicine', 'Cardiology', 'Dermatology', 'Pediatrics', 'Orthopedics',
    'Neurology', 'Oncology', 'Psychiatry', 'Radiology', 'Emergency Medicine'
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `demo-provider-${i + 1}`,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    specialty: faker.helpers.arrayElement(specialties),
    licenseNumber: faker.string.alphanumeric(8).toUpperCase(),
    npi: faker.string.numeric(10),
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode(),
    },
    availability: {
      monday: ['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM'],
      tuesday: ['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM'],
      wednesday: ['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM'],
      thursday: ['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM'],
      friday: ['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM'],
    },
  }));
}

// Generate demo appointments
export function generateDemoAppointments(patients: DemoPatient[], providers: DemoProvider[], count: number = 50): DemoAppointment[] {
  const types: DemoAppointment['type'][] = ['consultation', 'follow-up', 'checkup', 'urgent'];
  const statuses: DemoAppointment['status'][] = ['scheduled', 'confirmed', 'completed', 'cancelled'];
  const locations = ['Main Clinic', 'Downtown Office', 'Urgent Care Center', 'Telemedicine'];

  return Array.from({ length: count }, (_, i) => {
    const patient = faker.helpers.arrayElement(patients);
    const provider = faker.helpers.arrayElement(providers);
    const date = faker.date.future();
    
    return {
      id: `demo-appointment-${i + 1}`,
      patientId: patient.id,
      providerId: provider.id,
      date: date.toISOString().split('T')[0]!,
      time: faker.helpers.arrayElement(['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM']),
      duration: faker.helpers.arrayElement([30, 45, 60]),
      type: faker.helpers.arrayElement(types),
      status: faker.helpers.arrayElement(statuses),
      notes: faker.lorem.sentence(),
      location: faker.helpers.arrayElement(locations),
    };
  });
}

// Generate demo messages
export function generateDemoMessages(patients: DemoPatient[], providers: DemoProvider[], count: number = 100): DemoMessage[] {
  return Array.from({ length: count }, (_, i) => {
    const isFromPatient = faker.datatype.boolean();
    const sender = isFromPatient ? faker.helpers.arrayElement(patients) : faker.helpers.arrayElement(providers);
    const recipient = isFromPatient ? faker.helpers.arrayElement(providers) : faker.helpers.arrayElement(patients);
    
    return {
      id: `demo-message-${i + 1}`,
      threadId: `demo-thread-${Math.floor(i / 5) + 1}`, // Group messages into threads
      senderId: sender.id,
      senderName: sender.name,
      recipientId: recipient.id,
      content: faker.lorem.paragraph(),
      timestamp: faker.date.recent().toISOString(),
      isRead: faker.datatype.boolean(),
      attachments: faker.datatype.boolean() ? [faker.system.fileName()] : undefined,
    };
  });
}

// Demo data cache
let demoDataCache: {
  patients: DemoPatient[];
  providers: DemoProvider[];
  appointments: DemoAppointment[];
  messages: DemoMessage[];
} | null = null;

export function getDemoData() {
  if (!demoDataCache) {
    const patients = generateDemoPatients(20);
    const providers = generateDemoProviders(10);
    const appointments = generateDemoAppointments(patients, providers, 50);
    const messages = generateDemoMessages(patients, providers, 100);
    
    demoDataCache = {
      patients,
      providers,
      appointments,
      messages,
    };
  }
  
  return demoDataCache;
}

// Clear demo data cache (useful for testing)
export function clearDemoDataCache() {
  demoDataCache = null;
}
