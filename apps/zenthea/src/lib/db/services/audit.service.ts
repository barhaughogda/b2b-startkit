import { db } from '@startkit/database'
import { auditLogs } from '@startkit/database/schema'
import type { AuditAction, AuditResource } from '@/lib/security/auditLogger.edge'

/**
 * Zenthea Audit Service
 * 
 * Handles HIPAA-compliant audit logging for PHI interactions.
 */
export class AuditService {
  /**
   * Log an action to the database
   */
  static async log(params: {
    organizationId: string
    userId?: string
    action: string
    resource: string
    resourceId: string
    details?: any
    ipAddress?: string
    userAgent?: string
    phiAccessed?: {
      patientId: string
      dataElements: string[]
      purpose: string
    }
  }) {
    console.log(`[Audit] ${params.action} on ${params.resource}:${params.resourceId}`)
    
    try {
      await db.insert(auditLogs).values({
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        resourceType: params.resource,
        resourceId: params.resourceId,
        metadata: {
          ...params.details,
          phiAccessed: params.phiAccessed,
          userAgent: params.userAgent,
          ipAddress: params.ipAddress,
        },
        createdAt: new Date(),
      })
    } catch (error) {
      console.error('Failed to write audit log:', error)
      // We don't throw here to avoid blocking business operations, 
      // but in production this should be high-reliability.
    }
  }

  /**
   * Log access to patient PHI
   */
  static async logPHIAccess(params: {
    patientId: string
    organizationId: string
    userId: string
    dataElements: string[]
    purpose: string
    ipAddress?: string
    userAgent?: string
  }) {
    return await this.log({
      organizationId: params.organizationId,
      userId: params.userId,
      action: 'phi_access',
      resource: 'patient',
      resourceId: params.patientId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      phiAccessed: {
        patientId: params.patientId,
        dataElements: params.dataElements,
        purpose: params.purpose,
      }
    })
  }
}
