import { useState, useEffect } from 'react';

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

interface UseDashboardDataReturn {
  dashboardData: DashboardData | null;
  analyticsData: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
}

export function useDashboardData(tenantId: string): UseDashboardDataReturn {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Simulate API call delay - shorter for tests
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Mock data - in real implementation, this would come from Convex
        const mockDashboardData: DashboardData = {
          patientStats: {
            total: 150,
            recent: 12,
            withEmail: 140,
            withPhone: 130,
            withInsurance: 120,
          },
          providerStats: {
            total: 8,
            recent: 2,
            specialties: 5,
            specialtyBreakdown: {
              'Cardiology': 2,
              'Orthopedics': 2,
              'Dermatology': 1,
              'Pediatrics': 2,
              'Internal Medicine': 1,
            },
          },
          appointmentStats: {
            total: 450,
            today: 15,
            upcoming: 25,
            completed: 400,
            cancelled: 25,
          },
          medicalRecordStats: {
            total: 1200,
            recent: 45,
            byType: {
              'Lab Results': 300,
              'Imaging': 200,
              'Prescriptions': 400,
              'Notes': 300,
            },
          },
        };

        const mockAnalyticsData: AnalyticsData = {
          tenantId,
          period: {
            startDate: Date.now() - (30 * 24 * 60 * 60 * 1000),
            endDate: Date.now(),
          },
          dailyMetrics: [
            { date: '2024-01-01', appointments: 5, newPatients: 2, medicalRecords: 8, completedAppointments: 4 },
            { date: '2024-01-02', appointments: 7, newPatients: 3, medicalRecords: 12, completedAppointments: 6 },
            { date: '2024-01-03', appointments: 6, newPatients: 1, medicalRecords: 10, completedAppointments: 5 },
          ],
          totals: {
            appointments: 450,
            newPatients: 150,
            medicalRecords: 1200,
            completedAppointments: 400,
          },
          trends: {
            averageAppointmentsPerDay: 15.0,
            averageNewPatientsPerDay: 5.0,
            completionRate: 88.9,
          },
        };

        setDashboardData(mockDashboardData);
        setAnalyticsData(mockAnalyticsData);
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    if (tenantId) {
      loadData();
    }
  }, [tenantId]);

  return {
    dashboardData,
    analyticsData,
    isLoading,
    error,
  };
}
