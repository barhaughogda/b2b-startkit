"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, UserPlus, Calendar, FileText, MessageSquare, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ActivityItem {
  type: "patient_created" | "provider_created" | "appointment_created" | "medical_record_created" | "message_created";
  id: string;
  name: string;
  timestamp: number;
  data?: any;
}

interface RecentActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

export function RecentActivityFeed({
  activities,
  isLoading = false,
}: RecentActivityFeedProps) {
  const router = useRouter();

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "patient_created":
        return UserPlus;
      case "provider_created":
        return UserPlus;
      case "appointment_created":
        return Calendar;
      case "medical_record_created":
        return FileText;
      case "message_created":
        return MessageSquare;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: ActivityItem["type"]) => {
    switch (type) {
      case "patient_created":
        return "text-zenthea-coral";
      case "provider_created":
        return "text-zenthea-purple";
      case "appointment_created":
        return "text-zenthea-teal";
      case "medical_record_created":
        return "text-status-info";
      case "message_created":
        return "text-interactive-primary";
      default:
        return "text-text-secondary";
    }
  };

  const getActivityLabel = (type: ActivityItem["type"]) => {
    switch (type) {
      case "patient_created":
        return "New patient";
      case "provider_created":
        return "New provider";
      case "appointment_created":
        return "Appointment";
      case "medical_record_created":
        return "Medical record";
      case "message_created":
        return "Message";
      default:
        return "Activity";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleActivityClick = (activity: ActivityItem) => {
    switch (activity.type) {
      case "patient_created":
        router.push(`/company/patients/${activity.id}`);
        break;
      case "appointment_created":
        router.push(`/company/appointments/${activity.id}`);
        break;
      case "medical_record_created":
        router.push(`/company/medical-records/${activity.id}`);
        break;
      case "message_created":
        router.push(`/company/messages`);
        break;
      default:
        break;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-zenthea-teal" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Latest changes and updates in your clinic
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-secondary">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 10).map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const color = getActivityColor(activity.type);
              const label = getActivityLabel(activity.type);

              return (
                <div
                  key={`${activity.type}-${activity.id}-${activity.timestamp}`}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border border-border-primary bg-surface-elevated hover:bg-surface-elevated/80 transition-colors",
                    activity.type !== "provider_created" && "cursor-pointer"
                  )}
                  onClick={() => handleActivityClick(activity)}
                >
                  <div className={cn("p-2 rounded-lg bg-surface-elevated", color)}>
                    <Icon className={cn("h-4 w-4", color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {activity.name}
                      </p>
                      <span className="text-xs text-text-tertiary whitespace-nowrap flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">{label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

