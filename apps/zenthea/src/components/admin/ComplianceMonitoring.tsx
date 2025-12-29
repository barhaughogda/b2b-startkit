"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  AlertTriangle,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  FileText,
  ClipboardCheck,
} from "lucide-react";

interface ComplianceData {
  hipaaStatus: "compliant" | "warning" | "non-compliant";
  auditLogCount: {
    total: number;
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
  dataRetentionStatus: "compliant" | "non-compliant";
  complianceScore: number;
  complianceLevel: "excellent" | "good" | "fair" | "poor";
  violations: {
    total: number;
    recent: number;
  };
  lastUpdated: number;
}

interface ComplianceResponse {
  success: boolean;
  data: ComplianceData;
  error?: string;
}

interface ComplianceMonitoringProps {
  className?: string;
}

/**
 * ComplianceMonitoring Component
 * 
 * Displays HIPAA compliance monitoring dashboard with:
 * - Compliance status dashboard
 * - HIPAA compliance checklist
 * - Violation alerts
 * - Remediation suggestions
 * - Compliance reports
 * - Compliance score display
 * 
 * Features:
 * - Real-time compliance monitoring
 * - HIPAA compliance checklist with status indicators
 * - Violation tracking and alerts
 * - Remediation suggestions
 * - Compliance report generation
 * 
 * @param className - Optional CSS class name for styling
 * 
 * @example
 * ```tsx
 * <ComplianceMonitoring />
 * ```
 */
export function ComplianceMonitoring({ className }: ComplianceMonitoringProps) {
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComplianceData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/compliance-metrics");
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch compliance data");
      }
      
      const data: ComplianceResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch compliance data");
      }

      setComplianceData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load compliance data");
      setComplianceData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplianceData();
  }, [fetchComplianceData]);

  const handleRefresh = () => {
    fetchComplianceData();
  };

  /**
   * Handles export of compliance report
   * TODO: Implement PDF/CSV export functionality
   */
  const handleGenerateReport = () => {
    // Export functionality - will be implemented in future iteration
    if (process.env.NODE_ENV === 'development') {
      console.log("Generate compliance report");
    }
  };

  /**
   * Gets status color based on compliance status
   */
  const getStatusColor = (status: string): string => {
    if (status === "compliant") return "text-status-success";
    if (status === "warning") return "text-status-warning";
    return "text-status-error";
  };

  /**
   * Gets status icon based on compliance status
   */
  const getStatusIcon = (status: string) => {
    if (status === "compliant") return <CheckCircle2 className="h-5 w-5 text-status-success" />;
    if (status === "warning") return <AlertTriangle className="h-5 w-5 text-status-warning" />;
    return <XCircle className="h-5 w-5 text-status-error" />;
  };

  /**
   * HIPAA compliance checklist items
   */
  const hipaaChecklistItems = [
    { id: "audit-logging", label: "Audit Logging", status: complianceData?.auditLogCount.total ? "compliant" : "non-compliant" },
    { id: "data-encryption", label: "Data Encryption", status: complianceData?.dataRetentionStatus === "compliant" ? "compliant" : "non-compliant" },
    { id: "access-controls", label: "Access Controls", status: complianceData?.violations.recent === 0 ? "compliant" : "non-compliant" },
    { id: "data-retention", label: "Data Retention", status: complianceData?.dataRetentionStatus },
  ];

  /**
   * Remediation suggestions based on violations
   */
  const getRemediationSuggestions = (): string[] => {
    if (!complianceData || complianceData.violations.recent === 0) {
      return [];
    }

    const suggestions: string[] = [];
    
    if (complianceData.violations.recent > 0) {
      suggestions.push("Review recent access violations and ensure proper access controls are in place");
    }
    
    if (complianceData.complianceScore < 75) {
      suggestions.push("Address compliance violations to improve overall compliance score");
    }
    
    if (complianceData.hipaaStatus === "non-compliant") {
      suggestions.push("Immediate action required: System is non-compliant with HIPAA requirements");
    }

    return suggestions;
  };

  if (isLoading) {
    return (
      <div className={className}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Compliance Monitoring</h1>
          <p className="text-text-secondary mt-1">HIPAA compliance monitoring and reporting</p>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Compliance Monitoring</h1>
          <p className="text-text-secondary mt-1">HIPAA compliance monitoring and reporting</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const remediationSuggestions = getRemediationSuggestions();

  return (
    <div className={className}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Compliance Monitoring</h1>
          <p className="text-text-secondary mt-1">HIPAA compliance monitoring and reporting</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleGenerateReport}>
            <Download className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Status Dashboard */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance Status Dashboard
            </CardTitle>
            <CardDescription>Current HIPAA compliance status and metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="border border-border-primary rounded-lg p-4">
                <div className="text-sm text-text-secondary mb-1">HIPAA Status</div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(complianceData?.hipaaStatus || "compliant")}
                  <span className={`font-semibold ${getStatusColor(complianceData?.hipaaStatus || "compliant")}`}>
                    {complianceData?.hipaaStatus?.toUpperCase() || "COMPLIANT"}
                  </span>
                </div>
              </div>
              <div className="border border-border-primary rounded-lg p-4">
                <div className="text-sm text-text-secondary mb-1">Compliance Score</div>
                <div className="text-2xl font-bold text-text-primary">
                  {complianceData?.complianceScore || 0}
                </div>
                <div className="text-xs text-text-secondary">
                  {complianceData?.complianceLevel?.toUpperCase() || "EXCELLENT"}
                </div>
              </div>
              <div className="border border-border-primary rounded-lg p-4">
                <div className="text-sm text-text-secondary mb-1">Data Retention</div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(complianceData?.dataRetentionStatus || "compliant")}
                  <span className={`font-semibold ${getStatusColor(complianceData?.dataRetentionStatus || "compliant")}`}>
                    {complianceData?.dataRetentionStatus?.toUpperCase() || "COMPLIANT"}
                  </span>
                </div>
              </div>
              <div className="border border-border-primary rounded-lg p-4">
                <div className="text-sm text-text-secondary mb-1">Total Violations</div>
                <div className="text-2xl font-bold text-text-primary">
                  {complianceData?.violations.total || 0}
                </div>
                <div className="text-xs text-text-secondary">
                  {complianceData?.violations.recent || 0} recent
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HIPAA Compliance Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              HIPAA Compliance Checklist
            </CardTitle>
            <CardDescription>HIPAA compliance requirements status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hipaaChecklistItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border border-border-primary rounded-lg p-3"
                >
                  <span className="text-sm text-text-primary">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status || "compliant")}
                    <span className={`text-xs font-medium ${getStatusColor(item.status || "compliant")}`}>
                      {item.status?.toUpperCase() || "COMPLIANT"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Violation Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Violations
            </CardTitle>
            <CardDescription>Compliance violations and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border border-border-primary rounded-lg p-4">
                <div className="text-sm text-text-secondary mb-1">Total Violations</div>
                <div className="text-2xl font-bold text-text-primary">
                  {complianceData?.violations.total || 0}
                </div>
              </div>
              <div className="border border-border-primary rounded-lg p-4">
                <div className="text-sm text-text-secondary mb-1">Recent Violations</div>
                <div className="text-2xl font-bold text-text-primary">
                  {complianceData?.violations.recent || 0}
                </div>
              </div>
              {complianceData && complianceData.violations.recent > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {complianceData.violations.recent} recent violation{complianceData.violations.recent !== 1 ? "s" : ""} detected
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Remediation Suggestions */}
        {(remediationSuggestions.length > 0 || complianceData?.violations.recent === 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Remediation Suggestions
              </CardTitle>
              <CardDescription>Recommendations for compliance improvements</CardDescription>
            </CardHeader>
            <CardContent>
              {remediationSuggestions.length > 0 ? (
                <div className="space-y-2">
                  {remediationSuggestions.map((suggestion, index) => (
                    <Alert key={index}>
                      <AlertDescription className="text-sm">{suggestion}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-text-secondary">
                  No action needed - System is compliant
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Compliance Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reports
            </CardTitle>
            <CardDescription>Generate compliance reports</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGenerateReport} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>

        {/* Audit Log Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Logs
            </CardTitle>
            <CardDescription>Audit log statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Total</span>
                <span className="font-semibold text-text-primary">{complianceData?.auditLogCount.total || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Last 24 Hours</span>
                <span className="font-semibold text-text-primary">{complianceData?.auditLogCount.last24Hours || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Last 7 Days</span>
                <span className="font-semibold text-text-primary">{complianceData?.auditLogCount.last7Days || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Last 30 Days</span>
                <span className="font-semibold text-text-primary">{complianceData?.auditLogCount.last30Days || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

