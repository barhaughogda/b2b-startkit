/**
 * Session Security Validation
 * 
 * This module provides validation for session security mechanisms required for HIPAA compliance
 * and healthcare data security.
 */

export interface SessionConfig {
  timeout: number; // in milliseconds
  maxConcurrentSessions: number;
  requireMFA: boolean;
  secureCookies: boolean;
  httpOnlyCookies: boolean;
  sameSitePolicy: 'strict' | 'lax' | 'none';
}

export interface SessionValidation {
  sessionId: string;
  valid: boolean;
  reason?: string;
  expiresAt: number;
  lastActivity: number;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  tenantId: string;
  role: string;
  createdAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
  mfaVerified: boolean;
}

/**
 * Default session configuration for HIPAA compliance
 */
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  timeout: 30 * 60 * 1000, // 30 minutes
  maxConcurrentSessions: 3,
  requireMFA: true,
  secureCookies: true,
  httpOnlyCookies: true,
  sameSitePolicy: 'strict'
};

/**
 * Validate session security for HIPAA compliance
 */
export function validateSessionSecurity(
  session: UserSession,
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): SessionValidation {
  const now = Date.now();
  const sessionAge = now - session.createdAt;
  const timeSinceLastActivity = now - session.lastActivity;
  
  // Check session timeout
  if (timeSinceLastActivity > config.timeout) {
    return {
      sessionId: session.sessionId,
      valid: false,
      reason: 'Session has expired due to inactivity',
      expiresAt: session.createdAt + config.timeout,
      lastActivity: session.lastActivity
    };
  }
  
  // Check session age (max 8 hours for HIPAA compliance)
  const maxSessionAge = 8 * 60 * 60 * 1000; // 8 hours
  if (sessionAge > maxSessionAge) {
    return {
      sessionId: session.sessionId,
      valid: false,
      reason: 'Session has exceeded maximum age',
      expiresAt: session.createdAt + maxSessionAge,
      lastActivity: session.lastActivity
    };
  }
  
  // Check MFA requirement
  if (config.requireMFA && !session.mfaVerified) {
    return {
      sessionId: session.sessionId,
      valid: false,
      reason: 'MFA verification required',
      expiresAt: session.createdAt + config.timeout,
      lastActivity: session.lastActivity
    };
  }
  
  // Check for suspicious activity
  if (session.ipAddress === '0.0.0.0' || !session.ipAddress) {
    return {
      sessionId: session.sessionId,
      valid: false,
      reason: 'Invalid IP address',
      expiresAt: session.createdAt + config.timeout,
      lastActivity: session.lastActivity
    };
  }
  
  return {
    sessionId: session.sessionId,
    valid: true,
    expiresAt: session.createdAt + config.timeout,
    lastActivity: session.lastActivity
  };
}

/**
 * Validate session token security
 */
export function validateSessionToken(token: string): { valid: boolean; reason?: string } {
  // Check token format (basic JWT validation)
  const parts = token.split('.');
  if (parts.length !== 3) {
    return {
      valid: false,
      reason: 'Invalid token format'
    };
  }
  
  try {
    // Decode header and payload (basic validation)
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    // Check token expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return {
        valid: false,
        reason: 'Token has expired'
      };
    }
    
    // Check token issuer
    if (!payload.iss || !payload.iss.includes('zenthea')) {
      return {
        valid: false,
        reason: 'Invalid token issuer'
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      reason: 'Invalid token structure'
    };
  }
}

/**
 * Validate concurrent session limits
 */
export function validateConcurrentSessions(
  userSessions: UserSession[],
  maxSessions: number = DEFAULT_SESSION_CONFIG.maxConcurrentSessions
): { valid: boolean; reason?: string; activeSessions: number } {
  const activeSessions = userSessions.filter(session => {
    const validation = validateSessionSecurity(session);
    return validation.valid;
  }).length;
  
  if (activeSessions > maxSessions) {
    return {
      valid: false,
      reason: `Too many concurrent sessions (${activeSessions}/${maxSessions})`,
      activeSessions
    };
  }
  
  return {
    valid: true,
    activeSessions
  };
}

/**
 * Validate session cookie security
 */
export function validateSessionCookieSecurity(config: SessionConfig): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!config.secureCookies) {
    issues.push('Secure flag not set on session cookies');
  }
  
  if (!config.httpOnlyCookies) {
    issues.push('HttpOnly flag not set on session cookies');
  }
  
  if (config.sameSitePolicy === 'none' && !config.secureCookies) {
    issues.push('SameSite=None requires Secure flag');
  }
  
  if (config.timeout > 8 * 60 * 60 * 1000) { // 8 hours
    issues.push('Session timeout exceeds HIPAA compliance limits');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Calculate session security compliance score
 */
export function calculateSessionSecurityScore(validations: SessionValidation[]): number {
  const totalValidations = validations.length;
  const validValidations = validations.filter(v => v.valid).length;
  return Math.round((validValidations / totalValidations) * 100);
}

/**
 * Generate session security report
 */
export function generateSessionSecurityReport(validations: SessionValidation[]): string {
  const score = calculateSessionSecurityScore(validations);
  const validCount = validations.filter(v => v.valid).length;
  const totalCount = validations.length;
  
  let report = `Session Security Compliance Report\n`;
  report += `==================================\n\n`;
  report += `Overall Score: ${score}/100\n`;
  report += `Valid Sessions: ${validCount}/${totalCount}\n\n`;
  
  report += `Session Details:\n`;
  validations.forEach(validation => {
    const status = validation.valid ? '✅' : '❌';
    const expiresIn = Math.round((validation.expiresAt - Date.now()) / 1000 / 60); // minutes
    report += `${status} Session ${validation.sessionId}: ${expiresIn > 0 ? `expires in ${expiresIn} minutes` : 'expired'}\n`;
    if (validation.reason) {
      report += `   Reason: ${validation.reason}\n`;
    }
  });
  
  return report;
}
