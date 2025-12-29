/**
 * Performance Monitoring API
 * 
 * Provides performance metrics, status, and reports for upload operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { PerformanceMonitor } from '@/lib/monitoring/performance-metrics';
import { logger } from '@/lib/logger';

// Force dynamic rendering - this route uses request.url
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'status';
    const periodHours = parseInt(url.searchParams.get('period') || '24');

    switch (action) {
      case 'status':
        return getCurrentStatus();
      
      case 'report':
        return getPerformanceReport(periodHours);
      
      case 'metrics':
        return getMetrics();
      
      case 'alerts':
        return getAlerts();
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: status, report, metrics, or alerts' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Performance API error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to retrieve performance data' },
      { status: 500 }
    );
  }
}

/**
 * Get current performance status
 */
function getCurrentStatus() {
  const status = PerformanceMonitor.getCurrentStatus();
  
  return NextResponse.json({
    success: true,
    status: {
      ...status,
      memoryUsage: `${(status.memoryUsage * 100).toFixed(1)}%`,
      averageResponseTime: `${status.averageResponseTime.toFixed(0)}ms`,
      errorRate: `${(status.errorRate * 100).toFixed(1)}%`
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Get performance report for specified period
 */
function getPerformanceReport(periodHours: number) {
  const report = PerformanceMonitor.generateReport(periodHours);
  
  return NextResponse.json({
    success: true,
    report: {
      ...report,
      successRate: `${(report.successRate * 100).toFixed(1)}%`,
      errorRate: `${(report.errorRate * 100).toFixed(1)}%`,
      averageDuration: `${report.averageDuration.toFixed(0)}ms`,
      throughput: `${(report.throughput / 1024).toFixed(2)}KB/s`
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Get raw metrics data
 */
function getMetrics() {
  const data = PerformanceMonitor.exportMetrics();
  
  return NextResponse.json({
    success: true,
    data: {
      metricsCount: data.metrics.length,
      alertsCount: data.alerts.length,
      status: data.status
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Get performance alerts
 */
function getAlerts() {
  const data = PerformanceMonitor.exportMetrics();
  const recentAlerts = data.alerts.filter(
    alert => alert.timestamp > Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
  );
  
  return NextResponse.json({
    success: true,
    alerts: recentAlerts,
    summary: {
      total: recentAlerts.length,
      critical: recentAlerts.filter(a => a.severity === 'critical').length,
      high: recentAlerts.filter(a => a.severity === 'high').length,
      medium: recentAlerts.filter(a => a.severity === 'medium').length,
      low: recentAlerts.filter(a => a.severity === 'low').length
    },
    timestamp: new Date().toISOString()
  });
}
