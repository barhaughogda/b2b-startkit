"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, AlertCircle, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  from: string;
  subject: string;
  preview: string;
  timestamp: number;
  unread: boolean;
  priority?: "low" | "medium" | "high" | "urgent";
}

interface MessagesWidgetProps {
  unreadCount: number;
  urgentMessages: Message[];
  isLoading?: boolean;
}

export function MessagesWidget({
  unreadCount,
  urgentMessages,
  isLoading = false,
}: MessagesWidgetProps) {
  const router = useRouter();

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

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "urgent":
        return "text-status-error";
      case "high":
        return "text-status-warning";
      default:
        return "text-text-secondary";
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
            {[1, 2].map((i) => (
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
              <MessageSquare className="h-5 w-5 text-interactive-primary" />
              Messages Requiring Attention
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {unreadCount} unread
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {urgentMessages.length > 0
                ? `${urgentMessages.length} urgent message${urgentMessages.length !== 1 ? "s" : ""}`
                : "No urgent messages"}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/company/messages")}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {urgentMessages.length === 0 && unreadCount === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-text-tertiary mx-auto mb-2 opacity-50" />
            <p className="text-text-secondary">No messages requiring attention</p>
          </div>
        ) : (
          <div className="space-y-3">
            {urgentMessages.slice(0, 3).map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  message.unread
                    ? "border-interactive-primary/50 bg-interactive-primary/5 hover:bg-interactive-primary/10"
                    : "border-border-primary bg-surface-elevated hover:bg-surface-elevated/80"
                )}
                onClick={() => router.push(`/company/messages`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          message.unread ? "text-interactive-primary" : "text-text-primary"
                        )}
                      >
                        {message.from}
                      </p>
                      {message.priority === "urgent" && (
                        <Badge variant="destructive" className="text-xs">
                          Urgent
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-text-tertiary whitespace-nowrap flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text-primary mb-1">
                    {message.subject}
                  </p>
                  <p className="text-xs text-text-secondary line-clamp-1">
                    {message.preview}
                  </p>
                </div>
              </div>
            ))}
            {unreadCount > urgentMessages.length && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => router.push("/company/messages")}
              >
                View {unreadCount - urgentMessages.length} more unread message
                {unreadCount - urgentMessages.length !== 1 ? "s" : ""}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

