"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, User, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type AppointmentDoc = Doc<"appointments">;
type PatientDoc = Doc<"patients">;

interface TodaysScheduleWidgetProps {
  appointments: AppointmentDoc[];
  patients?: PatientDoc[];
  isLoading?: boolean;
}

export function TodaysScheduleWidget({
  appointments,
  patients = [],
  isLoading = false,
}: TodaysScheduleWidgetProps) {
  const router = useRouter();

  // Sort appointments by scheduled time
  const sortedAppointments = [...appointments].sort(
    (a, b) => a.scheduledAt - b.scheduledAt
  );

  // Get patient name helper
  const getPatientName = (patientId: Id<"patients"> | undefined) => {
    if (!patientId) return "Unknown Patient";
    const patient = patients.find((p) => p._id === patientId);
    if (!patient) return "Unknown Patient";
    return `${patient.firstName} ${patient.lastName}`;
  };

  // Format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "cancelled":
        return "secondary";
      // Note: "no-show" status not currently in schema, but kept for future compatibility
      case "no-show":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Count cancellations (no-show status doesn't exist in current schema)
  const cancellations = appointments.filter((a) => a.status === "cancelled").length;

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
              <Calendar className="h-5 w-5 text-zenthea-teal" />
              Today's Schedule
            </CardTitle>
            <CardDescription className="mt-1">
              {appointments.length} appointment{appointments.length !== 1 ? "s" : ""} scheduled
              {cancellations > 0 && (
                <span className="ml-2 text-status-warning">
                  ({cancellations} cancelled)
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/company/calendar")}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View Calendar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedAppointments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-secondary mb-2">No appointments scheduled for today</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/company/appointments/new")}
            >
              Schedule Appointment
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAppointments.slice(0, 5).map((appointment) => (
              <div
                key={appointment._id}
                className="flex items-center justify-between p-3 rounded-lg border border-border-primary bg-surface-elevated hover:bg-surface-elevated/80 transition-colors cursor-pointer"
                onClick={() => router.push(`/company/appointments/${appointment._id}`)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium text-sm">
                      {formatTime(appointment.scheduledAt)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-text-tertiary" />
                      <span className="font-medium text-text-primary">
                        {getPatientName(appointment.patientId)}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">
                      {appointment.type || "Appointment"}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusVariant(appointment.status)}>
                  {appointment.status}
                </Badge>
              </div>
            ))}
            {sortedAppointments.length > 5 && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => router.push("/company/calendar")}
              >
                View all {sortedAppointments.length} appointments
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

