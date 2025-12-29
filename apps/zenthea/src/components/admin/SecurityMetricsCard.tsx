"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface SecurityMetrics {
  recentSecurityEvents: number;
  failedLogins: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
    total: number;
  };
  complianceViolations: {
    last24Hours: number;
    last7Days: number;
    total: number;
  };
  threatIndicators: {
    accountLockouts: number;
    suspiciousPatterns: boolean;
    threatLevel: "low" | "medium" | "high";
  };
  lastUpdated: number;
}

interface SecurityMetricsCardProps {
  metrics?: SecurityMetrics;
  isLoading?: boolean;
  error?: string;
}

export function SecurityMetricsCard({
  metrics,
  isLoading,
  error,
}: SecurityMetricsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Monitor security events and threats</CardDescription>
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
          <CardTitle>Security</CardTitle>
          <CardDescription>Monitor security events and threats</CardDescription>
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

  const threatColors = {
    low: "text-status-success",
    medium: "text-status-warning",
    high: "text-status-error",
  };

  const threatLabels = {
    low: "Low",
    medium: "Medium",
    high: "High",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security
        </CardTitle>
        <CardDescription>Monitor security events and threats</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">Recent Events (24h)</span>
            </div>
            <span className="text-lg font-semibold text-text-primary">
              {metrics.recentSecurityEvents.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">Failed Logins (24h)</span>
            </div>
            <span className="text-lg font-semibold text-text-primary">
              {metrics.failedLogins.last24Hours.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">Violations (24h)</span>
            </div>
            <span className="text-lg font-semibold text-text-primary">
              {metrics.complianceViolations.last24Hours.toLocaleString()}
            </span>
          </div>

          <div className="pt-2 border-t border-border-primary">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Threat Level</span>
              <span
                className={`text-sm font-medium ${threatColors[metrics.threatIndicators.threatLevel]}`}
              >
                {threatLabels[metrics.threatIndicators.threatLevel]}
              </span>
            </div>
            {metrics.threatIndicators.accountLockouts > 0 && (
              <div className="mt-1 text-xs text-text-tertiary">
                {metrics.threatIndicators.accountLockouts} account lockout(s)
              </div>
            )}
            {metrics.threatIndicators.suspiciousPatterns && (
              <div className="mt-1 text-xs text-status-warning">
                Suspicious activity detected
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

