import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export interface PatientAuthContext {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
}

export interface SecurityConfig {
  rateLimits: {
    auth: { limit: number; windowMs: number };
    general: { limit: number; windowMs: number };
    fileUpload: { limit: number; windowMs: number };
  };
  tenantIsolation: boolean;
  hipaaCompliance: boolean;
}

// Rate limiting storage (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export class PatientAPISecurity {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  /**
   * Extract and validate JWT token from request
   */
  public extractAuthContext(request: NextRequest): PatientAuthContext | null {
    try {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any;

      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate tenant isolation
   */
  public validateTenantAccess(
    authContext: PatientAuthContext,
    requestTenantId: string | null
  ): boolean {
    if (!this.config.tenantIsolation) {
      return true;
    }

    const requestTenant = requestTenantId || authContext.tenantId;
    return authContext.tenantId === requestTenant;
  }

  /**
   * Check rate limiting
   */
  public checkRateLimit(
    identifier: string,
    limit: number,
    windowMs: number
  ): boolean {
    const now = Date.now();
    const key = `${identifier}:${Math.floor(now / windowMs)}`;
    
    const current = rateLimitMap.get(key);
    if (current && current.resetTime > now && current.count >= limit) {
      return false;
    }
    
    if (!current || current.resetTime <= now) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      current.count++;
    }
    
    return true;
  }

  /**
   * Validate patient role
   */
  public validatePatientRole(authContext: PatientAuthContext): boolean {
    return authContext.role === 'patient';
  }

  /**
   * Sanitize sensitive data for HIPAA compliance
   */
  public sanitizeForHIPAA(data: any): any {
    if (!this.config.hipaaCompliance) {
      return data;
    }

    // Remove or mask sensitive fields
    const sensitiveFields = [
      'ssn',
      'socialSecurityNumber',
      'creditCard',
      'bankAccount',
      'routingNumber'
    ];

    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        delete sanitized[field];
      }
    }

    return sanitized;
  }

  /**
   * Validate input data
   */
  public validateInput(data: any, rules: ValidationRules): ValidationResult {
    const errors: string[] = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rule.type === 'email' && !this.isValidEmail(value)) {
          errors.push(`${field} must be a valid email address`);
        }

        if (rule.type === 'phone' && !this.isValidPhone(value)) {
          errors.push(`${field} must be a valid phone number`);
        }

        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${field} must be at least ${rule.minLength} characters`);
        }

        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${field} must be no more than ${rule.maxLength} characters`);
        }

        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate audit log entry
   */
  public generateAuditLog(
    action: string,
    resource: string,
    resourceId: string,
    authContext: PatientAuthContext,
    request: NextRequest,
    details?: any
  ) {
    return {
      tenantId: authContext.tenantId,
      userId: authContext.userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress: this.getClientIP(request),
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get client IP address
   * Uses shared utility for consistent IP extraction across the codebase
   */
  private getClientIP(request: NextRequest): string {
    // Import shared utility to avoid circular dependencies
    const { extractClientIP } = require('@/lib/utils/request-helpers');
    return extractClientIP(request);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }
}

// Validation types
export interface ValidationRules {
  [field: string]: {
    required?: boolean;
    type?: 'email' | 'phone' | 'string' | 'number' | 'date';
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  rateLimits: {
    auth: { limit: 5, windowMs: 60000 }, // 5 attempts per minute
    general: { limit: 100, windowMs: 60000 }, // 100 requests per minute
    fileUpload: { limit: 10, windowMs: 60000 } // 10 uploads per minute
  },
  tenantIsolation: true,
  hipaaCompliance: true
};

// Security instance
export const patientAPISecurity = new PatientAPISecurity(defaultSecurityConfig);
