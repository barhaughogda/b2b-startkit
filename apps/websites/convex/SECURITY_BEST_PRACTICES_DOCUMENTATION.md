# Zenthea Security Best Practices Documentation

This document outlines comprehensive security best practices, guidelines, and implementation details for the Zenthea healthcare platform.

## Table of Contents
- [Security Architecture](#security-architecture)
- [Authentication Security](#authentication-security)
- [Data Protection](#data-protection)
- [API Security](#api-security)
- [Infrastructure Security](#infrastructure-security)
- [Compliance & Regulations](#compliance--regulations)
- [Security Monitoring](#security-monitoring)
- [Incident Response](#incident-response)
- [Security Testing](#security-testing)
- [Development Guidelines](#development-guidelines)

## Security Architecture

### Defense in Depth Strategy

Zenthea implements a multi-layered security approach:

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   Input         │  │   Business      │  │   Output     │  │
│  │   Validation    │  │   Logic         │  │   Sanitization│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Layer                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   JWT Tokens    │  │   Session       │  │   Role-Based │  │
│  │   Management    │  │   Management    │  │   Access Ctrl│  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   Encryption    │  │   Tenant        │  │   Audit       │  │
│  │   at Rest       │  │   Isolation     │  │   Logging     │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   HTTPS/TLS     │  │   Firewall      │  │   Monitoring │  │
│  │   Encryption    │  │   Rules         │  │   & Alerting │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Security Principles

1. **Least Privilege**: Users and systems have minimum necessary access
2. **Zero Trust**: Never trust, always verify
3. **Defense in Depth**: Multiple security layers
4. **Fail Secure**: System fails to secure state
5. **Separation of Concerns**: Clear security boundaries
6. **Audit Everything**: Comprehensive logging and monitoring

## Authentication Security

### Password Security

#### Password Requirements
```typescript
interface PasswordPolicy {
  minLength: 8;                    // Minimum 8 characters
  requireUppercase: true;          // At least one uppercase letter
  requireLowercase: true;          // At least one lowercase letter
  requireNumbers: true;            // At least one number
  requireSpecialChars: true;       // At least one special character
  maxLength: 128;                  // Maximum 128 characters
  preventCommonPasswords: true;    // Block common passwords
  preventUserInfo: true;           // Block user information in password
  historyPrevention: 5;            // Prevent reuse of last 5 passwords
  expirationDays: 90;              // Password expires every 90 days
}
```

#### Password Hashing
```typescript
import bcrypt from 'bcrypt';

const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;            // High security salt rounds
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
```

#### Account Lockout Policy
```typescript
interface AccountLockoutPolicy {
  maxAttempts: 5;                   // Maximum failed attempts
  lockoutDuration: 15 * 60 * 1000;  // 15 minutes lockout
  progressiveDelay: true;           // Increasing delay between attempts
  resetOnSuccess: true;             // Reset counter on successful login
}
```

### Session Security

#### Session Configuration
```typescript
interface SessionSecurity {
  strategy: 'jwt';                 // JWT-based sessions
  maxAge: 24 * 60 * 60;            // 24 hours maximum
  updateAge: 60 * 60;              // Refresh every hour
  secure: true;                    // HTTPS only in production
  httpOnly: true;                  // Prevent XSS access
  sameSite: 'lax';                 // CSRF protection
  domain: '.zenthea.com';          // Domain restriction
  path: '/';                       // Path restriction
}
```

#### JWT Security
```typescript
interface JWTSecurity {
  algorithm: 'HS256';              // Secure signing algorithm
  issuer: 'zenthea';               // Token issuer
  audience: 'zenthea-app';         // Token audience
  expiration: '24h';               // Token expiration
  refreshToken: true;              // Refresh token support
  blacklist: true;                 // Token blacklisting support
}
```

### Multi-Factor Authentication (MFA)

#### MFA Implementation
```typescript
interface MFAConfig {
  enabled: true;                    // MFA enabled by default
  methods: ['totp', 'sms', 'email']; // Supported MFA methods
  backupCodes: 10;                  // Number of backup codes
  gracePeriod: 7 * 24 * 60 * 60;   // 7 days grace period
  requiredRoles: ['admin'];         // Roles requiring MFA
}
```

#### TOTP Implementation
```typescript
import speakeasy from 'speakeasy';

const generateSecret = (): string => {
  return speakeasy.generateSecret({
    name: 'Zenthea',
    issuer: 'Zenthea Healthcare',
    length: 32
  });
};

const verifyToken = (secret: string, token: string): boolean => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2
  });
};
```

## Data Protection

### Encryption at Rest

#### Database Encryption
```typescript
interface DatabaseEncryption {
  algorithm: 'AES-256-GCM';        // Strong encryption algorithm
  keyRotation: 90;                  // Key rotation every 90 days
  fieldLevel: true;                 // Field-level encryption
  sensitiveFields: [                 // Fields requiring encryption
    'password',
    'ssn',
    'medicalRecords',
    'insuranceInfo'
  ];
}
```

#### File Storage Encryption
```typescript
interface FileEncryption {
  algorithm: 'AES-256-GCM';         // File encryption algorithm
  keyManagement: 'AWS KMS';         // Key management service
  encryptionAtRest: true;           // Encrypt all stored files
  clientSideEncryption: true;       // Encrypt before upload
}
```

### Encryption in Transit

#### TLS Configuration
```typescript
interface TLSConfig {
  version: 'TLS 1.3';               // Latest TLS version
  ciphers: [                        // Strong cipher suites
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ];
  hsts: true;                       // HTTP Strict Transport Security
  certificatePinning: true;          // Certificate pinning
}
```

#### API Security Headers
```typescript
interface SecurityHeaders {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains';
  'X-Content-Type-Options': 'nosniff';
  'X-Frame-Options': 'DENY';
  'X-XSS-Protection': '1; mode=block';
  'Referrer-Policy': 'strict-origin-when-cross-origin';
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'";
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()';
}
```

### Data Anonymization

#### PII Protection
```typescript
interface PIIProtection {
  fields: [                         // Fields containing PII
    'email',
    'phone',
    'address',
    'ssn',
    'dateOfBirth'
  ];
  anonymization: {                  // Anonymization methods
    email: 'hash',                  // Hash email addresses
    phone: 'mask',                  // Mask phone numbers
    ssn: 'encrypt',                 // Encrypt SSNs
    address: 'generalize'            // Generalize addresses
  };
  retention: 7 * 365 * 24 * 60 * 60; // 7 years retention
}
```

#### Data Masking
```typescript
const maskSensitiveData = (data: any, userRole: string): any => {
  if (userRole !== 'admin') {
    // Mask SSN
    if (data.ssn) {
      data.ssn = data.ssn.replace(/\d/g, '*');
    }
    
    // Mask email
    if (data.email) {
      const [local, domain] = data.email.split('@');
      data.email = `${local[0]}***@${domain}`;
    }
    
    // Mask phone
    if (data.phone) {
      data.phone = data.phone.replace(/\d/g, '*');
    }
  }
  
  return data;
};
```

## API Security

### Input Validation

#### Request Validation
```typescript
import Joi from 'joi';

const validateRequest = (schema: Joi.ObjectSchema, data: any) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
  
  if (error) {
    throw new Error(`Validation failed: ${error.details.map(d => d.message).join(', ')}`);
  }
  
  return value;
};

// Example validation schema
const patientSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
  dateOfBirth: Joi.date().max('now').required()
});
```

#### SQL Injection Prevention
```typescript
// Use parameterized queries (Convex handles this automatically)
const getPatient = async (id: string) => {
  // Convex automatically prevents SQL injection
  return await ctx.db.get(id as Id<"patients">);
};

// Never use string concatenation for queries
// ❌ BAD: const query = `SELECT * FROM patients WHERE id = '${id}'`;
// ✅ GOOD: Use Convex's type-safe queries
```

### Rate Limiting

#### API Rate Limiting
```typescript
interface RateLimitConfig {
  windowMs: 15 * 60 * 1000;        // 15 minutes
  max: 100;                         // 100 requests per window
  message: 'Too many requests';
  standardHeaders: true;            // Rate limit info in headers
  legacyHeaders: false;             // Disable legacy headers
}

// Rate limiting by endpoint
const rateLimits = {
  '/api/auth/signin': { max: 5, windowMs: 15 * 60 * 1000 },
  '/api/patients': { max: 100, windowMs: 15 * 60 * 1000 },
  '/api/appointments': { max: 50, windowMs: 15 * 60 * 1000 }
};
```

#### DDoS Protection
```typescript
interface DDoSProtection {
  maxRequestsPerMinute: 60;        // Per IP address
  maxRequestsPerHour: 1000;        // Per IP address
  blockDuration: 60 * 60 * 1000;   // 1 hour block
  whitelist: ['127.0.0.1'];        // Whitelisted IPs
  blacklist: [];                    // Blacklisted IPs
}
```

### CORS Configuration

#### CORS Security
```typescript
interface CORSConfig {
  origin: [                        // Allowed origins
    'https://zenthea.com',
    'https://app.zenthea.com',
    'https://admin.zenthea.com'
  ];
  credentials: true;                // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  allowedHeaders: [                 // Allowed headers
    'Content-Type',
    'Authorization',
    'X-Requested-With'
  ];
  maxAge: 86400;                    // 24 hours preflight cache
}
```

## Infrastructure Security

### Network Security

#### Firewall Rules
```typescript
interface FirewallRules {
  inbound: [                        // Inbound rules
    { port: 443, protocol: 'TCP', source: '0.0.0.0/0' },  // HTTPS
    { port: 80, protocol: 'TCP', source: '0.0.0.0/0' },   // HTTP (redirect)
    { port: 22, protocol: 'TCP', source: '10.0.0.0/8' }   // SSH (internal)
  ];
  outbound: [                       // Outbound rules
    { port: 443, protocol: 'TCP', destination: '0.0.0.0/0' }, // HTTPS
    { port: 53, protocol: 'UDP', destination: '0.0.0.0/0' }   // DNS
  ];
}
```

#### Network Segmentation
```typescript
interface NetworkSegmentation {
  publicSubnet: {                   // Public-facing services
    cidr: '10.0.1.0/24',
    services: ['load-balancer', 'web-server']
  };
  privateSubnet: {                  // Internal services
    cidr: '10.0.2.0/24',
    services: ['database', 'api-server']
  };
  databaseSubnet: {                 // Database tier
    cidr: '10.0.3.0/24',
    services: ['primary-db', 'replica-db']
  };
}
```

### Container Security

#### Docker Security
```typescript
interface DockerSecurity {
  baseImage: 'node:18-alpine';     // Minimal base image
  user: 'node';                     // Non-root user
  readOnly: true;                   // Read-only filesystem
  noNewPrivileges: true;            // No new privileges
  capabilities: [];                 // No additional capabilities
  seccomp: 'default.json';          // Seccomp profile
  apparmor: 'docker-default';       // AppArmor profile
}
```

#### Container Scanning
```typescript
interface ContainerScanning {
  vulnerabilityScan: true;          // Scan for vulnerabilities
  malwareScan: true;                // Scan for malware
  licenseScan: true;                // Scan for license issues
  baseImageScan: true;              // Scan base image
  runtimeScan: true;                // Runtime security scanning
}
```

## Compliance & Regulations

### HIPAA Compliance

#### HIPAA Requirements
```typescript
interface HIPAACompliance {
  administrativeSafeguards: {       // Administrative safeguards
    securityOfficer: true;          // Designated security officer
    workforceTraining: true;        // Workforce training program
    accessManagement: true;         // Access management procedures
    contingencyPlan: true;          // Contingency plan
  };
  physicalSafeguards: {             // Physical safeguards
    facilityAccess: true;           // Facility access controls
    workstationUse: true;           // Workstation use restrictions
    deviceControls: true;           // Device and media controls
  };
  technicalSafeguards: {            // Technical safeguards
    accessControl: true;            // Access control
    auditControls: true;            // Audit controls
    integrity: true;                // Integrity controls
    transmissionSecurity: true;     // Transmission security
  };
}
```

#### PHI Protection
```typescript
interface PHIProtection {
  encryption: {                     // PHI encryption requirements
    atRest: true;                   // Encrypt PHI at rest
    inTransit: true;                // Encrypt PHI in transit
    algorithm: 'AES-256';           // Strong encryption algorithm
  };
  accessControls: {                 // PHI access controls
    roleBased: true;                // Role-based access
    needToKnow: true;                // Need-to-know basis
    minimumNecessary: true;         // Minimum necessary standard
  };
  auditLogging: {                   // PHI audit logging
    accessLogs: true;               // Access logging
    modificationLogs: true;         // Modification logging
    retention: 6 * 365 * 24 * 60 * 60; // 6 years retention
  };
}
```

### GDPR Compliance

#### GDPR Requirements
```typescript
interface GDPRCompliance {
  dataMinimization: true;           // Collect only necessary data
  purposeLimitation: true;          // Use data for stated purpose only
  storageLimitation: true;          // Store data only as long as necessary
  accuracy: true;                   // Keep data accurate and up-to-date
  security: true;                   // Appropriate security measures
  accountability: true;             // Demonstrate compliance
}
```

#### Data Subject Rights
```typescript
interface DataSubjectRights {
  rightToAccess: true;              // Right to access personal data
  rightToRectification: true;       // Right to correct inaccurate data
  rightToErasure: true;             // Right to be forgotten
  rightToPortability: true;         // Right to data portability
  rightToObject: true;              // Right to object to processing
  rightToRestriction: true;         // Right to restrict processing
}
```

## Security Monitoring

### Logging and Monitoring

#### Security Event Logging
```typescript
interface SecurityLogging {
  authenticationEvents: {           // Authentication logging
    loginAttempts: true;            // Login attempts
    loginFailures: true;            // Failed logins
    passwordChanges: true;          // Password changes
    accountLockouts: true;          // Account lockouts
  };
  authorizationEvents: {            // Authorization logging
    accessAttempts: true;           // Access attempts
    permissionDenials: true;        // Permission denials
    roleChanges: true;              // Role changes
  };
  dataEvents: {                     // Data access logging
    dataAccess: true;               // Data access events
    dataModification: true;         // Data modification events
    dataExport: true;               // Data export events
  };
}
```

#### Security Metrics
```typescript
interface SecurityMetrics {
  authentication: {                  // Authentication metrics
    successRate: number;             // Login success rate
    failureRate: number;             // Login failure rate
    averageSessionDuration: number; // Average session duration
    concurrentSessions: number;     // Concurrent sessions
  };
  authorization: {                   // Authorization metrics
    accessGranted: number;           // Access granted count
    accessDenied: number;            // Access denied count
    privilegeEscalation: number;     // Privilege escalation attempts
  };
  data: {                           // Data security metrics
    dataAccess: number;              // Data access count
    dataModification: number;        // Data modification count
    dataExport: number;              // Data export count
  };
}
```

### Threat Detection

#### Anomaly Detection
```typescript
interface AnomalyDetection {
  loginAnomalies: {                 // Login anomaly detection
    unusualLocation: true;           // Unusual login location
    unusualTime: true;               // Unusual login time
    rapidLogins: true;               // Rapid login attempts
    deviceFingerprinting: true;     // Device fingerprinting
  };
  dataAnomalies: {                  // Data anomaly detection
    bulkDataAccess: true;            // Bulk data access
    unusualDataPatterns: true;      // Unusual data patterns
    dataExfiltration: true;         // Data exfiltration attempts
  };
  networkAnomalies: {               // Network anomaly detection
    unusualTraffic: true;            // Unusual network traffic
    portScanning: true;             // Port scanning detection
    ddosAttacks: true;               // DDoS attack detection
  };
}
```

#### Security Alerts
```typescript
interface SecurityAlerts {
  critical: [                        // Critical security alerts
    'Multiple failed login attempts',
    'Privilege escalation attempt',
    'Data exfiltration attempt',
    'System compromise detected'
  ];
  warning: [                         // Warning security alerts
    'Unusual login location',
    'Bulk data access',
    'Suspicious API usage',
    'Account lockout'
  ];
  info: [                           // Informational security alerts
    'Successful login',
    'Password change',
    'Role modification',
    'Data export'
  ];
}
```

## Incident Response

### Incident Classification

#### Severity Levels
```typescript
interface IncidentSeverity {
  critical: {                     // Critical incidents
    responseTime: 15 * 60 * 1000;   // 15 minutes
    escalation: 'immediate';        // Immediate escalation
    notification: ['security-team', 'management', 'legal'];
  };
  high: {                           // High severity incidents
    responseTime: 60 * 60 * 1000;   // 1 hour
    escalation: 'urgent';           // Urgent escalation
    notification: ['security-team', 'management'];
  };
  medium: {                         // Medium severity incidents
    responseTime: 4 * 60 * 60 * 1000; // 4 hours
    escalation: 'standard';         // Standard escalation
    notification: ['security-team'];
  };
  low: {                            // Low severity incidents
    responseTime: 24 * 60 * 60 * 1000; // 24 hours
    escalation: 'routine';          // Routine escalation
    notification: ['security-team'];
  };
}
```

#### Incident Response Plan
```typescript
interface IncidentResponsePlan {
  preparation: {                     // Preparation phase
    teamTraining: true;              // Team training
    toolPreparation: true;            // Tool preparation
    communicationPlan: true;         // Communication plan
  };
  identification: {                  // Identification phase
    monitoring: true;                 // Continuous monitoring
    alerting: true;                  // Automated alerting
    analysis: true;                  // Threat analysis
  };
  containment: {                     // Containment phase
    immediateContainment: true;      // Immediate containment
    systemIsolation: true;           // System isolation
    threatNeutralization: true;      // Threat neutralization
  };
  eradication: {                     // Eradication phase
    threatRemoval: true;             // Threat removal
    vulnerabilityPatching: true;     // Vulnerability patching
    systemHardening: true;           // System hardening
  };
  recovery: {                        // Recovery phase
    systemRestoration: true;         // System restoration
    serviceValidation: true;        // Service validation
    monitoring: true;                // Enhanced monitoring
  };
  lessonsLearned: {                  // Lessons learned phase
    postIncidentReview: true;        // Post-incident review
    processImprovement: true;        // Process improvement
    documentation: true;              // Documentation update
  };
}
```

## Security Testing

### Automated Security Testing

#### Static Application Security Testing (SAST)
```typescript
interface SASTConfig {
  tools: ['eslint-security', 'semgrep', 'sonarqube'];
  rules: [
    'no-eval',
    'no-innerHTML',
    'no-outerHTML',
    'no-document-write',
    'no-unsafe-regex'
  ];
  severity: ['critical', 'high', 'medium'];
  failOnError: true;
}
```

#### Dynamic Application Security Testing (DAST)
```typescript
interface DASTConfig {
  tools: ['owasp-zap', 'burp-suite', 'nikto'];
  scanTypes: [
    'vulnerability-scan',
    'authentication-scan',
    'authorization-scan',
    'input-validation-scan'
  ];
  frequency: 'daily';
  reportFormat: 'json';
}
```

#### Interactive Application Security Testing (IAST)
```typescript
interface IASTConfig {
  tools: ['contrast-security', 'veracode-iast'];
  coverage: 'comprehensive';
  realTime: true;
  integration: 'ci-cd';
}
```

### Penetration Testing

#### Penetration Testing Plan
```typescript
interface PenetrationTesting {
  frequency: 'quarterly';           // Quarterly testing
  scope: [                          // Testing scope
    'web-application',
    'api-endpoints',
    'authentication',
    'authorization',
    'data-protection'
  ];
  methodology: 'owasp-top-10';      // OWASP Top 10 methodology
  reporting: {                      // Reporting requirements
    executiveSummary: true;          // Executive summary
    technicalDetails: true;         // Technical details
    remediationGuidance: true;       // Remediation guidance
    riskAssessment: true;           // Risk assessment
  };
}
```

### Security Code Review

#### Code Review Checklist
```typescript
interface SecurityCodeReview {
  authentication: [                 // Authentication review
    'password-hashing',
    'session-management',
    'token-validation',
    'multi-factor-auth'
  ];
  authorization: [                   // Authorization review
    'role-based-access',
    'permission-checks',
    'privilege-escalation',
    'access-control'
  ];
  inputValidation: [                // Input validation review
    'sql-injection',
    'xss-prevention',
    'csrf-protection',
    'injection-attacks'
  ];
  dataProtection: [                 // Data protection review
    'encryption-at-rest',
    'encryption-in-transit',
    'data-masking',
    'pii-protection'
  ];
}
```

## Development Guidelines

### Secure Coding Practices

#### Input Validation
```typescript
// ✅ GOOD: Comprehensive input validation
const validateUserInput = (input: any) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
    tenantId: Joi.string().uuid().required()
  });
  
  const { error, value } = schema.validate(input);
  if (error) throw new Error(`Validation failed: ${error.message}`);
  return value;
};

// ❌ BAD: No input validation
const processUserInput = (input: any) => {
  return input; // Dangerous!
};
```

#### Output Encoding
```typescript
// ✅ GOOD: Output encoding
const sanitizeOutput = (data: any) => {
  return {
    ...data,
    name: escapeHtml(data.name),
    description: escapeHtml(data.description),
    email: data.email.toLowerCase().trim()
  };
};

// ❌ BAD: No output encoding
const displayData = (data: any) => {
  return `<div>${data.name}</div>`; // XSS vulnerability!
};
```

#### Error Handling
```typescript
// ✅ GOOD: Secure error handling
const handleError = (error: Error, context: string) => {
  // Log error securely
  logger.error('Application error', {
    error: error.message,
    context,
    timestamp: new Date().toISOString(),
    userId: getCurrentUserId()
  });
  
  // Return generic error to user
  return {
    success: false,
    error: 'An error occurred. Please try again.'
  };
};

// ❌ BAD: Information disclosure
const handleError = (error: Error) => {
  return { error: error.stack }; // Exposes internal details!
};
```

### Security Testing Guidelines

#### Unit Testing
```typescript
describe('Authentication Security', () => {
  it('should hash passwords securely', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    
    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format
    expect(await verifyPassword(password, hash)).toBe(true);
  });
  
  it('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const result = await searchUsers(maliciousInput);
    
    expect(result).toEqual([]);
    // Verify table still exists
    expect(await getTableCount('users')).toBeGreaterThan(0);
  });
});
```

#### Integration Testing
```typescript
describe('API Security', () => {
  it('should require authentication for protected endpoints', async () => {
    const response = await request(app)
      .get('/api/patients')
      .expect(401);
    
    expect(response.body.error).toBe('Authentication required');
  });
  
  it('should enforce rate limiting', async () => {
    const requests = Array(10).fill(null).map(() =>
      request(app)
        .post('/api/auth/signin')
        .send({ email: 'test@example.com', password: 'wrong' })
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

### Security Documentation

#### Security Requirements
```typescript
interface SecurityRequirements {
  authentication: {                  // Authentication requirements
    passwordPolicy: PasswordPolicy;
    sessionManagement: SessionConfig;
    multiFactorAuth: MFAConfig;
  };
  authorization: {                  // Authorization requirements
    roleBasedAccess: RoleConfig;
    permissionMatrix: PermissionMatrix;
    accessControl: AccessControlConfig;
  };
  dataProtection: {                 // Data protection requirements
    encryption: EncryptionConfig;
    dataMasking: DataMaskingConfig;
    retention: RetentionPolicy;
  };
  infrastructure: {                  // Infrastructure requirements
    networkSecurity: NetworkConfig;
    containerSecurity: ContainerConfig;
    monitoring: MonitoringConfig;
  };
}
```

This comprehensive security best practices documentation ensures the Zenthea healthcare platform maintains the highest security standards while providing clear guidance for developers and security teams.
