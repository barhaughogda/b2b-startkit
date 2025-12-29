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
  Shield,
  AlertTriangle,
  Lock,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Globe,
} from "lucide-react";

interface SecurityEvent {
  _id: string;
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  timestamp: number;
  ipAddress?: string;
}

interface SecurityData {
  events: SecurityEvent[];
  failedLogins: SecurityEvent[];
  activeSessions: SecurityEvent[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface SecurityResponse {
  success: boolean;
  data: SecurityData;
  error?: string;
}

interface SecurityDashboardProps {
  className?: string;
}

/**
 * SecurityDashboard Component
 * 
 * Displays security monitoring dashboard with:
 * - Security events timeline
 * - Failed login attempts
 * - Active sessions
 * - Security alerts and notifications
 * - Threat indicators
 * - Export functionality
 * 
 * Features:
 * - Real-time security event monitoring
 * - Date range filtering
 * - Pagination support
 * - Expandable event details
 * - Threat level calculation
 * 
 * @param className - Optional CSS class name for styling
 * 
 * @example
 * ```tsx
 * <SecurityDashboard />
 * ```
 */
export function SecurityDashboard({ className }: SecurityDashboardProps) {
  const [securityData, setSecurityData] = useState<SecurityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const fetchSecurityData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });

      if (startDate) {
        params.append("startDate", startDate);
      }
      if (endDate) {
        params.append("endDate", endDate);
      }

      const response = await fetch(`/api/admin/security?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch security data");
      }
      
      const data: SecurityResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch security data");
      }

      setSecurityData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load security data");
      setSecurityData(null);
    } finally {
      setIsLoading(false);
    }
  }, [page, startDate, endDate]);

  useEffect(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);

  const handleRefresh = () => {
    fetchSecurityData();
  };

  /**
   * Handles export of security report
   * TODO: Implement CSV/PDF export functionality
   */
  const handleExport = () => {
    // Export functionality - will be implemented in future iteration
    if (process.env.NODE_ENV === 'development') {
      console.log("Export security report");
    }
  };

  const handleNextPage = () => {
    if (securityData?.hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  };

  const toggleEventExpanded = (eventId: string) => {
    setExpandedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  /**
   * Formats a timestamp to a human-readable relative time string
   * @param timestamp - Unix timestamp in milliseconds
   * @returns Formatted relative time string (e.g., "2 hours ago", "Just now")
   */
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
    return date.toLocaleString();
  };

  /**
   * Converts an action string to a human-readable label
   * @param action - Action string (e.g., "login_failed")
   * @returns Formatted label (e.g., "Login Failed")
   */
  const getActionLabel = (action: string): string => {
    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  /**
   * Calculates the current threat level based on security events
   * @returns Threat level: "low", "medium", or "high"
   */
  const getThreatLevel = (): "low" | "medium" | "high" => {
    if (!securityData) return "low";
    const failedLoginCount = securityData.failedLogins.length;
    const unauthorizedCount = securityData.events.filter(
      (e) => e.action === "unauthorized_access"
    ).length;

    if (failedLoginCount > 10 || unauthorizedCount > 5) return "high";
    if (failedLoginCount > 5 || unauthorizedCount > 2) return "medium";
    return "low";
  };

  if (isLoading) {
    return (
      <div className={className}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Security Dashboard</h1>
          <p className="text-text-secondary mt-1">Monitor security events and threats</p>
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
          <h1 className="text-3xl font-bold text-text-primary">Security Dashboard</h1>
          <p className="text-text-secondary mt-1">Monitor security events and threats</p>
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

  return (
    <div className={className}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Security Dashboard</h1>
          <p className="text-text-secondary mt-1">Monitor security events and threats</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="start-date" className="text-sm text-text-secondary mb-1 block">Start Date</label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="end-date" className="text-sm text-text-secondary mb-1 block">End Date</label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Events Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Events Timeline
            </CardTitle>
            <CardDescription>Recent security events and activities</CardDescription>
          </CardHeader>
          <CardContent>
            {!securityData || securityData.events.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                No security events
              </div>
            ) : (
              <div className="space-y-4">
                {securityData.events.map((event) => (
                  <div
                    key={event._id}
                    className="border border-border-primary rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-text-primary">
                            {getActionLabel(event.action)}
                          </span>
                          <span className="text-sm text-text-secondary">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                        {event.ipAddress && (
                          <div className="text-sm text-text-secondary flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {event.ipAddress}
                          </div>
                        )}
                        {expandedEvents.has(event._id) && event.details && (
                          <div className="mt-2 p-2 bg-background-secondary rounded text-sm">
                            <pre className="text-xs text-text-secondary" data-testid={`event-details-${event._id}`}>
                              {JSON.stringify(event.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleEventExpanded(event._id)}
                      >
                        {expandedEvents.has(event._id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
                {securityData.hasMore && (
                  <div className="flex justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={!securityData.hasMore}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Failed Login Attempts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Failed Login Attempts
            </CardTitle>
            <CardDescription>Recent failed authentication attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {!securityData || securityData.failedLogins.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                No failed logins
              </div>
            ) : (
              <div className="space-y-3">
                {securityData.failedLogins.map((login) => (
                  <div
                    key={login._id}
                    className="border border-border-primary rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-text-secondary" />
                      <span className="text-sm font-medium text-text-primary">
                        {login.details?.email as string || "Unknown"}
                      </span>
                    </div>
                    {login.ipAddress && (
                      <div className="text-xs text-text-secondary flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {login.ipAddress}
                      </div>
                    )}
                    <div className="text-xs text-text-secondary mt-1">
                      {formatTimestamp(login.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>Currently active user sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {!securityData || securityData.activeSessions.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                No active sessions
              </div>
            ) : (
              <div className="space-y-3">
                {securityData.activeSessions.map((session) => (
                  <div
                    key={session._id}
                    className="border border-border-primary rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-text-secondary" />
                      <span className="text-sm font-medium text-text-primary">
                        {session.details?.email as string || "Unknown"}
                      </span>
                    </div>
                    {session.ipAddress && (
                      <div className="text-xs text-text-secondary flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {session.ipAddress}
                      </div>
                    )}
                    <div className="text-xs text-text-secondary mt-1">
                      {formatTimestamp(session.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Security Alerts
            </CardTitle>
            <CardDescription>Active security notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {securityData && securityData.failedLogins.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {securityData.failedLogins.length} failed login attempt
                    {securityData.failedLogins.length !== 1 ? "s" : ""} detected
                  </AlertDescription>
                </Alert>
              )}
              {securityData &&
                securityData.events.some((e) => e.action === "unauthorized_access") && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Unauthorized access attempts detected
                    </AlertDescription>
                  </Alert>
                )}
              {(!securityData ||
                (securityData.failedLogins.length === 0 &&
                  !securityData.events.some((e) => e.action === "unauthorized_access"))) && (
                <div className="text-center py-4 text-text-secondary">
                  No active alerts
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Threat Indicators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Threat Indicators
            </CardTitle>
            <CardDescription>Current security threat assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Threat Level</span>
                <span
                  className={`text-sm font-medium ${
                    getThreatLevel() === "high"
                      ? "text-status-error"
                      : getThreatLevel() === "medium"
                      ? "text-status-warning"
                      : "text-status-success"
                  }`}
                >
                  {getThreatLevel().toUpperCase()}
                </span>
              </div>
              {securityData && securityData.failedLogins.length > 5 && (
                <div className="text-xs text-status-warning">
                  Suspicious activity detected
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

