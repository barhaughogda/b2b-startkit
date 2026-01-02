# Zenthea CRUD API Documentation

This document provides comprehensive documentation for all CRUD operations available in the Zenthea Convex backend.

## Table of Contents
- [Authentication](#authentication)
- [Patients API](#patients-api)
- [Providers API](#providers-api)
- [Appointments API](#appointments-api)
- [Medical Records API](#medical-records-api)
- [Users API](#users-api)
- [Error Handling](#error-handling)
- [Data Validation](#data-validation)

## Authentication

All mutations require proper authentication and tenant isolation. Users must be authenticated and belong to the specified tenant.

## Patients API

### Create Patient
**Mutation:** `patients.createPatient`

**Parameters:**
```typescript
{
  firstName: string;           // Required, trimmed
  lastName: string;            // Required, trimmed
  dateOfBirth: number;         // Required, must be in the past
  email?: string;              // Optional, must be valid email format
  phone?: string;              // Optional, must match phone regex
  address?: {                  // Optional
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  insurance?: {                // Optional
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
  tenantId: string;           // Required for tenant isolation
}
```

**Returns:** `Id<"patients">`

**Validation Rules:**
- First name and last name are required and cannot be empty
- Date of birth must be in the past
- Email must be unique within the tenant
- Phone number must match format: `^\+?[\d\s\-\(\)]+$`
- Email must match format: `^[^\s@]+@[^\s@]+\.[^\s@]+$`

**Errors:**
- `"First name is required"`
- `"Last name is required"`
- `"Tenant ID is required"`
- `"Date of birth must be in the past"`
- `"Patient with this email already exists in this tenant"`
- `"Invalid phone number format"`
- `"Invalid email format"`

### Get Patient
**Query:** `patients.getPatient`

**Parameters:**
```typescript
{
  id: Id<"patients">;
}
```

**Returns:** `Patient | null`

### Search Patients
**Query:** `patients.searchPatients`

**Parameters:**
```typescript
{
  searchTerm: string;
  limit?: number;              // Default: 20
}
```

**Returns:** `Patient[]`

**Search Logic:** Searches by first name, last name, or email (case-insensitive)

### Update Patient
**Mutation:** `patients.updatePatient`

**Parameters:**
```typescript
{
  id: Id<"patients">;
  firstName?: string;          // Optional, trimmed if provided
  lastName?: string;           // Optional, trimmed if provided
  dateOfBirth?: number;       // Optional, must be in the past
  email?: string;             // Optional, must be valid email format
  phone?: string;             // Optional, must match phone regex
  address?: {                 // Optional
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  insurance?: {               // Optional
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
}
```

**Returns:** `void`

**Validation Rules:**
- Patient must exist
- Updated fields follow same validation as create
- Email must be unique within tenant (excluding current patient)
- Date of birth must be in the past if provided

**Errors:**
- `"Patient not found"`
- `"First name cannot be empty"`
- `"Last name cannot be empty"`
- `"Date of birth must be in the past"`
- `"Another patient with this email already exists in this tenant"`
- `"Invalid phone number format"`
- `"Invalid email format"`

### Delete Patient
**Mutation:** `patients.deletePatient`

**Parameters:**
```typescript
{
  id: Id<"patients">;
}
```

**Returns:** `void`

**Validation Rules:**
- Patient must exist
- Cannot delete if patient has existing appointments
- Cannot delete if patient has existing medical records

**Errors:**
- `"Patient not found"`
- `"Cannot delete patient with existing appointments. Please cancel or complete all appointments first."`
- `"Cannot delete patient with existing medical records. Please archive or transfer records first."`

### List Patients
**Query:** `patients.listPatients`

**Parameters:**
```typescript
{
  limit?: number;              // Default: 50
}
```

**Returns:** `Patient[]`

## Providers API

### Create Provider
**Mutation:** `providers.createProvider`

**Parameters:**
```typescript
{
  firstName: string;           // Required, trimmed
  lastName: string;            // Required, trimmed
  specialty: string;           // Required, trimmed
  email: string;               // Required, must be valid email format
  phone?: string;              // Optional, must match phone regex
  licenseNumber: string;       // Required, trimmed
  npi: string;                 // Required, exactly 10 digits
  tenantId: string;            // Required for tenant isolation
}
```

**Returns:** `Id<"providers">`

**Validation Rules:**
- All required fields must be provided and non-empty
- Email must be unique within tenant
- NPI must be exactly 10 digits and unique within tenant
- Email is converted to lowercase
- Phone number must match format: `^\+?[\d\s\-\(\)]+$`

**Errors:**
- `"First name is required"`
- `"Last name is required"`
- `"Specialty is required"`
- `"Email is required"`
- `"License number is required"`
- `"NPI is required"`
- `"Tenant ID is required"`
- `"Invalid email format"`
- `"NPI must be exactly 10 digits"`
- `"Provider with this email already exists in this tenant"`
- `"Provider with this NPI already exists in this tenant"`
- `"Invalid phone number format"`

### Get Provider
**Query:** `providers.getProvider`

**Parameters:**
```typescript
{
  id: Id<"providers">;
}
```

**Returns:** `Provider | null`

### Get Provider by Email
**Query:** `providers.getProviderByEmail`

**Parameters:**
```typescript
{
  email: string;
}
```

**Returns:** `Provider | null`

### Get Providers by Specialty
**Query:** `providers.getProvidersBySpecialty`

**Parameters:**
```typescript
{
  specialty: string;
}
```

**Returns:** `Provider[]`

### Update Provider
**Mutation:** `providers.updateProvider`

**Parameters:**
```typescript
{
  id: Id<"providers">;
  firstName?: string;          // Optional, trimmed if provided
  lastName?: string;           // Optional, trimmed if provided
  specialty?: string;          // Optional, trimmed if provided
  email?: string;              // Optional, must be valid email format
  phone?: string;              // Optional, must match phone regex
  licenseNumber?: string;      // Optional, trimmed if provided
  npi?: string;                // Optional, exactly 10 digits
}
```

**Returns:** `void`

**Validation Rules:**
- Provider must exist
- Updated fields follow same validation as create
- Email must be unique within tenant (excluding current provider)
- NPI must be exactly 10 digits and unique within tenant

### Delete Provider
**Mutation:** `providers.deleteProvider`

**Parameters:**
```typescript
{
  id: Id<"providers">;
}
```

**Returns:** `void`

### List Providers
**Query:** `providers.listProviders`

**Parameters:**
```typescript
{
  limit?: number;              // Default: 50
}
```

**Returns:** `Provider[]`

## Appointments API

### Create Appointment
**Mutation:** `appointments.createAppointment`

**Parameters:**
```typescript
{
  patientId: Id<"patients">;   // Required, must exist and belong to tenant
  providerId: Id<"providers">; // Required, must exist and belong to tenant
  scheduledAt: number;      // Required, must be in the future
  duration: number;            // Required, 1-480 minutes (8 hours max)
  type: "consultation" | "follow-up" | "procedure" | "emergency";
  notes?: string;              // Optional
  tenantId: string;            // Required for tenant isolation
}
```

**Returns:** `Id<"appointments">`

**Validation Rules:**
- Patient and provider must exist and belong to the same tenant
- Scheduled time must be in the future
- Duration must be between 1 and 480 minutes (8 hours)
- No scheduling conflicts with provider's existing appointments
- Automatically sets status to "scheduled"

**Errors:**
- `"Tenant ID is required"`
- `"Duration must be greater than 0"`
- `"Duration cannot exceed 8 hours"`
- `"Patient not found"`
- `"Patient does not belong to the specified tenant"`
- `"Provider not found"`
- `"Provider does not belong to the specified tenant"`
- `"Appointment must be scheduled in the future"`
- `"Provider has a scheduling conflict at the requested time"`

### Get Appointment
**Query:** `appointments.getAppointment`

**Parameters:**
```typescript
{
  id: Id<"appointments">;
}
```

**Returns:** `Appointment | null`

### Get Appointments by Patient
**Query:** `appointments.getAppointmentsByPatient`

**Parameters:**
```typescript
{
  patientId: Id<"patients">;
}
```

**Returns:** `Appointment[]`

### Get Appointments by Provider
**Query:** `appointments.getAppointmentsByProvider`

**Parameters:**
```typescript
{
  providerId: Id<"providers">;
}
```

**Returns:** `Appointment[]`

### Get Appointments by Date Range
**Query:** `appointments.getAppointmentsByDateRange`

**Parameters:**
```typescript
{
  startDate: number;
  endDate: number;
}
```

**Returns:** `Appointment[]`

### Update Appointment Status
**Mutation:** `appointments.updateAppointmentStatus`

**Parameters:**
```typescript
{
  id: Id<"appointments">;
  status: "scheduled" | "confirmed" | "in-progress" | "completed" | "cancelled";
}
```

**Returns:** `void`

### Update Appointment
**Mutation:** `appointments.updateAppointment`

**Parameters:**
```typescript
{
  id: Id<"appointments">;
  scheduledAt?: number;        // Optional, must be in the future
  duration?: number;          // Optional, 1-480 minutes
  type?: "consultation" | "follow-up" | "procedure" | "emergency";
  status?: "scheduled" | "confirmed" | "in-progress" | "completed" | "cancelled";
  notes?: string;             // Optional
}
```

**Returns:** `void`

### Delete Appointment
**Mutation:** `appointments.deleteAppointment`

**Parameters:**
```typescript
{
  id: Id<"appointments">;
}
```

**Returns:** `void`

### List Appointments
**Query:** `appointments.listAppointments`

**Parameters:**
```typescript
{
  limit?: number;              // Default: 50
}
```

**Returns:** `Appointment[]`

## Medical Records API

### Create Medical Record
**Mutation:** `medicalRecords.createMedicalRecord`

**Parameters:**
```typescript
{
  patientId: Id<"patients">;   // Required, must exist
  providerId: Id<"providers">; // Required, must exist
  appointmentId?: Id<"appointments">; // Optional, must exist if provided
  diagnosis: string;           // Required
  treatment: string;           // Required
  medications?: string[];      // Optional array of medication names
  notes?: string;             // Optional
  tenantId: string;            // Required for tenant isolation
}
```

**Returns:** `Id<"medicalRecords">`

### Get Medical Record
**Query:** `medicalRecords.getMedicalRecord`

**Parameters:**
```typescript
{
  id: Id<"medicalRecords">;
}
```

**Returns:** `MedicalRecord | null`

### Get Medical Records by Patient
**Query:** `medicalRecords.getMedicalRecordsByPatient`

**Parameters:**
```typescript
{
  patientId: Id<"patients">;
}
```

**Returns:** `MedicalRecord[]`

### Get Medical Records by Provider
**Query:** `medicalRecords.getMedicalRecordsByProvider`

**Parameters:**
```typescript
{
  providerId: Id<"providers">;
}
```

**Returns:** `MedicalRecord[]`

### Get Medical Records by Appointment
**Query:** `medicalRecords.getMedicalRecordsByAppointment`

**Parameters:**
```typescript
{
  appointmentId: Id<"appointments">;
}
```

**Returns:** `MedicalRecord[]`

### Update Medical Record
**Mutation:** `medicalRecords.updateMedicalRecord`

**Parameters:**
```typescript
{
  id: Id<"medicalRecords">;
  diagnosis?: string;          // Optional
  treatment?: string;         // Optional
  medications?: string[];     // Optional
  notes?: string;            // Optional
}
```

**Returns:** `void`

### Delete Medical Record
**Mutation:** `medicalRecords.deleteMedicalRecord`

**Parameters:**
```typescript
{
  id: Id<"medicalRecords">;
}
```

**Returns:** `void`

### List Medical Records
**Query:** `medicalRecords.listMedicalRecords`

**Parameters:**
```typescript
{
  limit?: number;              // Default: 50
}
```

**Returns:** `MedicalRecord[]`

## Users API

### Create User
**Mutation:** `users.createUser`

**Parameters:**
```typescript
{
  email: string;               // Required, must be unique within tenant
  name: string;                // Required
  password: string;            // Required, will be hashed
  role: "admin" | "provider" | "demo";
  tenantId?: string;           // Optional, defaults to empty string
}
```

**Returns:** `Id<"users">`

**Validation Rules:**
- Email must be unique within tenant
- Password is hashed using bcrypt
- User is automatically set as active

**Errors:**
- `"User already exists"`

### Authenticate User
**Mutation:** `users.authenticateUser`

**Parameters:**
```typescript
{
  email: string;
  password: string;
  tenantId?: string;           // Optional, defaults to empty string
}
```

**Returns:**
```typescript
{
  success: boolean;
  userId: Id<"users">;
  email: string;
  name: string;
  role: "admin" | "provider" | "demo";
  tenantId?: string;
}
```

**Errors:**
- `"Invalid credentials"`

### Get User by Email
**Query:** `users.getUserByEmail`

**Parameters:**
```typescript
{
  email: string;
  tenantId?: string;           // Optional, defaults to empty string
}
```

**Returns:** `User | null`

### Get User
**Query:** `users.getUser`

**Parameters:**
```typescript
{
  id: Id<"users">;
}
```

**Returns:** `User | null`

### Update User
**Mutation:** `users.updateUser`

**Parameters:**
```typescript
{
  id: Id<"users">;
  name?: string;               // Optional
  role?: "admin" | "provider" | "demo";
  isActive?: boolean;         // Optional
  password?: string;          // Optional, will be hashed if provided
}
```

**Returns:** `void`

### Delete User
**Mutation:** `users.deleteUser`

**Parameters:**
```typescript
{
  id: Id<"users">;
}
```

**Returns:** `void`

### List Users
**Query:** `users.listUsers`

**Parameters:** None

**Returns:** `User[]`

## Error Handling

All mutations include comprehensive error handling with descriptive error messages. Common error patterns:

1. **Validation Errors**: Clear messages about what validation failed
2. **Business Logic Errors**: Messages about business rule violations
3. **Relationship Errors**: Messages about foreign key constraints
4. **System Errors**: Generic error messages for unexpected failures

## Data Validation

### Common Validation Rules

1. **Required Fields**: All required fields are validated for presence and non-empty values
2. **String Trimming**: String fields are automatically trimmed
3. **Email Validation**: Uses regex pattern `^[^\s@]+@[^\s@]+\.[^\s@]+$`
4. **Phone Validation**: Uses regex pattern `^\+?[\d\s\-\(\)]+$`
5. **NPI Validation**: Must be exactly 10 digits
6. **Date Validation**: Dates must be in the past for birth dates, future for appointments
7. **Duration Validation**: Appointments must be 1-480 minutes (8 hours max)
8. **Uniqueness**: Email and NPI must be unique within tenant
9. **Relationship Validation**: Foreign key relationships are validated
10. **Tenant Isolation**: All operations respect tenant boundaries

### Business Rules

1. **Cascade Deletion Prevention**: Cannot delete entities with related records
2. **Scheduling Conflicts**: Appointments cannot overlap for the same provider
3. **Tenant Isolation**: All operations are scoped to the specified tenant
4. **Status Transitions**: Appointment status changes are validated
5. **Data Integrity**: All foreign key relationships are maintained

## Performance Considerations

1. **Indexing**: All queries use appropriate indexes for optimal performance
2. **Pagination**: List operations support limit parameters
3. **Filtering**: Queries use indexes for efficient filtering
4. **Atomic Operations**: All mutations are atomic by design
5. **Real-time Updates**: All queries support real-time subscriptions
