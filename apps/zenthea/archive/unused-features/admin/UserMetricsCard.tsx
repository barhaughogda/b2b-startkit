"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface UserMetrics {
  activeUsers: number;
  totalUsers: number;
  newUsers: number;
  usersByRole: {
    admin: number;
    provider: number;
    demo: number;
    patient: number;
  };
  lastLoginStats: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
    neverLoggedIn: number;
  };
  lastUpdated: number;
}

interface UserMetricsCardProps {
  metrics?: UserMetrics;
  isLoading?: boolean;
  error?: string;
}

export function UserMetricsCard({
  metrics,
  isLoading,
  error,
}: UserMetricsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage users and permissions</CardDescription>
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
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage users and permissions</CardDescription>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
        </CardTitle>
        <CardDescription>Manage users and permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">Active Users</span>
            </div>
            <span className="text-lg font-semibold text-text-primary">
              {metrics.activeUsers.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">New Users (30d)</span>
            </div>
            <span className="text-lg font-semibold text-text-primary">
              {metrics.newUsers.toLocaleString()}
            </span>
          </div>

          <div className="pt-2 border-t border-border-primary space-y-2">
            <div className="text-sm font-medium text-text-primary mb-2">
              Users by Role
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">Admin</span>
                <span className="text-text-primary">{metrics.usersByRole.admin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Provider</span>
                <span className="text-text-primary">{metrics.usersByRole.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Demo</span>
                <span className="text-text-primary">{metrics.usersByRole.demo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Patient</span>
                <span className="text-text-primary">{metrics.usersByRole.patient}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border-primary">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-text-secondary" />
              <span className="text-sm font-medium text-text-primary">Recent Activity</span>
            </div>
            <div className="space-y-1 text-xs text-text-tertiary">
              <div className="flex justify-between">
                <span>Last 24h</span>
                <span>{metrics.lastLoginStats.last24Hours}</span>
              </div>
              <div className="flex justify-between">
                <span>Last 7d</span>
                <span>{metrics.lastLoginStats.last7Days}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

