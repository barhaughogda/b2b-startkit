"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  UserPlus, 
  Calendar, 
  MessageSquare, 
  CalendarDays, 
  FileText,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  url: string;
  color: string;
}

export function QuickActionsPanel() {
  const router = useRouter();

  const actions: QuickAction[] = [
    {
      id: "new-patient",
      title: "New Patient",
      description: "Add a new patient",
      icon: UserPlus,
      url: "/company/patients/new",
      color: "text-zenthea-coral",
    },
    {
      id: "schedule-appointment",
      title: "Schedule Appointment",
      description: "Create new appointment",
      icon: Calendar,
      url: "/company/appointments/new",
      color: "text-zenthea-teal",
    },
    {
      id: "send-message",
      title: "Send Message",
      description: "Message a patient",
      icon: MessageSquare,
      url: "/company/messages/new",
      color: "text-interactive-primary",
    },
    {
      id: "view-calendar",
      title: "View Calendar",
      description: "See full schedule",
      icon: CalendarDays,
      url: "/company/calendar",
      color: "text-zenthea-purple",
    },
    {
      id: "generate-report",
      title: "Generate Report",
      description: "Create reports",
      icon: FileText,
      url: "/company/settings/reports",
      color: "text-status-info",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-zenthea-teal" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Common tasks and shortcuts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto flex-col items-start p-4 hover:bg-surface-elevated transition-colors"
                onClick={() => router.push(action.url)}
              >
                <div className="flex items-center gap-3 w-full">
                  <Icon className={cn("h-5 w-5 flex-shrink-0", action.color)} />
                  <div className="text-left flex-1">
                    <div className="font-medium text-sm text-text-primary">
                      {action.title}
                    </div>
                    <div className="text-xs text-text-tertiary mt-0.5">
                      {action.description}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

