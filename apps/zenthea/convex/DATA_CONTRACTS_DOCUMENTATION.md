# Zenthea Data Contracts Documentation

This document defines the complete data contracts, schemas, and validation rules for all entities in the Zenthea healthcare platform.

## Table of Contents
- [Core Entities](#core-entities)
- [Data Validation Rules](#data-validation-rules)
- [Relationship Constraints](#relationship-constraints)
- [Tenant Isolation](#tenant-isolation)
- [Security Constraints](#security-constraints)
- [API Data Contracts](#api-data-contracts)
- [Error Response Contracts](#error-response-contracts)

## Core Entities

### User Entity

```typescript
interface User {
  _id: Id<"users">;
  email: string;                    // Unique within tenant, lowercase
  name: string;                     // Required, trimmed
  password: string;                 // Hashed with bcrypt, 12 salt rounds
  role: "admin" | "provider" | "demo";
  tenantId: string;                // Required for tenant isolation
  isActive: boolean;               // Account status, defaults to true
  createdAt: number;               // Unix timestamp
  updatedAt: number;             // Unix timestamp
  lastLoginAt?: number;            // Unix timestamp, optional
  loginAttempts: number;           // Failed login counter
  lockedUntil?: number;            // Account lockout timestamp
}
```

**Validation Rules:**
- Email: Required, unique within tenant, valid format
- Name: Required, 1-100 characters, trimmed
- Password: Required, minimum 8 characters, hashed with bcrypt
- Role: Required, must be one of: admin, provider, demo
- TenantId: Required, non-empty string
- isActive: Boolean, defaults to true

### Patient Entity

```typescript
interface Patient {
  _id: Id<"patients">;
  firstName: string;               // Required, 1-50 characters, trimmed
  lastName: string;                // Required, 1-50 characters, trimmed
  dateOfBirth: number;             // Required, Unix timestamp, must be in past
  email?: string;                  // Optional, unique within tenant, valid format
  phone?: string;                  // Optional, valid phone format
  address?: {                      // Optional address object
    street: string;                // 1-100 characters
    city: string;                  // 1-50 characters
    state: string;                 // 2 characters (US state code)
    zipCode: string;              // 5-10 characters
  };
  insurance?: {                    // Optional insurance object
    provider: string;              // 1-100 characters
    policyNumber: string;          // 1-50 characters
    groupNumber?: string;          // Optional, 1-50 characters
  };
  tenantId: string;                // Required for tenant isolation
  createdAt: number;               // Unix timestamp
  updatedAt: number;               // Unix timestamp
  isActive: boolean;               // Patient status, defaults to true
  emergencyContact?: {             // Optional emergency contact
    name: string;                  // 1-100 characters
    relationship: string;          // 1-50 characters
    phone: string;                 // Valid phone format
  };
  medicalHistory?: string[];       // Optional array of medical conditions
  allergies?: string[];            // Optional array of allergies
  medications?: string[];          // Optional array of current medications
}
```

**Validation Rules:**
- FirstName/LastName: Required, 1-50 characters, trimmed
- DateOfBirth: Required, Unix timestamp, must be in past
- Email: Optional, unique within tenant, valid email format
- Phone: Optional, valid phone format: `^\+?[\d\s\-\(\)]+$`
- Address: Optional, all fields required if provided
- Insurance: Optional, provider and policyNumber required if provided
- TenantId: Required, non-empty string

### Provider Entity

```typescript
interface Provider {
  _id: Id<"providers">;
  firstName: string;               // Required, 1-50 characters, trimmed
  lastName: string;                // Required, 1-50 characters, trimmed
  specialty: string;               // Required, 1-100 characters, trimmed
  email: string;                   // Required, unique within tenant, lowercase
  phone?: string;                  // Optional, valid phone format
  licenseNumber: string;           // Required, 1-50 characters, trimmed
  npi: string;                     // Required, exactly 10 digits, unique within tenant
  tenantId: string;                // Required for tenant isolation
  createdAt: number;               // Unix timestamp
  updatedAt: number;               // Unix timestamp
  isActive: boolean;               // Provider status, defaults to true
  credentials?: string[];          // Optional array of credentials
  languages?: string[];            // Optional array of spoken languages
  availability?: {                 // Optional availability schedule
    monday: { start: string; end: string; }[];
    tuesday: { start: string; end: string; }[];
    wednesday: { start: string; end: string; }[];
    thursday: { start: string; end: string; }[];
    friday: { start: string; end: string; }[];
    saturday: { start: string; end: string; }[];
    sunday: { start: string; end: string; }[];
  };
  notes?: string;                  // Optional provider notes
}
```

**Validation Rules:**
- FirstName/LastName: Required, 1-50 characters, trimmed
- Specialty: Required, 1-100 characters, trimmed
- Email: Required, unique within tenant, valid format, lowercase
- Phone: Optional, valid phone format
- LicenseNumber: Required, 1-50 characters, trimmed
- NPI: Required, exactly 10 digits, unique within tenant
- TenantId: Required, non-empty string

### Appointment Entity

```typescript
interface Appointment {
  _id: Id<"appointments">;
  patientId: Id<"patients">;       // Required, must exist and belong to tenant
  providerId: Id<"providers">;     // Required, must exist and belong to tenant
  scheduledAt: number;              // Required, Unix timestamp, must be in future
  duration: number;                 // Required, 1-480 minutes (8 hours max)
  type: "consultation" | "follow-up" | "procedure" | "emergency";
  status: "scheduled" | "confirmed" | "in-progress" | "completed" | "cancelled";
  notes?: string;                  // Optional appointment notes
  tenantId: string;                // Required for tenant isolation
  createdAt: number;               // Unix timestamp
  updatedAt: number;               // Unix timestamp
  confirmedAt?: number;            // Unix timestamp when confirmed
  startedAt?: number;              // Unix timestamp when started
  completedAt?: number;            // Unix timestamp when completed
  cancelledAt?: number;            // Unix timestamp when cancelled
  cancellationReason?: string;     // Reason for cancellation
  reminderSent?: boolean;           // Reminder notification status
  followUpRequired?: boolean;       // Whether follow-up is needed
  followUpNotes?: string;          // Follow-up instructions
}
```

**Validation Rules:**
- PatientId: Required, must exist and belong to tenant
- ProviderId: Required, must exist and belong to tenant
- ScheduledAt: Required, Unix timestamp, must be in future
- Duration: Required, 1-480 minutes (8 hours max)
- Type: Required, must be one of: consultation, follow-up, procedure, emergency
- Status: Required, must be one of: scheduled, confirmed, in-progress, completed, cancelled
- TenantId: Required, non-empty string

### Medical Record Entity

```typescript
interface MedicalRecord {
  _id: Id<"medicalRecords">;
  patientId: Id<"patients">;       // Required, must exist
  providerId: Id<"providers">;     // Required, must exist
  appointmentId?: Id<"appointments">; // Optional, must exist if provided
  diagnosis: string;                // Required, 1-500 characters
  treatment: string;               // Required, 1-1000 characters
  medications?: string[];          // Optional array of medication names
  notes?: string;                  // Optional additional notes
  tenantId: string;                // Required for tenant isolation
  createdAt: number;               // Unix timestamp
  updatedAt: number;               // Unix timestamp
  isActive: boolean;               // Record status, defaults to true
  followUpRequired?: boolean;       // Whether follow-up is needed
  followUpDate?: number;           // Unix timestamp for follow-up
  attachments?: {                  // Optional file attachments
    id: string;                    // File identifier
    name: string;                  // Original filename
    type: string;                  // MIME type
    size: number;                  // File size in bytes
    url: string;                   // File URL
  }[];
  vitalSigns?: {                   // Optional vital signs
    bloodPressure?: string;        // e.g., "120/80"
    heartRate?: number;           // Beats per minute
    temperature?: number;          // Fahrenheit
    weight?: number;              // Pounds
    height?: number;              // Inches
  };
  labResults?: {                   // Optional lab results
    testName: string;              // Name of the test
    result: string;                // Test result
    normalRange: string;           // Normal range
    units: string;                 // Measurement units
    date: number;                  // Unix timestamp
  }[];
}
```

**Validation Rules:**
- PatientId: Required, must exist
- ProviderId: Required, must exist
- AppointmentId: Optional, must exist if provided
- Diagnosis: Required, 1-500 characters
- Treatment: Required, 1-1000 characters
- Medications: Optional array of strings
- TenantId: Required, non-empty string

## Data Validation Rules

### Common Validation Patterns

#### String Validation
```typescript
// Required string fields
const requiredString = (value: string, minLength: number = 1, maxLength: number = 100) => {
  if (!value || typeof value !== 'string') {
    throw new Error('Field is required');
  }
  const trimmed = value.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    throw new Error(`Field must be between ${minLength} and ${maxLength} characters`);
  }
  return trimmed;
};
```

#### Email Validation
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validateEmail = (email: string) => {
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  return email.toLowerCase();
};
```

#### Phone Validation
```typescript
const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
const validatePhone = (phone: string) => {
  if (!phoneRegex.test(phone)) {
    throw new Error('Invalid phone number format');
  }
  return phone;
};
```

#### NPI Validation
```typescript
const validateNPI = (npi: string) => {
  if (!/^\d{10}$/.test(npi)) {
    throw new Error('NPI must be exactly 10 digits');
  }
  return npi;
};
```

#### Date Validation
```typescript
const validateDate = (date: number, mustBeInPast: boolean = false) => {
  const now = Date.now();
  if (mustBeInPast && date >= now) {
    throw new Error('Date must be in the past');
  }
  if (!mustBeInPast && date <= now) {
    throw new Error('Date must be in the future');
  }
  return date;
};
```

### Entity-Specific Validation

#### Patient Validation
```typescript
const validatePatient = (data: Partial<Patient>) => {
  // Required fields
  if (!data.firstName?.trim()) throw new Error('First name is required');
  if (!data.lastName?.trim()) throw new Error('Last name is required');
  if (!data.dateOfBirth) throw new Error('Date of birth is required');
  if (!data.tenantId) throw new Error('Tenant ID is required');
  
  // Date validation
  if (data.dateOfBirth >= Date.now()) {
    throw new Error('Date of birth must be in the past');
  }
  
  // Email validation
  if (data.email && !emailRegex.test(data.email)) {
    throw new Error('Invalid email format');
  }
  
  // Phone validation
  if (data.phone && !phoneRegex.test(data.phone)) {
    throw new Error('Invalid phone number format');
  }
  
  return data;
};
```

#### Provider Validation
```typescript
const validateProvider = (data: Partial<Provider>) => {
  // Required fields
  if (!data.firstName?.trim()) throw new Error('First name is required');
  if (!data.lastName?.trim()) throw new Error('Last name is required');
  if (!data.specialty?.trim()) throw new Error('Specialty is required');
  if (!data.email?.trim()) throw new Error('Email is required');
  if (!data.licenseNumber?.trim()) throw new Error('License number is required');
  if (!data.npi) throw new Error('NPI is required');
  if (!data.tenantId) throw new Error('Tenant ID is required');
  
  // Email validation
  if (!emailRegex.test(data.email)) {
    throw new Error('Invalid email format');
  }
  
  // NPI validation
  if (!/^\d{10}$/.test(data.npi)) {
    throw new Error('NPI must be exactly 10 digits');
  }
  
  // Phone validation
  if (data.phone && !phoneRegex.test(data.phone)) {
    throw new Error('Invalid phone number format');
  }
  
  return data;
};
```

#### Appointment Validation
```typescript
const validateAppointment = (data: Partial<Appointment>) => {
  // Required fields
  if (!data.patientId) throw new Error('Patient ID is required');
  if (!data.providerId) throw new Error('Provider ID is required');
  if (!data.scheduledAt) throw new Error('Scheduled time is required');
  if (!data.duration) throw new Error('Duration is required');
  if (!data.type) throw new Error('Appointment type is required');
  if (!data.tenantId) throw new Error('Tenant ID is required');
  
  // Date validation
  if (data.scheduledAt <= Date.now()) {
    throw new Error('Appointment must be scheduled in the future');
  }
  
  // Duration validation
  if (data.duration < 1 || data.duration > 480) {
    throw new Error('Duration must be between 1 and 480 minutes');
  }
  
  // Type validation
  const validTypes = ['consultation', 'follow-up', 'procedure', 'emergency'];
  if (!validTypes.includes(data.type)) {
    throw new Error('Invalid appointment type');
  }
  
  return data;
};
```

## Relationship Constraints

### Foreign Key Relationships

#### Patient Relationships
- **Appointments**: One patient can have many appointments
- **Medical Records**: One patient can have many medical records
- **Tenant**: Each patient belongs to exactly one tenant

#### Provider Relationships
- **Appointments**: One provider can have many appointments
- **Medical Records**: One provider can create many medical records
- **Tenant**: Each provider belongs to exactly one tenant

#### Appointment Relationships
- **Patient**: Each appointment belongs to exactly one patient
- **Provider**: Each appointment belongs to exactly one provider
- **Medical Records**: Each appointment can have many medical records
- **Tenant**: Each appointment belongs to exactly one tenant

### Cascade Rules

#### Deletion Constraints
```typescript
// Cannot delete patient if they have appointments
const canDeletePatient = async (patientId: Id<"patients">) => {
  const appointments = await ctx.db
    .query("appointments")
    .withIndex("by_patient", (q) => q.eq("patientId", patientId))
    .collect();
  
  if (appointments.length > 0) {
    throw new Error("Cannot delete patient with existing appointments");
  }
  
  const medicalRecords = await ctx.db
    .query("medicalRecords")
    .withIndex("by_patient", (q) => q.eq("patientId", patientId))
    .collect();
  
  if (medicalRecords.length > 0) {
    throw new Error("Cannot delete patient with existing medical records");
  }
  
  return true;
};
```

#### Update Constraints
```typescript
// Cannot update appointment to conflict with existing appointments
const validateAppointmentTime = async (
  providerId: Id<"providers">,
  scheduledAt: number,
  duration: number,
  excludeId?: Id<"appointments">
) => {
  const existingAppointments = await ctx.db
    .query("appointments")
    .withIndex("by_provider", (q) => q.eq("providerId", providerId))
    .filter((q) => q.neq(q.field("_id"), excludeId))
    .collect();
  
  const endTime = scheduledAt + (duration * 60 * 1000);
  
  for (const appointment of existingAppointments) {
    const existingStart = appointment.scheduledAt;
    const existingEnd = existingStart + (appointment.duration * 60 * 1000);
    
    if (
      (scheduledAt >= existingStart && scheduledAt < existingEnd) ||
      (endTime > existingStart && endTime <= existingEnd) ||
      (scheduledAt <= existingStart && endTime >= existingEnd)
    ) {
      throw new Error("Provider has a scheduling conflict at the requested time");
    }
  }
  
  return true;
};
```

## Tenant Isolation

### Tenant Validation
```typescript
const validateTenantAccess = async (
  entityId: Id<string>,
  entityType: string,
  tenantId: string
) => {
  const entity = await ctx.db.get(entityId);
  if (!entity) {
    throw new Error(`${entityType} not found`);
  }
  
  if (entity.tenantId !== tenantId) {
    throw new Error(`${entityType} does not belong to the specified tenant`);
  }
  
  return entity;
};
```

### Tenant-Scoped Queries
```typescript
// All queries must include tenant filtering
const getPatientsByTenant = async (tenantId: string) => {
  return await ctx.db
    .query("patients")
    .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
    .collect();
};
```

## Security Constraints

### Data Access Controls
```typescript
// Role-based access control
const checkPermission = (userRole: string, action: string, resource: string) => {
  const permissions = {
    admin: ['create', 'read', 'update', 'delete'],
    provider: ['create', 'read', 'update'],
    demo: ['read']
  };
  
  const userPermissions = permissions[userRole] || [];
  if (!userPermissions.includes(action)) {
    throw new Error(`Insufficient permissions for ${action} on ${resource}`);
  }
  
  return true;
};
```

### Audit Logging
```typescript
const logAuditEvent = async (
  userId: string,
  action: string,
  resource: string,
  resourceId: string,
  details?: any
) => {
  await ctx.db.insert("auditLogs", {
    userId,
    action,
    resource,
    resourceId,
    details,
    timestamp: Date.now(),
    ipAddress: ctx.request.headers.get('x-forwarded-for') || 'unknown'
  });
};
```

## API Data Contracts

### Request Contracts

#### Create Patient Request
```typescript
interface CreatePatientRequest {
  firstName: string;               // Required, 1-50 characters
  lastName: string;                // Required, 1-50 characters
  dateOfBirth: number;             // Required, Unix timestamp
  email?: string;                  // Optional, valid email format
  phone?: string;                  // Optional, valid phone format
  address?: {                      // Optional
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  insurance?: {                    // Optional
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
  tenantId: string;                // Required
}
```

#### Update Patient Request
```typescript
interface UpdatePatientRequest {
  id: Id<"patients">;             // Required
  firstName?: string;              // Optional, 1-50 characters
  lastName?: string;               // Optional, 1-50 characters
  dateOfBirth?: number;            // Optional, Unix timestamp
  email?: string;                  // Optional, valid email format
  phone?: string;                  // Optional, valid phone format
  address?: {                      // Optional
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  insurance?: {                    // Optional
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
}
```

### Response Contracts

#### Success Response
```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}
```

#### Error Response
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}
```

#### Paginated Response
```typescript
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

## Error Response Contracts

### Validation Errors
```typescript
interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

interface ValidationErrorResponse {
  success: false;
  error: "Validation failed";
  errors: ValidationError[];
}
```

### Business Logic Errors
```typescript
interface BusinessLogicError {
  success: false;
  error: string;
  code: string;
  details?: any;
}
```

### System Errors
```typescript
interface SystemError {
  success: false;
  error: "Internal server error";
  code: "SYSTEM_ERROR";
  requestId: string;
}
```

This comprehensive data contracts documentation ensures type safety, validation consistency, and clear API contracts for the Zenthea healthcare platform.
