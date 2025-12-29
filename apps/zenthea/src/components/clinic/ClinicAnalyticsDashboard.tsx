"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Activity,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface PatientGrowthData {
  date: string;
  count: number;
  cumulative: number;
}

interface AppointmentTrendData {
  date: string;
  scheduled: number;
  completed: number;
  cancelled: number;
}

interface DailyRevenueData {
  date: string;
  amount: number;
}

interface UserActivityData {
  date: string;
  activeUsers: number;
  newUsers: number;
  logins: number;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  systemUptime: number;
  errorRate: number;
  requestCount: number;
}

interface AnalyticsData {
  patientGrowth: PatientGrowthData[];
  appointmentTrends: AppointmentTrendData[];
  revenue: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    dailyRevenue: DailyRevenueData[];
  };
  userActivity: UserActivityData[];
  performance: PerformanceMetrics;
  period: {
    startDate: number;
    endDate: number;
  };
}

interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
  error?: string;
}

interface ClinicAnalyticsDashboardProps {
  className?: string;
}

/**
 * ClinicAnalyticsDashboard Component
 * 
 * Displays comprehensive analytics dashboard for clinic owners with:
 * - Patient growth analytics
 * - Appointment trends
 * - Financial analytics (revenue metrics)
 * - User activity analytics
 * - Performance metrics
 * - Date range filtering
 * 
 * Features:
 * - Real-time analytics data visualization
 * - Interactive charts using recharts
 * - Date range filtering
 * - Auto-refresh functionality
 * - Comprehensive error handling
 * - Owner-only access (enforced by API)
 * 
 * @param className - Optional CSS class name for styling
 * 
 * @example
 * ```tsx
 * <ClinicAnalyticsDashboard />
 * ```
 */
export function ClinicAnalyticsDashboard({ className }: ClinicAnalyticsDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (startDate) {
        params.append("startDate", startDate);
      }
      if (endDate) {
        params.append("endDate", endDate);
      }

      const url = `/api/company/analytics${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to fetch analytics data");
      }

      const data: AnalyticsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch analytics data");
      }

      setAnalyticsData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics data");
      setAnalyticsData(null);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const handleRefresh = () => {
    fetchAnalyticsData();
  };

  const handleApplyDateRange = useCallback(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  if (isLoading) {
    return (
      <div className={className}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Analytics Dashboard</h1>
          <p className="text-text-secondary mt-1">Comprehensive analytics and insights</p>
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
          <h1 className="text-3xl font-bold text-text-primary">Analytics Dashboard</h1>
          <p className="text-text-secondary mt-1">Comprehensive analytics and insights</p>
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

  if (!analyticsData) {
    return (
      <div className={className}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Analytics Dashboard</h1>
          <p className="text-text-secondary mt-1">Comprehensive analytics and insights</p>
        </div>
        <Alert>
          <AlertDescription>No data available</AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasData = analyticsData.patientGrowth.length > 0 ||
    analyticsData.appointmentTrends.length > 0 ||
    analyticsData.revenue.dailyRevenue.length > 0 ||
    analyticsData.userActivity.length > 0;

  return (
    <div className={className}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Analytics Dashboard</h1>
          <p className="text-text-secondary mt-1">Comprehensive analytics and insights</p>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="start-date" className="text-sm text-text-secondary mb-1 block">
                Start Date
              </label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Start Date"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="end-date" className="text-sm text-text-secondary mb-1 block">
                End Date
              </label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="End Date"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleApplyDateRange}>Apply</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasData ? (
        <Alert>
          <AlertDescription>No data available</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Patient Growth */}
          {analyticsData.patientGrowth.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Patient Growth
                </CardTitle>
                <CardDescription>Patient growth over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-2xl font-bold text-text-primary">
                    {formatNumber(analyticsData.patientGrowth[analyticsData.patientGrowth.length - 1]?.cumulative || 0)}
                  </p>
                  <p className="text-sm text-text-secondary">Total Patients</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.patientGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="var(--zenthea-teal)"
                      name="Cumulative Patients"
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="var(--zenthea-purple)"
                      name="New Patients"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Appointment Trends */}
          {analyticsData.appointmentTrends.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Appointment Trends
                </CardTitle>
                <CardDescription>Appointment scheduling and completion trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.appointmentTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="scheduled"
                      stroke="var(--zenthea-teal)"
                      name="Scheduled"
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="var(--zenthea-purple)"
                      name="Completed"
                    />
                    <Line
                      type="monotone"
                      dataKey="cancelled"
                      stroke="var(--status-error)"
                      name="Cancelled"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Revenue Metrics */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Revenue Metrics
              </CardTitle>
              <CardDescription>Financial performance overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 border border-border-primary rounded-lg">
                  <p className="text-sm text-text-secondary mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {formatCurrency(analyticsData.revenue.total)}
                  </p>
                </div>
                <div className="p-4 border border-border-primary rounded-lg">
                  <p className="text-sm text-text-secondary mb-1">Paid</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {formatCurrency(analyticsData.revenue.paid)}
                  </p>
                </div>
                <div className="p-4 border border-border-primary rounded-lg">
                  <p className="text-sm text-text-secondary mb-1">Pending</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {formatCurrency(analyticsData.revenue.pending)}
                  </p>
                </div>
                <div className="p-4 border border-border-primary rounded-lg">
                  <p className="text-sm text-text-secondary mb-1">Overdue</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {formatCurrency(analyticsData.revenue.overdue)}
                  </p>
                </div>
              </div>
              {analyticsData.revenue.dailyRevenue.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.revenue.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="amount" fill="var(--zenthea-teal)" name="Daily Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* User Activity */}
          {analyticsData.userActivity.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Activity
                </CardTitle>
                <CardDescription>User engagement and activity metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 border border-border-primary rounded-lg">
                    <p className="text-sm text-text-secondary mb-1">Active Users</p>
                    <p className="text-2xl font-bold text-text-primary">
                      {formatNumber(
                        analyticsData.userActivity[analyticsData.userActivity.length - 1]?.activeUsers || 0
                      )}
                    </p>
                  </div>
                  <div className="p-4 border border-border-primary rounded-lg">
                    <p className="text-sm text-text-secondary mb-1">New Users</p>
                    <p className="text-2xl font-bold text-text-primary">
                      {formatNumber(
                        analyticsData.userActivity[analyticsData.userActivity.length - 1]?.newUsers || 0
                      )}
                    </p>
                  </div>
                  <div className="p-4 border border-border-primary rounded-lg">
                    <p className="text-sm text-text-secondary mb-1">Logins</p>
                    <p className="text-2xl font-bold text-text-primary">
                      {formatNumber(
                        analyticsData.userActivity[analyticsData.userActivity.length - 1]?.logins || 0
                      )}
                    </p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.userActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="activeUsers"
                      stackId="1"
                      stroke="var(--zenthea-teal)"
                      fill="var(--zenthea-teal)"
                      name="Active Users"
                    />
                    <Area
                      type="monotone"
                      dataKey="newUsers"
                      stackId="2"
                      stroke="var(--zenthea-purple)"
                      fill="var(--zenthea-purple)"
                      name="New Users"
                    />
                    <Area
                      type="monotone"
                      dataKey="logins"
                      stackId="3"
                      stroke="var(--zenthea-coral)"
                      fill="var(--zenthea-coral)"
                      name="Logins"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
              <CardDescription>System performance and health metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 border border-border-primary rounded-lg">
                  <p className="text-sm text-text-secondary mb-1">Average Response Time</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {formatNumber(analyticsData.performance.averageResponseTime)}ms
                  </p>
                </div>
                <div className="p-4 border border-border-primary rounded-lg">
                  <p className="text-sm text-text-secondary mb-1">System Uptime</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {analyticsData.performance.systemUptime.toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 border border-border-primary rounded-lg">
                  <p className="text-sm text-text-secondary mb-1">Error Rate</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {analyticsData.performance.errorRate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 border border-border-primary rounded-lg">
                  <p className="text-sm text-text-secondary mb-1">Request Count</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {formatNumber(analyticsData.performance.requestCount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

