// Mock patient data for testing (no real PHI)
export const generateMockPatient = (tenantId: string = 'demo-tenant-123') => ({
  _id: `patient-${Math.random().toString(36).substr(2, 9)}`,
  tenantId,
  email: `patient${Math.random().toString(36).substr(2, 5)}@example.com`,
  passwordHash: '$2b$10$mock.hash.for.testing.purposes',
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1985-03-20',
  phone: '+1-555-0123',
  address: {
    street: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zipCode: '12345',
    country: 'US'
  },
  emergencyContact: {
    name: 'Jane Doe',
    relationship: 'Spouse',
    phone: '+1-555-0124',
    email: 'jane.doe@example.com'
  },
  insurance: {
    provider: 'Blue Cross Blue Shield',
    memberId: 'BC123456789',
    groupNumber: 'GRP001'
  },
  status: 'active',
  createdAt: Date.now(),
  updatedAt: Date.now()
});

export const generateMockPatients = (tenantId: string, count: number) => 
  Array.from({ length: count }, () => generateMockPatient(tenantId));

export const mockPatientProfile = {
  id: 'patient-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'patient@example.com',
  dateOfBirth: '1985-03-20',
  phone: '+1-555-0123',
  address: {
    street: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zipCode: '12345'
  },
  emergencyContact: {
    name: 'Jane Doe',
    relationship: 'Spouse',
    phone: '+1-555-0124'
  },
  insurance: {
    provider: 'Blue Cross Blue Shield',
    memberId: 'BC123456789',
    groupNumber: 'GRP001'
  }
};

export const mockPatientCredentials = {
  email: 'patient@example.com',
  password: 'securePassword123',
  tenantId: 'demo-tenant-123'
};

export const mockPatientRegistration = {
  email: 'newpatient@example.com',
  password: 'securePassword123',
  firstName: 'Jane',
  lastName: 'Smith',
  dateOfBirth: '1990-01-15',
  phone: '+1-555-0125',
  tenantId: 'demo-tenant-123'
};
