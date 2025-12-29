/**
 * Performance Monitoring and Metrics
 * 
 * Comprehensive performance tracking for upload operations, image processing,
 * and CDN delivery with detailed metrics and alerting.
 */

import { logger } from '@/lib/logger';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
  metadata: {
    fileSize?: number;
    optimizedSize?: number;
    compressionRatio?: number;
    format?: string;
    dimensions?: { width: number; height: number };
    cacheHit?: boolean;
    chunkCount?: number;
    retryCount?: number;
    throughput?: number;
    memoryUsage?: number;
  };
}

export interface PerformanceAlert {
  type: 'slow_operation' | 'high_error_rate' | 'memory_usage' | 'timeout' | 'compression_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  metrics: PerformanceMetrics;
  threshold: number;
  actual: number;
}

export interface PerformanceReport {
  period: { start: number; end: number };
  totalOperations: number;
  successRate: number;
  averageDuration: number;
  throughput: number;
  errorRate: number;
  topErrors: { error: string; count: number }[];
  performanceTrends: {
    operation: string;
    averageDuration: number;
    successRate: number;
    trend: 'improving' | 'stable' | 'degrading';
  }[];
  alerts: PerformanceAlert[];
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetrics[] = [];
  private static alerts: PerformanceAlert[] = [];
  private static readonly MAX_METRICS = 10000; // Keep last 10k metrics
  private static readonly ALERT_THRESHOLDS = {
    slow_operation: 5000, // 5 seconds
    high_error_rate: 0.1, // 10%
    memory_usage: 0.8, // 80%
    timeout: 30000, // 30 seconds
    compression_failure: 0.05 // 5%
  };

  /**
   * Record performance metrics
   */
  static recordMetrics(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    const fullMetrics: PerformanceMetrics = {
      ...metrics,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetrics);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Check for alerts
    this.checkAlerts(fullMetrics);

    // Log performance
    this.logPerformance(fullMetrics);
  }

  /**
   * Record upload operation metrics
   */
  static recordUploadMetrics(
    operation: string,
    duration: number,
    success: boolean,
    metadata: {
      fileSize: number;
      optimizedSize?: number;
      format?: string;
      dimensions?: { width: number; height: number };
      chunkCount?: number;
      retryCount?: number;
    },
    error?: string
  ): void {
    const compressionRatio = metadata.optimizedSize && metadata.fileSize 
      ? ((metadata.fileSize - metadata.optimizedSize) / metadata.fileSize) * 100 
      : undefined;

    const throughput = metadata.fileSize / (duration / 1000); // bytes per second

    this.recordMetrics({
      operation,
      duration,
      success,
      error,
      metadata: {
        ...metadata,
        compressionRatio,
        throughput
      }
    });
  }

  /**
   * Record image processing metrics
   */
  static recordImageProcessingMetrics(
    operation: string,
    duration: number,
    success: boolean,
    metadata: {
      originalSize: number;
      optimizedSize: number;
      format: string;
      dimensions: { width: number; height: number };
    },
    error?: string
  ): void {
    const compressionRatio = ((metadata.originalSize - metadata.optimizedSize) / metadata.originalSize) * 100;
    const throughput = metadata.originalSize / (duration / 1000);

    this.recordMetrics({
      operation,
      duration,
      success,
      error,
      metadata: {
        ...metadata,
        compressionRatio,
        throughput
      }
    });
  }

  /**
   * Record CDN delivery metrics
   */
  static recordCDNMetrics(
    operation: string,
    duration: number,
    success: boolean,
    metadata: {
      fileSize: number;
      cacheHit: boolean;
      compression?: string;
      compressionRatio?: number;
    },
    error?: string
  ): void {
    this.recordMetrics({
      operation,
      duration,
      success,
      error,
      metadata
    });
  }

  /**
   * Check for performance alerts
   */
  private static checkAlerts(metrics: PerformanceMetrics): void {
    // Slow operation alert
    if (metrics.duration > this.ALERT_THRESHOLDS.slow_operation) {
      this.createAlert({
        type: 'slow_operation',
        severity: metrics.duration > 10000 ? 'critical' : 'high',
        message: `Slow operation detected: ${metrics.operation} took ${metrics.duration}ms`,
        metrics,
        threshold: this.ALERT_THRESHOLDS.slow_operation,
        actual: metrics.duration
      });
    }

    // Memory usage alert
    if (metrics.metadata.memoryUsage && metrics.metadata.memoryUsage > this.ALERT_THRESHOLDS.memory_usage) {
      this.createAlert({
        type: 'memory_usage',
        severity: 'high',
        message: `High memory usage: ${(metrics.metadata.memoryUsage * 100).toFixed(1)}%`,
        metrics,
        threshold: this.ALERT_THRESHOLDS.memory_usage,
        actual: metrics.metadata.memoryUsage
      });
    }

    // Compression failure alert
    if (metrics.metadata.compressionRatio !== undefined && metrics.metadata.compressionRatio < 0) {
      this.createAlert({
        type: 'compression_failure',
        severity: 'medium',
        message: `Compression failed: file size increased by ${Math.abs(metrics.metadata.compressionRatio).toFixed(1)}%`,
        metrics,
        threshold: 0,
        actual: metrics.metadata.compressionRatio
      });
    }
  }

  /**
   * Create performance alert
   */
  private static createAlert(alert: Omit<PerformanceAlert, 'timestamp'>): void {
    const fullAlert: PerformanceAlert = {
      ...alert,
      timestamp: Date.now()
    };

    this.alerts.push(fullAlert);

    // Log alert
    logger.warn(`Performance Alert [${alert.severity.toUpperCase()}]: ${alert.message}`, JSON.stringify({
      operation: alert.metrics.operation,
      duration: alert.metrics.duration,
      threshold: alert.threshold,
      actual: alert.actual
    }));

    // Send critical alerts immediately
    if (alert.severity === 'critical') {
      this.sendCriticalAlert(fullAlert);
    }
  }

  /**
   * Send critical alert (implement notification system)
   */
  private static sendCriticalAlert(alert: PerformanceAlert): void {
    // TODO: Implement notification system (email, Slack, etc.)
    logger.error(`CRITICAL PERFORMANCE ALERT: ${alert.message}`, JSON.stringify({
      operation: alert.metrics.operation,
      duration: alert.metrics.duration,
      metadata: alert.metrics.metadata
    }));
  }

  /**
   * Generate performance report
   */
  static generateReport(periodHours: number = 24): PerformanceReport {
    const now = Date.now();
    const start = now - (periodHours * 60 * 60 * 1000);
    
    const periodMetrics = this.metrics.filter(m => m.timestamp >= start && m.timestamp <= now);
    const periodAlerts = this.alerts.filter(a => a.timestamp >= start && a.timestamp <= now);

    // Calculate basic statistics
    const totalOperations = periodMetrics.length;
    const successfulOperations = periodMetrics.filter(m => m.success).length;
    const successRate = totalOperations > 0 ? successfulOperations / totalOperations : 0;
    const errorRate = 1 - successRate;

    const durations = periodMetrics.map(m => m.duration);
    const averageDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const totalSize = periodMetrics.reduce((sum, m) => sum + (m.metadata.fileSize || 0), 0);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const throughput = totalDuration > 0 ? totalSize / (totalDuration / 1000) : 0;

    // Top errors
    const errorCounts = new Map<string, number>();
    periodMetrics.filter(m => !m.success && m.error).forEach(m => {
      const error = m.error!;
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    });
    const topErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Performance trends by operation
    const operationGroups = new Map<string, PerformanceMetrics[]>();
    periodMetrics.forEach(m => {
      const group = operationGroups.get(m.operation) || [];
      group.push(m);
      operationGroups.set(m.operation, group);
    });

    const performanceTrends = Array.from(operationGroups.entries()).map(([operation, metrics]) => {
      const opSuccessRate = metrics.filter(m => m.success).length / metrics.length;
      const opAverageDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      
      // Simple trend calculation (compare first half vs second half)
      const midPoint = Math.floor(metrics.length / 2);
      const firstHalf = metrics.slice(0, midPoint);
      const secondHalf = metrics.slice(midPoint);
      
      const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.duration, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.duration, 0) / secondHalf.length;
      
      let trend: 'improving' | 'stable' | 'degrading' = 'stable';
      if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'improving';
      else if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'degrading';

      return {
        operation,
        averageDuration: opAverageDuration,
        successRate: opSuccessRate,
        trend
      };
    });

    return {
      period: { start, end: now },
      totalOperations,
      successRate,
      averageDuration,
      throughput,
      errorRate,
      topErrors,
      performanceTrends,
      alerts: periodAlerts
    };
  }

  /**
   * Get current performance status
   */
  static getCurrentStatus(): {
    activeUploads: number;
    averageResponseTime: number;
    errorRate: number;
    memoryUsage: number;
    alerts: PerformanceAlert[];
  } {
    const recentMetrics = this.metrics.filter(m => m.timestamp > Date.now() - 300000); // Last 5 minutes
    const recentAlerts = this.alerts.filter(a => a.timestamp > Date.now() - 300000);

    const activeUploads = recentMetrics.filter(m => 
      m.operation.includes('upload') && m.timestamp > Date.now() - 60000
    ).length;

    const averageResponseTime = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length 
      : 0;

    const errorRate = recentMetrics.length > 0 
      ? recentMetrics.filter(m => !m.success).length / recentMetrics.length 
      : 0;

    const memoryUsage = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;

    return {
      activeUploads,
      averageResponseTime,
      errorRate,
      memoryUsage,
      alerts: recentAlerts
    };
  }

  /**
   * Log performance metrics
   */
  private static logPerformance(metrics: PerformanceMetrics): void {
    const logData = {
      operation: metrics.operation,
      duration: `${metrics.duration}ms`,
      success: metrics.success,
      fileSize: metrics.metadata.fileSize ? `${(metrics.metadata.fileSize / 1024).toFixed(2)}KB` : 'N/A',
      compressionRatio: metrics.metadata.compressionRatio ? `${metrics.metadata.compressionRatio.toFixed(1)}%` : 'N/A',
      throughput: metrics.metadata.throughput ? `${(metrics.metadata.throughput / 1024).toFixed(2)}KB/s` : 'N/A'
    };

    if (metrics.success) {
      logger.info('Performance Metrics', JSON.stringify(logData));
    } else {
      logger.warn('Performance Metrics (Failed)', JSON.stringify({ ...logData, error: metrics.error }));
    }
  }

  /**
   * Clear old metrics and alerts
   */
  static cleanup(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
    
    logger.info(`Cleaned up performance data. Metrics: ${this.metrics.length}, Alerts: ${this.alerts.length}`);
  }

  /**
   * Export metrics for external monitoring
   */
  static exportMetrics(): {
    metrics: PerformanceMetrics[];
    alerts: PerformanceAlert[];
    status: any;
  } {
    return {
      metrics: this.metrics,
      alerts: this.alerts,
      status: this.getCurrentStatus()
    };
  }
}

// Cleanup old data every hour
setInterval(() => {
  PerformanceMonitor.cleanup();
}, 60 * 60 * 1000);

// Log performance status every 5 minutes
setInterval(() => {
  const status = PerformanceMonitor.getCurrentStatus();
  logger.info('Performance Status', JSON.stringify({
    activeUploads: status.activeUploads,
    averageResponseTime: `${status.averageResponseTime.toFixed(0)}ms`,
    errorRate: `${(status.errorRate * 100).toFixed(1)}%`,
    memoryUsage: `${(status.memoryUsage * 100).toFixed(1)}%`,
    activeAlerts: status.alerts.length
  }));
}, 5 * 60 * 1000);
