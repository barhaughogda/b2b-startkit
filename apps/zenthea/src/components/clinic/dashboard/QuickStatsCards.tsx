"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

interface QuickStatsCardsProps {
  todaysAppointments: number;
  upcomingAppointments: number;
  newPatients: number;
  pendingAlerts: number;
  isLoading?: boolean;
}

export function QuickStatsCards({
  todaysAppointments,
  upcomingAppointments,
  newPatients,
  pendingAlerts,
  isLoading = false,
}: QuickStatsCardsProps) {
  const router = useRouter();

  const stats = [
    {
      title: "Today's Appointments",
      value: todaysAppointments,
      icon: Calendar,
      color: "text-zenthea-teal",
      bgColor: "bg-zenthea-teal/10",
      link: "/company/today",
      description: "Scheduled for today",
    },
    {
      title: "Upcoming Appointments",
      value: upcomingAppointments,
      icon: Clock,
      color: "text-zenthea-purple",
      bgColor: "bg-zenthea-purple/10",
      link: "/company/appointments",
      description: "Next 7 days",
    },
    {
      title: "New Patients",
      value: newPatients,
      icon: Users,
      color: "text-zenthea-coral",
      bgColor: "bg-zenthea-coral/10",
      link: "/company/patients",
      description: "This week",
    },
    {
      title: "Pending Alerts",
      value: pendingAlerts,
      icon: AlertCircle,
      color: "text-status-warning",
      bgColor: "bg-status-warning/10",
      link: "#",
      description: "Requiring attention",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => stat.link !== "#" && router.push(stat.link)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-text-primary">
                {stat.value}
              </div>
              <p className="text-xs text-text-tertiary mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

