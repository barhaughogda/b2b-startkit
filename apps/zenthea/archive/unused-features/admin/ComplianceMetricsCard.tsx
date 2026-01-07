"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface ComplianceMetrics {
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

interface ComplianceMetricsCardProps {
  metrics?: ComplianceMetrics;
  isLoading?: boolean;
  error?: string;
}

export function ComplianceMetricsCard({
  metrics,
  isLoading,
  error,
}: ComplianceMetricsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compliance</CardTitle>
          <CardDescription>HIPAA compliance and audit logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-status-error">
        <CardHeader>
          <CardTitle>Compliance</CardTitle>
          <CardDescription>HIPAA compliance and audit logs</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-status-error text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  const statusColors = {
    compliant: "text-status-success",
    warning: "text-status-warning",
    "non-compliant": "text-status-error",
  };

  const statusIcons = {
    compliant: CheckCircle2,
    warning: AlertCircle,
    "non-compliant": AlertCircle,
  };

  const scoreColors = {
    excellent: "text-status-success",
    good: "text-status-success",
    fair: "text-status-warning",
    poor: "text-status-error",
  };

  const StatusIcon = statusIcons[metrics.hipaaStatus];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Compliance
        </CardTitle>
        <CardDescription>HIPAA compliance and audit logs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${statusColors[metrics.hipaaStatus]}`} />
              <span className="text-sm text-text-secondary">HIPAA Status</span>
            </div>
            <span
              className={`text-sm font-medium capitalize ${statusColors[metrics.hipaaStatus]}`}
            >
              {metrics.hipaaStatus.replace("-", " ")}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">Compliance Score</span>
            </div>
            <span
              className={`text-lg font-semibold ${scoreColors[metrics.complianceLevel]}`}
            >
              {metrics.complianceScore}%
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">Audit Logs (24h)</span>
            </div>
            <span className="text-lg font-semibold text-text-primary">
              {metrics.auditLogCount.last24Hours.toLocaleString()}
            </span>
          </div>

          <div className="pt-2 border-t border-border-primary">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Violations</span>
              <span className="text-sm font-medium text-text-primary">
                {metrics.violations.recent} recent
              </span>
            </div>
            <div className="text-xs text-text-tertiary">
              {metrics.auditLogCount.total.toLocaleString()} total audit logs
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

