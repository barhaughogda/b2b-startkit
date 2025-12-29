"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  Activity, 
  Shield, 
  TrendingUp,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import type { PlatformStats } from "@/types/superadmin";
import { SuperAdminErrorBoundary } from "./ErrorBoundary";

function PlatformStatsCardsContent() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Add revalidate parameter to force cache refresh when manually refreshing
      const url = isRefresh 
        ? '/api/superadmin/platform-stats?revalidate=true'
        : '/api/superadmin/platform-stats';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching platform stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getPerformanceStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-status-success';
      case 'degraded':
        return 'text-status-warning';
      case 'down':
        return 'text-status-error';
      default:
        return 'text-text-secondary';
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-status-success';
      case 'non-compliant':
        return 'bg-status-error';
      case 'pending':
        return 'bg-status-warning';
      default:
        return 'bg-text-secondary';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-surface-elevated rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-surface-elevated rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-surface-elevated rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mb-8 border-border-error">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-status-error">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Failed to load statistics</p>
              <p className="text-sm text-text-secondary">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStats(true)}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-text-primary">Platform Statistics</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchStats(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Active Tenants */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              Active Tenants
            </CardTitle>
            <Building2 className="h-4 w-4 text-zenthea-teal" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text-primary">
              {formatNumber(stats.tenants.active)}
            </div>
            <p className="text-xs text-text-secondary mt-1">
              of {formatNumber(stats.tenants.total)} total tenants
            </p>
            {stats.tenants.newThisMonth > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-status-success" />
                <span className="text-xs text-status-success">
                  +{formatNumber(stats.tenants.newThisMonth)} this month
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Tenants This Month */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              New Tenants
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-zenthea-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text-primary">
              {formatNumber(stats.tenants.newThisMonth)}
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Created this month
            </p>
            {stats.tenants.total > 0 && (
              <div className="mt-2">
                <span className="text-xs text-text-secondary">
                  {((stats.tenants.newThisMonth / stats.tenants.total) * 100).toFixed(1)}% of total
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Platform Users */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-status-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text-primary">
              {formatNumber(stats.users.total)}
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Across all tenants
            </p>
            {stats.users.newThisMonth > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-status-success" />
                <span className="text-xs text-status-success">
                  +{formatNumber(stats.users.newThisMonth)} this month
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              Active Sessions
            </CardTitle>
            <Activity className="h-4 w-4 text-status-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text-primary">
              {formatNumber(stats.users.activeSessions)}
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Users active in the last hour
            </p>
            {stats.users.total > 0 && (
              <div className="mt-2">
                <span className="text-xs text-text-secondary">
                  {((stats.users.activeSessions / stats.users.total) * 100).toFixed(1)}% of total users
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Performance */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              System Performance
            </CardTitle>
            <Activity className="h-4 w-4 text-zenthea-coral" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceStatusColor(stats.performance.status)}`}>
              {stats.performance.status.charAt(0).toUpperCase() + stats.performance.status.slice(1)}
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Uptime: {stats.performance.uptime}%
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Avg Response: {stats.performance.averageResponseTime}ms
            </p>
          </CardContent>
        </Card>

        {/* Security Compliance */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              Security Compliance
            </CardTitle>
            <Shield className="h-4 w-4 text-status-error" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getComplianceStatusColor(stats.security.complianceStatus)}>
                {stats.security.complianceStatus.charAt(0).toUpperCase() + stats.security.complianceStatus.slice(1)}
              </Badge>
            </div>
            {stats.security.criticalIssues > 0 && (
              <p className="text-xs text-status-error mt-1">
                {stats.security.criticalIssues} critical issue{stats.security.criticalIssues !== 1 ? 's' : ''}
              </p>
            )}
            <p className="text-xs text-text-secondary mt-1">
              Last scan: {new Date(stats.security.lastSecurityScan).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function PlatformStatsCards() {
  return (
    <SuperAdminErrorBoundary>
      <PlatformStatsCardsContent />
    </SuperAdminErrorBoundary>
  );
}

