"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useMemo } from "react";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { QuickStatsCards } from "@/components/clinic/dashboard/QuickStatsCards";
import { TodaysScheduleWidget } from "@/components/clinic/dashboard/TodaysScheduleWidget";
import { RecentActivityFeed } from "@/components/clinic/dashboard/RecentActivityFeed";
import { QuickActionsPanel } from "@/components/clinic/dashboard/QuickActionsPanel";
import { NotificationsWidget } from "@/components/clinic/dashboard/NotificationsWidget";
import { MessagesWidget } from "@/components/clinic/dashboard/MessagesWidget";
import type { Id } from "@/convex/_generated/dataModel";

export default function ClinicDashboard() {
  const { data: session, status } = useZentheaSession();
  const tenantId = session?.user?.tenantId;

  // Fetch dashboard data
  const dashboardData = useQuery(
    api.dashboard.getDashboardData,
    tenantId ? { tenantId } : "skip"
  );

  // Fetch notifications
  const notifications = useQuery(
    api.dashboard.getNotifications,
    tenantId && session?.user?.id
      ? {
          tenantId,
          userId: session.user.id as Id<"users">,
        }
      : "skip"
  );

  // Fetch unread message count
  const unreadCount = useQuery(
    api.messages.getUnreadCount,
    tenantId && session?.user?.id
      ? {
          tenantId,
          userId: session.user.id as Id<"users">,
        }
      : "skip"
  );

  // Fetch urgent messages
  const urgentMessagesData = useQuery(
    api.messages.getUrgentMessages,
    tenantId && session?.user?.id
      ? {
          tenantId,
          userId: session.user.id as Id<"users">,
          limit: 5,
        }
      : "skip"
  );

  // Fetch patients for schedule widget (to get patient names)
  const patientsData = useQuery(
    api.patients.getPatientsByTenant,
    tenantId ? { tenantId, limit: 100 } : "skip"
  );

  const patients = useMemo(() => {
    if (!patientsData) return [];
    return patientsData.page || [];
  }, [patientsData]);

  // Calculate pending alerts count (warning types only)
  // Note: The getNotifications query only returns "info", "warning", and "success" types
  // It never returns "error" type, so we only filter for "warning" to match actual data
  const pendingAlerts = useMemo(() => {
    if (!notifications) return 0;
    return notifications.notifications.filter(
      (n): n is typeof n & { type: "warning" } => n.type === "warning"
    ).length;
  }, [notifications]);

  // Prepare urgent messages from query result
  const urgentMessages = useMemo(() => {
    if (!urgentMessagesData) return [];
    return urgentMessagesData;
  }, [urgentMessagesData]);

  if (status === "loading") {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-text-secondary">Loading...</p>
        </div>
      </ClinicLayout>
    );
  }

  if (status === "unauthenticated") {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-text-secondary">Please sign in to access this page.</p>
        </div>
      </ClinicLayout>
    );
  }

  const isLoading = !dashboardData || !notifications;
  const todaysAppointments = dashboardData?.recent?.appointments || [];
  const upcomingAppointments = dashboardData?.recent?.upcomingAppointments || [];
  const newPatients = dashboardData?.stats?.patients?.recent || 0;
  const activityFeed = dashboardData?.activityFeed || [];
  const notificationsList = notifications?.notifications || [];

  return (
    <ClinicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Clinic Dashboard</h1>
          <p className="text-text-secondary mt-1">
            Welcome back, {session?.user?.name || "User"}
          </p>
        </div>

        {/* Quick Stats Cards */}
        <div className="mb-8">
          <QuickStatsCards
            todaysAppointments={todaysAppointments.length}
            upcomingAppointments={upcomingAppointments.length}
            newPatients={newPatients}
            pendingAlerts={pendingAlerts}
            isLoading={isLoading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Schedule and Activity */}
          <div className="lg:col-span-2 space-y-6">
            <TodaysScheduleWidget
              appointments={todaysAppointments}
              patients={patients}
              isLoading={isLoading}
            />
            <RecentActivityFeed
              activities={activityFeed}
              isLoading={isLoading}
            />
          </div>

          {/* Right Column - Actions, Notifications, Messages */}
          <div className="space-y-6">
            <QuickActionsPanel />
            <NotificationsWidget
              notifications={notificationsList}
              isLoading={isLoading}
            />
            <MessagesWidget
              unreadCount={unreadCount || 0}
              urgentMessages={urgentMessages}
              isLoading={isLoading || urgentMessagesData === undefined}
            />
          </div>
        </div>
      </div>
    </ClinicLayout>
  );
}
