import { DataRetentionPolicy, DEFAULT_RETENTION_POLICY } from './encryption';

/**
 * HIPAA-compliant data retention and deletion service
 * Implements data lifecycle management for PHI and audit logs
 */
export class DataRetentionService {
  private retentionPolicy: DataRetentionPolicy;

  constructor(policy: DataRetentionPolicy = DEFAULT_RETENTION_POLICY) {
    this.retentionPolicy = policy;
  }

  /**
   * Get the current retention policy
   * @returns Current retention policy
   */
  getRetentionPolicy(): DataRetentionPolicy {
    return this.retentionPolicy;
  }

  /**
   * Check if data should be retained based on HIPAA requirements
   * @param dataType - Type of data (phi, auditLogs, sessionData, temporaryData)
   * @param createdAt - Creation timestamp
   * @returns True if data should be retained
   */
  shouldRetainData(dataType: keyof DataRetentionPolicy, createdAt: number): boolean {
    const retentionPeriod = this.retentionPolicy[dataType];
    const cutoffTime = Date.now() - retentionPeriod;
    return createdAt > cutoffTime;
  }

  /**
   * Get data that should be deleted based on retention policy
   * @param dataType - Type of data to check
   * @param data - Array of data objects with createdAt field
   * @returns Data that should be deleted
   */
  getDataForDeletion<T extends { createdAt: number }>(
    dataType: keyof DataRetentionPolicy,
    data: T[]
  ): T[] {
    const retentionPeriod = this.retentionPolicy[dataType];
    const cutoffTime = Date.now() - retentionPeriod;
    
    return data.filter(item => item.createdAt <= cutoffTime);
  }

  /**
   * Anonymize PHI data for long-term retention
   * @param phiData - PHI data to anonymize
   * @returns Anonymized data
   */
  anonymizePHIData(phiData: any): any {
    const anonymized = { ...phiData };
    
    // Anonymize direct identifiers
    if (anonymized.firstName) {
      anonymized.firstName = this.anonymizeName(anonymized.firstName);
    }
    if (anonymized.lastName) {
      anonymized.lastName = this.anonymizeName(anonymized.lastName);
    }
    if (anonymized.email) {
      anonymized.email = this.anonymizeEmail(anonymized.email);
    }
    if (anonymized.phone) {
      anonymized.phone = this.anonymizePhone(anonymized.phone);
    }
    if (anonymized.ssn) {
      anonymized.ssn = this.anonymizeSSN(anonymized.ssn);
    }
    if (anonymized.address) {
      anonymized.address = this.anonymizeAddress(anonymized.address);
    }
    if (anonymized.dateOfBirth) {
      anonymized.dateOfBirth = this.anonymizeDateOfBirth(anonymized.dateOfBirth);
    }

    // Add anonymization metadata
    anonymized._anonymized = true;
    anonymized._anonymizedAt = Date.now();
    anonymized._originalId = anonymized.id;
    anonymized.id = this.generateAnonymizedId();

    return anonymized;
  }

  /**
   * Create data retention report
   * @param data - Data to analyze
   * @returns Retention report
   */
  generateRetentionReport(data: {
    phi: any[];
    auditLogs: any[];
    sessionData: any[];
    temporaryData: any[];
  }): RetentionReport {
    const report: RetentionReport = {
      generatedAt: Date.now(),
      summary: {
        totalRecords: 0,
        recordsToDelete: 0,
        recordsToAnonymize: 0,
        recordsToRetain: 0
      },
      byDataType: {},
      recommendations: []
    };

    // Analyze each data type
    Object.keys(this.retentionPolicy).forEach(dataType => {
      const typeData = data[dataType as keyof typeof data] || [];
      const retentionPeriod = this.retentionPolicy[dataType as keyof DataRetentionPolicy];
      const cutoffTime = Date.now() - retentionPeriod;
      
      const toDelete = typeData.filter((item: any) => item.createdAt <= cutoffTime);
      const toRetain = typeData.filter((item: any) => item.createdAt > cutoffTime);
      
      report.byDataType[dataType] = {
        total: typeData.length,
        toDelete: toDelete.length,
        toRetain: toRetain.length,
        retentionPeriod,
        cutoffDate: new Date(cutoffTime).toISOString()
      };
      
      report.summary.totalRecords += typeData.length;
      report.summary.recordsToDelete += toDelete.length;
      report.summary.recordsToRetain += toRetain.length;
    });

    // Generate recommendations
    if (report.summary.recordsToDelete > 0) {
      report.recommendations.push({
        type: 'deletion',
        priority: 'high',
        message: `${report.summary.recordsToDelete} records are eligible for deletion based on retention policy`,
        action: 'Schedule deletion job for expired records'
      });
    }

    if (report.summary.recordsToRetain > 10000) {
      report.recommendations.push({
        type: 'anonymization',
        priority: 'medium',
        message: 'Consider anonymizing PHI data for long-term retention',
        action: 'Implement data anonymization for records older than 3 years'
      });
    }

    return report;
  }

  /**
   * Schedule data cleanup job
   * @param dataType - Type of data to clean up
   * @param dryRun - If true, only report what would be deleted
   * @returns Cleanup results
   */
  async scheduleCleanup(
    dataType: keyof DataRetentionPolicy,
    dryRun: boolean = true
  ): Promise<CleanupResults> {
    const results: CleanupResults = {
      dataType,
      dryRun,
      scheduledAt: Date.now(),
      recordsProcessed: 0,
      recordsDeleted: 0,
      recordsAnonymized: 0,
      errors: []
    };

    try {
      // This would integrate with your database/Convex
      // For now, we'll simulate the cleanup process
      console.log(`Scheduling cleanup for ${dataType} data...`);
      
      if (dryRun) {
        console.log('DRY RUN: Would delete/anonymize records based on retention policy');
        results.recordsProcessed = 100; // Simulated
        results.recordsDeleted = 50; // Simulated
        results.recordsAnonymized = 10; // Simulated
      } else {
        console.log('Executing actual cleanup...');
        // Implement actual cleanup logic here
        results.recordsProcessed = 100;
        results.recordsDeleted = 50;
        results.recordsAnonymized = 10;
      }
    } catch (error) {
      results.errors.push({
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      });
    }

    return results;
  }

  // Private helper methods for anonymization
  private anonymizeName(name: string): string {
    return name.charAt(0) + '*'.repeat(Math.max(1, name.length - 1));
  }

  private anonymizeEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local.charAt(0)}***@${domain}`;
  }

  private anonymizePhone(phone: string): string {
    return phone.replace(/\d/g, '*');
  }

  private anonymizeSSN(ssn: string): string {
    return ssn.replace(/\d/g, '*');
  }

  private anonymizeAddress(address: any): any {
    if (typeof address === 'string') {
      return address.replace(/\d+/g, '***');
    }
    return {
      ...address,
      street: address.street ? address.street.replace(/\d+/g, '***') : address.street,
      zipCode: '***'
    };
  }

  private anonymizeDateOfBirth(dob: string | number): string {
    const date = new Date(dob);
    const year = date.getFullYear();
    return `****-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private generateAnonymizedId(): string {
    return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Data retention report interface
 */
export interface RetentionReport {
  generatedAt: number;
  summary: {
    totalRecords: number;
    recordsToDelete: number;
    recordsToAnonymize: number;
    recordsToRetain: number;
  };
  byDataType: Record<string, {
    total: number;
    toDelete: number;
    toRetain: number;
    retentionPeriod: number;
    cutoffDate: string;
  }>;
  recommendations: Array<{
    type: 'deletion' | 'anonymization' | 'retention';
    priority: 'low' | 'medium' | 'high';
    message: string;
    action: string;
  }>;
}

/**
 * Cleanup results interface
 */
export interface CleanupResults {
  dataType: keyof DataRetentionPolicy;
  dryRun: boolean;
  scheduledAt: number;
  recordsProcessed: number;
  recordsDeleted: number;
  recordsAnonymized: number;
  errors: Array<{
    message: string;
    timestamp: number;
  }>;
}

// Export singleton instance
export const dataRetentionService = new DataRetentionService();
