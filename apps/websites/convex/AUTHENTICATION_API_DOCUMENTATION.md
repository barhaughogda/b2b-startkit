# Zenthea Authentication API Documentation

This document provides comprehensive documentation for the authentication and authorization system in Zenthea, including security measures, session management, and API endpoints.

## Table of Contents
- [Security Overview](#security-overview)
- [Authentication Flow](#authentication-flow)
- [Session Management](#session-management)
- [API Endpoints](#api-endpoints)
- [Security Features](#security-features)
- [Data Contracts](#data-contracts)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Security Overview

Zenthea implements a robust authentication and authorization system with the following security features:

### Core Security Measures
- **JWT-based Authentication**: Secure token-based authentication with custom encoding/decoding
- **HTTP-Only Cookies**: Session tokens stored in secure, HTTP-only cookies
- **CSRF Protection**: SameSite cookie policy and CSRF token validation
- **Tenant Isolation**: Multi-tenant architecture with strict data separation
- **Role-Based Access Control**: Granular permissions based on user roles
- **Secure Session Management**: Cryptographically secure session tokens
- **Environment-Based Security**: Production-specific security configurations

### Security Headers
- `httpOnly`: Prevents XSS attacks by blocking JavaScript access to cookies
- `sameSite: 'lax'`: Provides CSRF protection while maintaining usability
- `secure`: HTTPS-only cookies in production
- `maxAge`: Automatic session expiration

## Authentication Flow

### 1. User Login Process

```typescript
// Login Request
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword",
  "tenantId": "tenant-123"
}
```

**Authentication Steps:**
1. **Input Validation**: Email, password, and tenant ID validation
2. **Credential Verification**: Convex-based user authentication
3. **JWT Generation**: Secure token creation with custom encoding
4. **Session Creation**: HTTP-only cookie session establishment
5. **Role Assignment**: User role and permissions assignment

### 2. Session Management

```typescript
// Session Configuration
{
  strategy: "jwt",
  maxAge: 24 * 60 * 60, // 24 hours
  updateAge: 60 * 60,   // 1 hour refresh
  generateSessionToken: () => crypto.randomBytes(32).toString('hex')
}
```

**Session Features:**
- **Automatic Refresh**: Sessions refresh every hour
- **Secure Tokens**: Cryptographically secure session tokens
- **Expiration Handling**: Graceful session expiration
- **Multi-Device Support**: Concurrent sessions across devices

## API Endpoints

### Authentication Endpoints

#### Sign In
**Endpoint:** `POST /api/auth/signin`

**Request Body:**
```typescript
{
  email: string;        // Required, valid email format
  password: string;     // Required, minimum 8 characters
  tenantId?: string;    // Optional, defaults to empty string
}
```

**Response:**
```typescript
{
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: "admin" | "provider" | "demo";
    tenantId: string;
  };
  error?: string;
}
```

**Security Validation:**
- Email format validation
- Password strength requirements
- Tenant ID validation
- Rate limiting protection

#### Sign Out
**Endpoint:** `POST /api/auth/signout`

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

**Security Features:**
- Session invalidation
- Cookie cleanup
- Audit logging

#### Session Status
**Endpoint:** `GET /api/auth/session`

**Response:**
```typescript
{
  user?: {
    id: string;
    email: string;
    name: string;
    role: "admin" | "provider" | "demo";
    tenantId: string;
  };
  expires: string;
}
```

### User Management Endpoints

#### Create User
**Endpoint:** `POST /api/users`

**Request Body:**
```typescript
{
  email: string;                    // Required, unique within tenant
  name: string;                     // Required
  password: string;                 // Required, will be hashed
  role: "admin" | "provider" | "demo";
  tenantId?: string;               // Optional, defaults to empty string
}
```

**Response:**
```typescript
{
  success: boolean;
  userId?: string;
  error?: string;
}
```

#### Authenticate User
**Endpoint:** `POST /api/users/authenticate`

**Request Body:**
```typescript
{
  email: string;
  password: string;
  tenantId?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  userId?: string;
  email?: string;
  name?: string;
  role?: "admin" | "provider" | "demo";
  tenantId?: string;
  error?: string;
}
```

## Security Features

### JWT Security Configuration

```typescript
// JWT Configuration
{
  algorithm: 'HS256',
  expiresIn: '24h',
  issuer: 'zenthea',
  audience: 'zenthea-app',
  maxAge: 24 * 60 * 60 // 24 hours
}
```

**Security Features:**
- **Algorithm**: HS256 for secure signing
- **Expiration**: 24-hour token lifetime
- **Issuer/Audience**: Token validation
- **Custom Encoding**: Enhanced security with custom JWT handling

### Cookie Security

```typescript
// Cookie Configuration
{
  sessionToken: {
    httpOnly: true,           // XSS protection
    sameSite: 'lax',          // CSRF protection
    secure: true,             // HTTPS only in production
    maxAge: 24 * 60 * 60     // 24 hours
  },
  csrfToken: {
    httpOnly: true,
    sameSite: 'lax',
    secure: true
  }
}
```

### Session Security

```typescript
// Session Security Features
{
  generateSessionToken: () => crypto.randomBytes(32).toString('hex'),
  maxAge: 24 * 60 * 60,      // 24 hours
  updateAge: 60 * 60,        // 1 hour refresh
  useSecureCookies: true     // Production only
}
```

## Data Contracts

### User Entity

```typescript
interface User {
  id: Id<"users">;
  email: string;                    // Unique within tenant
  name: string;
  password: string;                // Hashed with bcrypt
  role: "admin" | "provider" | "demo";
  tenantId: string;               // Tenant isolation
  isActive: boolean;               // Account status
  createdAt: number;               // Unix timestamp
  updatedAt: number;               // Unix timestamp
}
```

### Session Entity

```typescript
interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: "admin" | "provider" | "demo";
    tenantId: string;
  };
  expires: string;                 // ISO date string
  token: string;                   // JWT token
}
```

### Authentication Request

```typescript
interface AuthRequest {
  email: string;                   // Valid email format
  password: string;                 // Minimum 8 characters
  tenantId?: string;               // Optional tenant ID
}
```

### Authentication Response

```typescript
interface AuthResponse {
  success: boolean;
  userId?: Id<"users">;
  email?: string;
  name?: string;
  role?: "admin" | "provider" | "demo";
  tenantId?: string;
  error?: string;
}
```

## Error Handling

### Authentication Errors

```typescript
// Common Error Responses
{
  "Invalid credentials": "Email or password is incorrect",
  "User not found": "User does not exist in the system",
  "Account disabled": "User account has been deactivated",
  "Tenant mismatch": "User does not belong to the specified tenant",
  "Rate limit exceeded": "Too many authentication attempts",
  "Invalid email format": "Email address is not valid",
  "Password too weak": "Password does not meet security requirements"
}
```

### Session Errors

```typescript
// Session Error Responses
{
  "Session expired": "User session has expired",
  "Invalid session": "Session token is invalid or corrupted",
  "Session not found": "No active session found",
  "Token malformed": "JWT token is malformed or invalid"
}
```

### Security Errors

```typescript
// Security Error Responses
{
  "CSRF token mismatch": "CSRF protection triggered",
  "Invalid origin": "Request origin is not allowed",
  "Session hijacking detected": "Suspicious session activity",
  "Rate limit exceeded": "Too many requests from this IP"
}
```

## Best Practices

### Security Best Practices

1. **Password Security**
   - Minimum 8 characters
   - Mixed case, numbers, and symbols
   - Bcrypt hashing with salt rounds
   - Password history prevention

2. **Session Security**
   - HTTP-only cookies
   - Secure flag in production
   - SameSite CSRF protection
   - Automatic expiration

3. **Token Security**
   - JWT with HS256 algorithm
   - Short expiration times
   - Issuer and audience validation
   - Secure secret management

4. **Tenant Isolation**
   - Strict tenant boundaries
   - Data access controls
   - Cross-tenant prevention
   - Audit logging

### Development Best Practices

1. **Environment Configuration**
   - Separate dev/prod settings
   - Secure secret management
   - Debug logging controls
   - Feature flag support

2. **Error Handling**
   - Descriptive error messages
   - Security-conscious logging
   - Rate limiting
   - Input validation

3. **Testing**
   - Authentication flow testing
   - Security vulnerability testing
   - Session management testing
   - Cross-tenant isolation testing

### Production Considerations

1. **Monitoring**
   - Authentication success/failure rates
   - Session duration analytics
   - Security event logging
   - Performance metrics

2. **Scaling**
   - Stateless JWT tokens
   - Database connection pooling
   - Caching strategies
   - Load balancing

3. **Compliance**
   - HIPAA compliance considerations
   - Data privacy regulations
   - Audit trail requirements
   - Security standards

## Security Audit Checklist

### Authentication Security
- [ ] Password hashing with bcrypt
- [ ] JWT token security (HS256)
- [ ] Session cookie security (httpOnly, secure, sameSite)
- [ ] CSRF protection enabled
- [ ] Rate limiting implemented
- [ ] Input validation comprehensive
- [ ] Error messages security-conscious

### Session Management
- [ ] Automatic session expiration
- [ ] Secure session token generation
- [ ] Session refresh mechanism
- [ ] Multi-device session support
- [ ] Session invalidation on logout
- [ ] Session hijacking detection

### Tenant Isolation
- [ ] Strict tenant boundaries
- [ ] Cross-tenant access prevention
- [ ] Tenant-specific data queries
- [ ] Audit logging for tenant access
- [ ] Role-based tenant permissions

### Production Security
- [ ] HTTPS enforcement
- [ ] Secure cookie configuration
- [ ] Environment-based security
- [ ] Security headers configured
- [ ] Monitoring and alerting
- [ ] Regular security updates

## API Rate Limiting

### Authentication Endpoints
- **Sign In**: 5 attempts per minute per IP
- **Sign Out**: 10 requests per minute per IP
- **Session Refresh**: 20 requests per minute per user
- **Password Reset**: 3 attempts per hour per email

### User Management Endpoints
- **Create User**: 10 requests per minute per admin
- **Update User**: 50 requests per minute per admin
- **Delete User**: 5 requests per minute per admin
- **List Users**: 100 requests per minute per admin

## Monitoring and Logging

### Security Events
- Authentication attempts (success/failure)
- Session creation and destruction
- Role changes and permission updates
- Cross-tenant access attempts
- Suspicious activity patterns

### Performance Metrics
- Authentication response times
- Session creation latency
- Database query performance
- Token validation speed
- Cookie processing time

### Audit Trail
- User login/logout events
- Permission changes
- Tenant access patterns
- Security policy violations
- System configuration changes

This comprehensive authentication API documentation ensures secure, scalable, and maintainable authentication for the Zenthea healthcare platform.
