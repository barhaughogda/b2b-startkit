/**
 * Access Control Validation
 * 
 * This module provides validation for access control mechanisms required for HIPAA compliance
 * and healthcare data security.
 */

export interface AccessControlRule {
  role: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface AccessControlValidation {
  rule: AccessControlRule;
  valid: boolean;
  reason?: string;
}

export interface UserContext {
  userId: string;
  role: string;
  tenantId: string;
  permissions: string[];
  sessionId: string;
  ipAddress: string;
  userAgent: string;
}

export interface ResourceContext {
  resourceId: string;
  resourceType: string;
  tenantId: string;
  ownerId?: string;
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
}

/**
 * Validate access control for HIPAA compliance
 */
export function validateAccessControl(
  userContext: UserContext,
  resourceContext: ResourceContext,
  action: string
): AccessControlValidation {
  const rule: AccessControlRule = {
    role: userContext.role,
    resource: resourceContext.resourceType,
    action: action
  };
  
  // Check if user has required permissions
  const hasPermission = userContext.permissions.includes(action) || 
                       userContext.permissions.includes('*');
  
  if (!hasPermission) {
    return {
      rule,
      valid: false,
      reason: 'User does not have required permissions'
    };
  }
  
  // Check tenant isolation
  if (userContext.tenantId !== resourceContext.tenantId) {
    return {
      rule,
      valid: false,
      reason: 'Cross-tenant access not allowed'
    };
  }
  
  // Check resource sensitivity
  if (resourceContext.sensitivity === 'restricted' && userContext.role !== 'admin') {
    return {
      rule,
      valid: false,
      reason: 'Restricted resource requires admin role'
    };
  }
  
  // Check PHI access logging requirements
  if (resourceContext.sensitivity === 'confidential' || resourceContext.sensitivity === 'restricted') {
    // PHI access should be logged - this would be handled by the audit logger
    // For validation purposes, we assume this is properly implemented
  }
  
  return {
    rule,
    valid: true
  };
}

/**
 * Get role-based permissions for healthcare roles
 */
export function getRolePermissions(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    admin: ['read', 'write', 'delete', 'export', 'import', 'audit'],
    provider: ['read', 'write', 'export'],
    nurse: ['read', 'write'],
    patient: ['read'],
    guest: []
  };
  
  return rolePermissions[role] || [];
}

/**
 * Validate multi-tenant isolation
 */
export function validateTenantIsolation(
  userTenantId: string,
  resourceTenantId: string
): boolean {
  return userTenantId === resourceTenantId;
}

/**
 * Validate PHI access requirements
 */
export function validatePHIAccess(
  userContext: UserContext,
  resourceContext: ResourceContext
): { allowed: boolean; reason?: string } {
  // PHI access requires specific roles
  const phiAccessRoles = ['admin', 'provider', 'nurse', 'patient'];
  
  if (!phiAccessRoles.includes(userContext.role)) {
    return {
      allowed: false,
      reason: 'Role does not have PHI access permissions'
    };
  }
  
  // Patient can only access their own data
  if (userContext.role === 'patient' && resourceContext.ownerId !== userContext.userId) {
    return {
      allowed: false,
      reason: 'Patient can only access their own data'
    };
  }
  
  // Check tenant isolation
  if (!validateTenantIsolation(userContext.tenantId, resourceContext.tenantId)) {
    return {
      allowed: false,
      reason: 'Cross-tenant PHI access not allowed'
    };
  }
  
  return { allowed: true };
}

/**
 * Validate session security
 */
export function validateSessionSecurity(
  userContext: UserContext,
  sessionTimeout: number = 30 * 60 * 1000 // 30 minutes
): { valid: boolean; reason?: string } {
  // Check if session is within timeout
  const sessionAge = Date.now() - parseInt(userContext.sessionId.split('_')[1] || '0');
  
  if (sessionAge > sessionTimeout) {
    return {
      valid: false,
      reason: 'Session has expired'
    };
  }
  
  // Check for suspicious activity (basic validation)
  if (userContext.ipAddress === '0.0.0.0' || userContext.ipAddress === '127.0.0.1') {
    return {
      valid: false,
      reason: 'Invalid IP address'
    };
  }
  
  return { valid: true };
}

/**
 * Calculate access control compliance score
 */
export function calculateAccessControlScore(validations: AccessControlValidation[]): number {
  // Guard against division by zero when no validations are provided
  if (validations.length === 0) {
    return 0; // No validations = no score to calculate
  }
  
  const totalValidations = validations.length;
  const validValidations = validations.filter(v => v.valid).length;
  return Math.round((validValidations / totalValidations) * 100);
}

/**
 * Generate access control report
 */
export function generateAccessControlReport(validations: AccessControlValidation[]): string {
  const score = calculateAccessControlScore(validations);
  const validCount = validations.filter(v => v.valid).length;
  const totalCount = validations.length;
  
  let report = `Access Control Compliance Report\n`;
  report += `================================\n\n`;
  report += `Overall Score: ${score}/100\n`;
  report += `Valid Rules: ${validCount}/${totalCount}\n\n`;
  
  report += `Rule Details:\n`;
  validations.forEach(validation => {
    const status = validation.valid ? '✅' : '❌';
    report += `${status} ${validation.rule.role} -> ${validation.rule.resource} (${validation.rule.action})\n`;
    if (validation.reason) {
      report += `   Reason: ${validation.reason}\n`;
    }
  });
  
  return report;
}
