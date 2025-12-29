"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Users,
  Shield,
  Activity,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/date";
import type { ActivityFeedResponse, ActivityItem, ActivityType } from "@/types/superadmin";
import { SuperAdminErrorBoundary } from "./ErrorBoundary";

function RecentActivityFeedContent() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<ActivityType>("all");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchActivities = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else if (activities.length > 0) {
        setLoadingMore(true);
      }
      setError(null);

      const currentOffset = reset ? 0 : offset;
      const params = new URLSearchParams({
        type: activityType,
        limit: limit.toString(),
        offset: currentOffset.toString(),
      });

      const response = await fetch(`/api/superadmin/activity-feed?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.statusText}`);
      }

      const data: ActivityFeedResponse = await response.json();
      
      if (reset) {
        setActivities(data.activities);
      } else {
        setActivities(prev => [...prev, ...data.activities]);
      }
      
      setHasMore(data.hasMore);
      setOffset(currentOffset + data.activities.length);
    } catch (err) {
      console.error('Error fetching activity feed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchActivities(true);
  }, [activityType]);

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "tenant":
        return Building2;
      case "user":
        return Users;
      case "security":
        return Shield;
      case "system":
        return Activity;
      default:
        return Activity;
    }
  };

  const getSeverityColor = (severity?: ActivityItem["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-status-error text-white";
      case "high":
        return "bg-status-error/80 text-white";
      case "medium":
        return "bg-status-warning text-white";
      case "low":
        return "bg-status-info text-white";
      default:
        return "bg-surface-elevated text-text-secondary";
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchActivities(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-surface-elevated"></div>
                <div className="flex-1">
                  <div className="h-4 bg-surface-elevated rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-surface-elevated rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border-error">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-status-error">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Failed to load activities</p>
              <p className="text-sm text-text-secondary">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchActivities(true)}
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={activityType} onValueChange={(value) => setActivityType(value as ActivityType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="tenant">Tenant Activities</SelectItem>
                <SelectItem value="user">User Activities</SelectItem>
                <SelectItem value="security">Security Events</SelectItem>
                <SelectItem value="system">System Updates</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchActivities(true)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activities found</p>
            <p className="text-sm mt-1">
              {activityType !== "all" 
                ? `No ${activityType} activities in the last 7 days`
                : "No activities in the last 7 days"}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-elevated transition-colors"
                  >
                    <div className={`p-2 rounded-full ${
                      activity.type === "security" 
                        ? "bg-status-error/10 text-status-error"
                        : activity.type === "tenant"
                        ? "bg-zenthea-teal/10 text-zenthea-teal"
                        : activity.type === "user"
                        ? "bg-status-info/10 text-status-info"
                        : "bg-surface-elevated text-text-secondary"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-text-primary flex-1">
                          {activity.description}
                        </p>
                        {activity.severity && (
                          <Badge className={getSeverityColor(activity.severity)}>
                            {activity.severity}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-secondary">
                          {formatRelativeTime(new Date(activity.timestamp).toISOString())}
                        </span>
                        {activity.tenantId && (
                          <>
                            <span className="text-xs text-text-tertiary">•</span>
                            <span className="text-xs text-text-secondary">
                              Tenant: {activity.tenantId}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentActivityFeed() {
  return (
    <SuperAdminErrorBoundary>
      <RecentActivityFeedContent />
    </SuperAdminErrorBoundary>
  );
}

