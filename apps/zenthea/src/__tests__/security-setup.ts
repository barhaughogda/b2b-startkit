import { vi } from 'vitest';

// Mock security-sensitive modules
vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('$2b$10$mock.hash.for.testing'),
  compare: vi.fn().mockResolvedValue(true),
}));

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn().mockReturnValue('mock.jwt.token'),
  verify: vi.fn().mockReturnValue({
    userId: 'test-user-123',
    tenantId: 'demo-tenant-123',
    role: 'patient',
  }),
  decode: vi.fn().mockReturnValue({
    userId: 'test-user-123',
    tenantId: 'demo-tenant-123',
    role: 'patient',
  }),
}));

// Security test utilities
export const generateMockJWT = (payload: unknown) => {
  console.log('Generating mock JWT with payload:', payload);
  return 'mock.jwt.token';
};

export const generateExpiredJWT = () => {
  return 'expired.jwt.token';
};

export const generateTamperedJWT = () => {
  return 'tampered.jwt.token';
};

export const generateMalformedJWT = () => {
  return 'malformed.token';
};

// Mock sensitive data for testing
export const mockSensitiveData = {
  ssn: '123-45-6789',
  medicalRecordNumber: 'MRN123456',
  creditCard: '4111-1111-1111-1111',
  password: 'securePassword123',
};

// Sanitized versions for testing
export const mockSanitizedData = {
  ssn: '***-**-6789',
  medicalRecordNumber: 'MRN***456',
  creditCard: '****-****-****-1111',
  password: '***************',
};
