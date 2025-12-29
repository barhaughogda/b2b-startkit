interface DashboardData {
  patientStats: {
    total: number;
    recent: number;
    withEmail: number;
    withPhone: number;
    withInsurance: number;
  };
  providerStats: {
    total: number;
    recent: number;
    specialties: number;
    specialtyBreakdown: Record<string, number>;
  };
  appointmentStats: {
    total: number;
    today: number;
    upcoming: number;
    completed: number;
    cancelled: number;
  };
  medicalRecordStats: {
    total: number;
    recent: number;
    byType: Record<string, number>;
  };
}

interface AnalyticsData {
  tenantId: string;
  period: {
    startDate: number;
    endDate: number;
  };
  dailyMetrics: Array<{
    date: string;
    appointments: number;
    newPatients: number;
    medicalRecords: number;
    completedAppointments: number;
  }>;
  totals: {
    appointments: number;
    newPatients: number;
    medicalRecords: number;
    completedAppointments: number;
  };
  trends: {
    averageAppointmentsPerDay: number;
    averageNewPatientsPerDay: number;
    completionRate: number;
  };
}

export function transformAppointmentTrendsData(analyticsData: AnalyticsData) {
  return analyticsData.dailyMetrics.map(metric => ({
    date: metric.date,
    appointments: metric.appointments,
    completed: metric.completedAppointments,
  }));
}

export function transformSpecialtyData(dashboardData: DashboardData) {
  return Object.entries(dashboardData.providerStats.specialtyBreakdown).map(([name, value]) => ({
    name,
    value,
  }));
}

export function transformDailyActivityData(analyticsData: AnalyticsData) {
  return analyticsData.dailyMetrics.map(metric => ({
    date: metric.date,
    appointments: metric.appointments,
    newPatients: metric.newPatients,
    records: metric.medicalRecords,
  }));
}

export function transformRecordsByTypeData(dashboardData: DashboardData) {
  return Object.entries(dashboardData.medicalRecordStats.byType).map(([name, value]) => ({
    name,
    value,
  }));
}
