# Patient Portal API Documentation

## Overview

The Patient Portal API provides secure, tenant-scoped access for patients to view their health information, schedule appointments, and communicate with their healthcare providers. This API implements HIPAA-compliant data handling with tenant isolation and comprehensive security measures.

## Base URL

```
https://your-domain.com/api
```

## Authentication

All API endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt-token>
```

### Tenant Isolation

All requests must include the tenant ID in the `X-Tenant-ID` header:

```
X-Tenant-ID: your-tenant-id
```

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute per IP
- **General API endpoints**: 100 requests per minute per user
- **File upload endpoints**: 10 requests per minute per user

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123456789"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Missing or invalid authentication token
- `INVALID_TENANT`: Tenant access denied
- `VALIDATION_ERROR`: Input validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `PATIENT_NOT_FOUND`: Patient record not found
- `INTERNAL_SERVER_ERROR`: Server error

## API Endpoints

### Authentication

#### POST `/api/auth/patient/login`

Patient login with email/password authentication.

**Request:**
```json
{
  "email": "patient@example.com",
  "password": "securePassword123",
  "tenantId": "clinic-123"
}
```

**Response:**
```json
{
  "success": true,
  "patient": {
    "id": "patient-456",
    "email": "patient@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "tenantId": "clinic-123"
  },
  "token": "jwt-token-here"
}
```

#### POST `/api/auth/patient/register`

Patient registration with tenant validation.

**Request:**
```json
{
  "email": "newpatient@example.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Smith",
  "dateOfBirth": "1990-01-15",
  "phone": "+1234567890",
  "tenantId": "clinic-123"
}
```

**Response:**
```json
{
  "success": true,
  "patient": {
    "id": "patient-789",
    "email": "newpatient@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "tenantId": "clinic-123"
  },
  "token": "jwt-token-here"
}
```

### Patient Profile

#### GET `/api/patient/profile`

Retrieve patient profile information.

**Headers:**
```
Authorization: Bearer <jwt-token>
X-Tenant-ID: clinic-123
```

**Response:**
```json
{
  "id": "patient-456",
  "firstName": "John",
  "lastName": "Doe",
  "email": "patient@example.com",
  "dateOfBirth": "1985-03-20",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zipCode": "12345"
  },
  "emergencyContact": {
    "name": "Jane Doe",
    "relationship": "Spouse",
    "phone": "+1987654321"
  },
  "insurance": {
    "provider": "Blue Cross Blue Shield",
    "memberId": "BC123456789",
    "groupNumber": "GRP001"
  },
  "status": "active",
  "lastLogin": 1705312200000,
  "createdAt": 1705312200000,
  "updatedAt": 1705312200000
}
```

#### PUT `/api/patient/profile`

Update patient profile information.

**Request:**
```json
{
  "phone": "+1234567890",
  "address": {
    "street": "456 Oak Ave",
    "city": "Newtown",
    "state": "CA",
    "zipCode": "54321"
  },
  "emergencyContact": {
    "name": "John Smith",
    "relationship": "Brother",
    "phone": "+1987654321"
  }
}
```

**Response:**
```json
{
  "success": true,
  "patient": {
    "id": "patient-456",
    "firstName": "John",
    "lastName": "Doe",
    "email": "patient@example.com",
    "dateOfBirth": "1985-03-20",
    "phone": "+1234567890",
    "address": {
      "street": "456 Oak Ave",
      "city": "Newtown",
      "state": "CA",
      "zipCode": "54321"
    },
    "emergencyContact": {
      "name": "John Smith",
      "relationship": "Brother",
      "phone": "+1987654321"
    },
    "status": "active",
    "lastLogin": 1705312200000,
    "createdAt": 1705312200000,
    "updatedAt": 1705312200000
  }
}
```

### Appointments

#### GET `/api/patient/appointments`

Retrieve patient's appointment history and upcoming appointments.

**Query Parameters:**
- `status`: `upcoming`, `past`, `all` (default: `all`)
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "appointments": [
    {
      "id": "apt-789",
      "date": "2024-02-15",
      "time": "10:00 AM",
      "provider": {
        "id": "provider-123",
        "name": "Dr. Sarah Johnson",
        "specialty": "Internal Medicine"
      },
      "type": "Follow-up",
      "status": "confirmed",
      "location": "Main Office",
      "notes": "Annual checkup",
      "duration": 30,
      "createdAt": 1705312200000,
      "updatedAt": 1705312200000
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

#### POST `/api/patient/appointments`

Schedule a new appointment.

**Request:**
```json
{
  "providerId": "provider-123",
  "date": "2024-02-20",
  "time": "2:00 PM",
  "type": "Consultation",
  "reason": "Annual physical examination",
  "preferredLocation": "Main Office"
}
```

**Response:**
```json
{
  "success": true,
  "appointment": {
    "id": "apt-790",
    "date": "2024-02-20",
    "time": "2:00 PM",
    "status": "pending_confirmation",
    "confirmationCode": "APT-2024-020"
  }
}
```

### Health Records

#### GET `/api/patient/health-records`

Retrieve patient's health records.

**Query Parameters:**
- `type`: `vitals`, `lab-results`, `medications`, `allergies`, `visit-summaries`, `all`
- `dateFrom`: Start date filter (ISO format)
- `dateTo`: End date filter (ISO format)
- `provider`: Filter by specific provider
- `status`: Filter by result status

**Response:**
```json
{
  "vitals": [
    {
      "id": "vital-001",
      "date": "2024-01-15",
      "bloodPressure": "120/80",
      "heartRate": 72,
      "temperature": 98.6,
      "weight": 175,
      "height": "5'10\"",
      "bmi": 25.1,
      "recordedBy": "Dr. Sarah Johnson",
      "notes": "Patient reports feeling well"
    }
  ],
  "labResults": [
    {
      "id": "lab-001",
      "date": "2024-01-10",
      "testName": "Complete Blood Count",
      "testCode": "CBC",
      "results": {
        "hemoglobin": "14.2 g/dL",
        "hematocrit": "42%",
        "whiteBloodCells": "7.2 K/μL"
      },
      "status": "normal",
      "provider": "Dr. Sarah Johnson",
      "labName": "Quest Diagnostics",
      "attachments": [
        {
          "id": "att-001",
          "name": "lab-results.pdf",
          "type": "application/pdf",
          "size": 245760
        }
      ]
    }
  ],
  "medications": [
    {
      "id": "med-001",
      "name": "Lisinopril",
      "genericName": "Lisinopril",
      "dosage": "10mg",
      "frequency": "Once daily",
      "startDate": "2023-12-01",
      "prescriber": "Dr. Sarah Johnson",
      "status": "active",
      "instructions": "Take with food",
      "sideEffects": ["Dry cough", "Dizziness"],
      "interactions": []
    }
  ],
  "allergies": [
    {
      "id": "allergy-001",
      "allergen": "Penicillin",
      "severity": "Moderate",
      "reaction": "Rash",
      "dateReported": "2023-11-15",
      "reportedBy": "Dr. Sarah Johnson"
    }
  ],
  "visitSummaries": [
    {
      "id": "visit-001",
      "date": "2024-01-15",
      "provider": "Dr. Sarah Johnson",
      "type": "Annual Physical",
      "diagnosis": ["Hypertension", "Type 2 Diabetes"],
      "procedures": ["Blood pressure check", "Weight measurement"],
      "medications": ["Lisinopril 10mg daily"],
      "followUp": "Return in 3 months",
      "notes": "Patient doing well on current medication"
    }
  ]
}
```

## Security Features

### Tenant Isolation

- All database queries include `tenantId` filtering
- Row-level security policies enforce tenant boundaries
- API endpoints validate tenant membership
- Cross-tenant data access is prevented

### Authentication & Authorization

- JWT tokens include tenant context
- Role-based access control (RBAC) for patient permissions
- Session management with secure cookie handling
- Token expiration and refresh mechanisms

### Data Protection

- All sensitive data encrypted at rest
- HTTPS enforcement for all communications
- Input validation and sanitization
- HIPAA-compliant data handling
- Audit logging for all data access

### Rate Limiting

- Per-endpoint rate limiting
- IP-based and user-based limits
- Sliding window implementation
- Graceful degradation

## Testing

### Unit Tests

Run the test suite:

```bash
npm test
```

### Integration Tests

Test API endpoints:

```bash
npm run test:integration
```

### Security Tests

Validate security measures:

```bash
npm run test:security
```

## Deployment

### Environment Variables

```bash
# Database
CONVEX_DEPLOYMENT_URL=your-convex-url
CONVEX_DEPLOYMENT_KEY=your-convex-key

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com

# Tenant Configuration
DEFAULT_TENANT_ID=demo-tenant
TENANT_BRANDING_BUCKET=zenthea-tenant-assets
```

### Health Checks

- Database connectivity
- Authentication service status
- Tenant configuration loading
- External service dependencies

## Monitoring & Logging

### Key Metrics

- Authentication success/failure rates
- API response times
- Tenant-specific usage patterns
- Error rates by endpoint

### Logging Strategy

- Structured JSON logging
- Tenant-scoped log entries
- Security event logging
- Performance monitoring

## Support

For API support and questions:

- **Documentation**: [API Docs](https://docs.zenthea.com)
- **Support**: [support@zenthea.com](mailto:support@zenthea.com)
- **Status**: [Status Page](https://status.zenthea.com)
