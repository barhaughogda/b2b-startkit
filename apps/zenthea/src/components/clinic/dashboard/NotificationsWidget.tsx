"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, AlertTriangle, CheckCircle, Info, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Notification {
  type: "info" | "warning" | "success" | "error";
  title: string;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

interface NotificationsWidgetProps {
  notifications: Notification[];
  isLoading?: boolean;
}

export function NotificationsWidget({
  notifications,
  isLoading = false,
}: NotificationsWidgetProps) {
  const router = useRouter();

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "warning":
        return AlertTriangle;
      case "success":
        return CheckCircle;
      case "error":
        return AlertTriangle;
      default:
        return Info;
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "warning":
        return "text-status-warning";
      case "success":
        return "text-status-success";
      case "error":
        return "text-status-error";
      default:
        return "text-status-info";
    }
  };

  const getNotificationBgColor = (type: Notification["type"]) => {
    switch (type) {
      case "warning":
        return "bg-status-warning/10";
      case "success":
        return "bg-status-success/10";
      case "error":
        return "bg-status-error/10";
      default:
        return "bg-status-info/10";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  // Count by type
  const warningCount = notifications.filter((n) => n.type === "warning").length;
  const errorCount = notifications.filter((n) => n.type === "error").length;
  const totalAlerts = warningCount + errorCount;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-zenthea-teal" />
              Notifications & Alerts
              {totalAlerts > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {totalAlerts}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-status-success mx-auto mb-2 opacity-50" />
            <p className="text-text-secondary">All clear! No notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification, index) => {
              const Icon = getNotificationIcon(notification.type);
              const color = getNotificationColor(notification.type);
              const bgColor = getNotificationBgColor(notification.type);

              return (
                <div
                  key={`${notification.type}-${notification.timestamp}-${index}`}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    notification.type === "warning" || notification.type === "error"
                      ? "border-status-warning/50 bg-status-warning/5"
                      : "border-border-primary bg-surface-elevated"
                  )}
                >
                  <div className={cn("p-2 rounded-lg", bgColor)}>
                    <Icon className={cn("h-4 w-4", color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-text-primary">
                        {notification.title}
                      </p>
                      <span className="text-xs text-text-tertiary whitespace-nowrap flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">
                      {notification.message}
                    </p>
                  </div>
                </div>
              );
            })}
            {notifications.length > 5 && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => router.push("/company/settings")}
              >
                View all notifications
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

