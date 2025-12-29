"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UsersRound, Calendar, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface SystemMetrics {
  totalUsers: number;
  totalPatients: number;
  totalAppointments: number;
  activeUsers: number;
  activeUserRatio: number;
  recentActiveUsers: number;
  systemHealth: "healthy" | "warning" | "critical";
  lastUpdated: number;
}

interface SystemMetricsCardProps {
  metrics?: SystemMetrics;
  isLoading?: boolean;
  error?: string;
}

export function SystemMetricsCard({
  metrics,
  isLoading,
  error,
}: SystemMetricsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
          <CardDescription>Monitor system health and performance</CardDescription>
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
          <CardTitle>System Overview</CardTitle>
          <CardDescription>Monitor system health and performance</CardDescription>
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

  const healthColors = {
    healthy: "text-status-success",
    warning: "text-status-warning",
    critical: "text-status-error",
  };

  const healthLabels = {
    healthy: "Healthy",
    warning: "Warning",
    critical: "Critical",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Overview
        </CardTitle>
        <CardDescription>Monitor system health and performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">Total Users</span>
            </div>
            <span className="text-lg font-semibold text-text-primary">
              {metrics.totalUsers.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">Total Patients</span>
            </div>
            <span className="text-lg font-semibold text-text-primary">
              {metrics.totalPatients.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">Total Appointments</span>
            </div>
            <span className="text-lg font-semibold text-text-primary">
              {metrics.totalAppointments.toLocaleString()}
            </span>
          </div>

          <div className="pt-2 border-t border-border-primary">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">System Health</span>
              <span
                className={`text-sm font-medium ${healthColors[metrics.systemHealth]}`}
              >
                {healthLabels[metrics.systemHealth]}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-text-tertiary">Active Users</span>
              <span className="text-xs text-text-tertiary">
                {metrics.activeUsers} ({metrics.activeUserRatio}%)
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

