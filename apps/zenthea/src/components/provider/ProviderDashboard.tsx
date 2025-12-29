'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDashboardData } from '@/hooks/useDashboardData';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AppointmentTrendsChart } from '@/components/charts/AppointmentTrendsChart';
import { ProviderSpecialtiesChart } from '@/components/charts/ProviderSpecialtiesChart';
import { DailyActivityChart } from '@/components/charts/DailyActivityChart';
import { RecordsByTypeChart } from '@/components/charts/RecordsByTypeChart';
import { 
  transformAppointmentTrendsData,
  transformSpecialtyData,
  transformDailyActivityData,
  transformRecordsByTypeData
} from '@/lib/dashboard-utils';

interface ProviderDashboardProps {
  tenantId: string;
}

export function ProviderDashboard({ tenantId }: ProviderDashboardProps) {
  const { dashboardData, analyticsData, isLoading, error } = useDashboardData(tenantId);

  // Validate tenantId
  if (!tenantId) {
    return (
      <Alert>
        <AlertDescription>Invalid tenant configuration</AlertDescription>
      </Alert>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-lg">Loading dashboard...</div>
        </div>
        <div className="animate-pulse">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error || !dashboardData || !analyticsData) {
    return (
      <Alert>
        <AlertDescription>Failed to load dashboard data</AlertDescription>
      </Alert>
    );
  }

  // Transform data for charts using utility functions
  const appointmentTrendsData = transformAppointmentTrendsData(analyticsData);
  const specialtyData = transformSpecialtyData(dashboardData);
  const dailyActivityData = transformDailyActivityData(analyticsData);
  const recordsByTypeData = transformRecordsByTypeData(dashboardData);

  return (
    <main className="space-y-6" tabIndex={0}>
      <h1 className="text-3xl font-bold">Provider Dashboard</h1>
      
      {/* Key Metrics */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Key Metrics</h2>
        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          data-testid="metrics-grid"
        >
          <MetricCard
            title="Total Patients"
            value={dashboardData.patientStats.total}
            subtitle={`+${dashboardData.patientStats.recent} New This Week`}
            subtitleColor="text-green-600"
            testId="patient-stats"
          />
          
          <MetricCard
            title="Total Appointments"
            value={dashboardData.appointmentStats.total}
            subtitle={`${dashboardData.appointmentStats.today} Today's Appointments`}
            subtitleColor="text-blue-600"
            testId="appointment-stats"
          />
          
          <MetricCard
            title="Total Providers"
            value={dashboardData.providerStats.total}
            subtitle={`${dashboardData.providerStats.specialties} Specialties`}
            subtitleColor="text-purple-600"
            testId="provider-stats"
          />
          
          <MetricCard
            title="Total Records"
            value={dashboardData.medicalRecordStats.total.toLocaleString()}
            subtitle={`+${dashboardData.medicalRecordStats.recent} Recent Records`}
            subtitleColor="text-orange-600"
            testId="records-stats"
          />
        </div>
      </section>

      {/* Analytics Charts */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Analytics</h2>
        <div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          data-testid="charts-grid"
        >
          {/* Appointment Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentTrendsChart data={appointmentTrendsData} />
            </CardContent>
          </Card>

          {/* Provider Specialties */}
          <Card>
            <CardHeader>
              <CardTitle>Provider Specialties</CardTitle>
            </CardHeader>
            <CardContent>
              <ProviderSpecialtiesChart data={specialtyData} />
            </CardContent>
          </Card>

          {/* Daily Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <DailyActivityChart data={dailyActivityData} />
            </CardContent>
          </Card>

          {/* Records by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Records by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <RecordsByTypeChart data={recordsByTypeData} />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
