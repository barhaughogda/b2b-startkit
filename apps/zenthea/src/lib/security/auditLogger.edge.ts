/**
 * Edge Runtime compatible audit logger
 * This version uses Web Crypto API instead of Node.js crypto
 */

export enum AuditAction {
  LoginSuccess = "login_success",
  LoginFailed = "login_failed",
  Logout = "logout",
  PasswordChanged = "password_changed",
  AccountLocked = "account_locked",
  PermissionDenied = "permission_denied",
  UnauthorizedAccess = "unauthorized_access",
  AuthorizedAccess = "authorized_access",
  DataExport = "data_export",
  DataDeletion = "data_deletion",
  UserCreated = "user_created",
  UserUpdated = "user_updated",
  UserDeleted = "user_deleted",
  RoleChanged = "role_changed",
  PatientCreated = "patient_created",
  PatientUpdated = "patient_updated",
  PatientAccessed = "patient_accessed",
  PatientDeleted = "patient_deleted",
  MedicalRecordCreated = "medical_record_created",
  MedicalRecordAccessed = "medical_record_accessed",
  MedicalRecordUpdated = "medical_record_updated",
  MedicalRecordDeleted = "medical_record_deleted",
  AppointmentScheduled = "appointment_scheduled",
  AppointmentUpdated = "appointment_updated",
  AppointmentCancelled = "appointment_cancelled",
  TenantSettingsUpdated = "tenant_settings_updated",
  SecurityPolicyChanged = "security_policy_changed",
  DataRetentionPolicyChanged = "data_retention_policy_changed",
  CSPReport = "csp_report",
}

export enum AuditResource {
  User = "user",
  Patient = "patient",
  Provider = "provider",
  Appointment = "appointment",
  MedicalRecord = "medical_record",
  Message = "message",
  Tenant = "tenant",
  Auth = "auth",
  System = "system",
  Security = "security",
}

interface AuditLogDetails {
  [key: string]: any;
}

export class EdgeAuditLogger {
  private tenantId: string;
  private userId?: string;
  private ipAddress?: string;
  private userAgent?: string;

  constructor(tenantId: string, userId?: string, ipAddress?: string, userAgent?: string) {
    this.tenantId = tenantId;
    this.userId = userId;
    this.ipAddress = ipAddress;
    this.userAgent = userAgent;
  }

  public async log(
    action: AuditAction,
    resource: AuditResource,
    resourceId: string,
    details?: AuditLogDetails
  ): Promise<string> {
    const timestamp = Date.now();
    console.log(`Audit Log: Tenant: ${this.tenantId}, User: ${this.userId}, Action: ${action}, Resource: ${resource}:${resourceId}`);

    // In Edge Runtime, we'll log to console and return a mock ID
    // In production, this would integrate with your audit logging service
    const auditId = `audit_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Audit Entry Created: ${auditId}`, {
      tenantId: this.tenantId,
      userId: this.userId,
      action,
      resource,
      resourceId,
      details: details || {},
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      timestamp,
    });

    return auditId;
  }

  // Helper methods for common audit actions
  public async logPatientAccess(patientId: string, details?: AuditLogDetails): Promise<string> {
    return this.log(AuditAction.PatientAccessed, AuditResource.Patient, patientId, details);
  }

  public async logPatientUpdate(patientId: string, details?: AuditLogDetails): Promise<string> {
    return this.log(AuditAction.PatientUpdated, AuditResource.Patient, patientId, details);
  }

  public async logMedicalRecordAccess(recordId: string, details?: AuditLogDetails): Promise<string> {
    return this.log(AuditAction.MedicalRecordAccessed, AuditResource.MedicalRecord, recordId, details);
  }

  public async logSecurityPolicyChange(policyName: string, details?: AuditLogDetails): Promise<string> {
    return this.log(AuditAction.SecurityPolicyChanged, AuditResource.Security, policyName, details);
  }

  public async logDataRetentionPolicyChange(policyName: string, details?: AuditLogDetails): Promise<string> {
    return this.log(AuditAction.DataRetentionPolicyChanged, AuditResource.Security, policyName, details);
  }
}

// Factory function for Edge Runtime
export function createEdgeAuditLogger(
  tenantId: string,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
): EdgeAuditLogger {
  return new EdgeAuditLogger(tenantId, userId, ipAddress, userAgent);
}
