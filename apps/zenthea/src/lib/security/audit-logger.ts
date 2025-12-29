/**
 * Audit logging system for admin actions and security events
 * Logs all administrative actions for compliance and security monitoring
 */

import { NextRequest } from 'next/server';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  success: boolean;
  errorMessage?: string;
}

export interface AuditLogConfig {
  enabled: boolean;
  logLevel: 'minimal' | 'standard' | 'detailed';
  retentionDays: number;
  includeRequestBody: boolean;
  includeResponseBody: boolean;
  sensitiveFields: string[];
}

class AuditLogger {
  private config: AuditLogConfig;
  private events: AuditEvent[] = [];

  constructor(config: AuditLogConfig) {
    this.config = config;
  }

  /**
   * Log an audit event
   */
  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event
    };

    // Store event in memory (in production, this would go to a database)
    this.events.push(auditEvent);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('AUDIT LOG:', JSON.stringify(auditEvent, null, 2));
    }

    // In production, this would be sent to a logging service
    // await this.sendToLoggingService(auditEvent);
  }

  /**
   * Log admin action
   */
  async logAdminAction(
    req: NextRequest,
    action: string,
    resource: string,
    details: Record<string, any> = {},
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    const userInfo = this.extractUserInfo(req);
    
    await this.logEvent({
      ...userInfo,
      action,
      resource,
      details: this.sanitizeDetails(details),
      success,
      errorMessage
    });
  }

  /**
   * Log file upload action
   */
  async logFileUpload(
    req: NextRequest,
    fileName: string,
    fileSize: number,
    fileType: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    const userInfo = this.extractUserInfo(req);
    
    await this.logEvent({
      ...userInfo,
      action: 'file_upload',
      resource: 'file',
      resourceId: fileName,
      details: {
        fileName,
        fileSize,
        fileType,
        uploadEndpoint: new URL(req.url).pathname
      },
      success,
      errorMessage
    });
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    req: NextRequest,
    action: 'login' | 'logout' | 'token_refresh' | 'password_change',
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    const userInfo = this.extractUserInfo(req);
    
    await this.logEvent({
      ...userInfo,
      action: `auth_${action}`,
      resource: 'authentication',
      details: {
        authAction: action
      },
      success,
      errorMessage
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    req: NextRequest,
    eventType: 'rate_limit_exceeded' | 'csrf_validation_failed' | 'invalid_file_type' | 'suspicious_content',
    details: Record<string, any> = {}
  ): Promise<void> {
    const userInfo = this.extractUserInfo(req);
    
    await this.logEvent({
      ...userInfo,
      action: `security_${eventType}`,
      resource: 'security',
      details: {
        eventType,
        ...details
      },
      success: false, // Security events are typically failures
      errorMessage: `Security event: ${eventType}`
    });
  }

  /**
   * Extract user information from request
   */
  private extractUserInfo(req: NextRequest): {
    userId?: string;
    userEmail?: string;
    userRole?: string;
    ipAddress: string;
    userAgent: string;
    sessionId?: string;
  } {
    // Extract IP address
    const ipAddress = this.getClientIP(req);
    
    // Extract user agent
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // Extract session information (if available)
    const sessionId = req.headers.get('x-session-id') || undefined;
    
    // Extract user information from headers (set by auth middleware)
    const userId = req.headers.get('x-user-id') || undefined;
    const userEmail = req.headers.get('x-user-email') || undefined;
    const userRole = req.headers.get('x-user-role') || undefined;

    return {
      userId,
      userEmail,
      userRole,
      ipAddress,
      userAgent,
      sessionId
    };
  }

  /**
   * Get client IP address
   * Uses shared utility for consistent IP extraction across the codebase
   */
  private getClientIP(req: NextRequest): string {
    // Import shared utility to avoid circular dependencies
    const { extractClientIP } = require('@/lib/utils/request-helpers');
    return extractClientIP(req);
  }

  /**
   * Sanitize details to remove sensitive information
   */
  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };
    
    // Remove sensitive fields
    for (const field of this.config.sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Remove nested sensitive fields
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (this.config.sensitiveFields.includes(key)) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get audit events (for admin interface)
   */
  getEvents(limit: number = 100): AuditEvent[] {
    return this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get events by user
   */
  getEventsByUser(userId: string, limit: number = 50): AuditEvent[] {
    return this.events
      .filter(event => event.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get security events
   */
  getSecurityEvents(limit: number = 50): AuditEvent[] {
    return this.events
      .filter(event => event.action.startsWith('security_'))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

// Default configuration
const defaultConfig: AuditLogConfig = {
  enabled: process.env.AUDIT_LOGGING_ENABLED !== 'false',
  logLevel: 'standard',
  retentionDays: 90,
  includeRequestBody: false,
  includeResponseBody: false,
  sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization']
};

// Singleton instance
const auditLogger = new AuditLogger(defaultConfig);

/**
 * Log admin action
 */
export async function logAdminAction(
  req: NextRequest,
  action: string,
  resource: string,
  details: Record<string, any> = {},
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  return auditLogger.logAdminAction(req, action, resource, details, success, errorMessage);
}

/**
 * Log file upload
 */
export async function logFileUpload(
  req: NextRequest,
  fileName: string,
  fileSize: number,
  fileType: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  return auditLogger.logFileUpload(req, fileName, fileSize, fileType, success, errorMessage);
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  req: NextRequest,
  action: 'login' | 'logout' | 'token_refresh' | 'password_change',
  success: boolean,
  errorMessage?: string
): Promise<void> {
  return auditLogger.logAuthEvent(req, action, success, errorMessage);
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  req: NextRequest,
  eventType: 'rate_limit_exceeded' | 'csrf_validation_failed' | 'invalid_file_type' | 'suspicious_content',
  details: Record<string, any> = {}
): Promise<void> {
  return auditLogger.logSecurityEvent(req, eventType, details);
}

/**
 * Get audit events
 */
export function getAuditEvents(limit: number = 100): AuditEvent[] {
  return auditLogger.getEvents(limit);
}

/**
 * Get events by user
 */
export function getAuditEventsByUser(userId: string, limit: number = 50): AuditEvent[] {
  return auditLogger.getEventsByUser(userId, limit);
}

/**
 * Get security events
 */
export function getSecurityEvents(limit: number = 50): AuditEvent[] {
  return auditLogger.getSecurityEvents(limit);
}

export default auditLogger;
