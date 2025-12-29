# Zenthea Real-Time Queries Documentation

This document provides comprehensive documentation for all real-time queries implemented in the Zenthea Convex backend.

## Table of Contents
- [Overview](#overview)
- [Patient Real-Time Queries](#patient-real-time-queries)
- [Provider Real-Time Queries](#provider-real-time-queries)
- [Appointment Real-Time Queries](#appointment-real-time-queries)
- [Medical Records Real-Time Queries](#medical-records-real-time-queries)
- [Dashboard Real-Time Queries](#dashboard-real-time-queries)
- [Performance Optimization](#performance-optimization)
- [Real-Time Features](#real-time-features)

## Overview

All real-time queries are designed to leverage Convex's built-in real-time capabilities, providing instant updates to subscribed clients. These queries are optimized for performance and include proper tenant isolation.

### Key Features
- **Real-Time Updates**: All queries automatically update when data changes
- **Tenant Isolation**: All queries respect tenant boundaries
- **Performance Optimized**: Uses proper indexing for efficient queries
- **Comprehensive Filtering**: Advanced filtering and search capabilities
- **Analytics Ready**: Built-in metrics and statistics

## Patient Real-Time Queries

### Get Patients by Tenant
**Query:** `patients.getPatientsByTenant`

**Parameters:**
```typescript
{
  tenantId: string;
  limit?: number;              // Default: 50
  offset?: number;             // Default: 0
}
```

**Returns:** `PaginatedResult<Patient>`

**Real-Time Features:**
- Automatically updates when patients are added, modified, or deleted
- Supports pagination for large datasets
- Ordered by creation date (newest first)

### Get Recent Patients
**Query:** `patients.getRecentPatients`

**Parameters:**
```typescript
{
  tenantId: string;
  limit?: number;              // Default: 10
}
```

**Returns:** `Patient[]`

**Real-Time Features:**
- Shows most recently created patients
- Perfect for activity feeds and dashboards
- Automatically updates with new patient registrations

### Search Patients (Optimized)
**Query:** `patients.searchPatients`

**Parameters:**
```typescript
{
  searchTerm: string;
  tenantId: string;
  limit?: number;              // Default: 20
}
```

**Returns:** `Patient[]`

**Real-Time Features:**
- Searches by first name, last name, or email (case-insensitive)
- Uses tenant isolation for security
- Optimized with proper indexing

### Get Patient Statistics
**Query:** `patients.getPatientStats`

**Parameters:**
```typescript
{
  tenantId: string;
}
```

**Returns:**
```typescript
{
  total: number;
  recent: number;              // Last 30 days
  newThisWeek: number;         // Last 7 days
  withEmail: number;
  withPhone: number;
  withInsurance: number;
}
```

**Real-Time Features:**
- Automatically recalculates when patient data changes
- Perfect for dashboard metrics
- Provides comprehensive patient analytics

## Provider Real-Time Queries

### Get Providers by Tenant
**Query:** `providers.getProvidersByTenant`

**Parameters:**
```typescript
{
  tenantId: string;
  limit?: number;              // Default: 50
}
```

**Returns:** `Provider[]`

**Real-Time Features:**
- Automatically updates when providers are added or modified
- Ordered by creation date (newest first)
- Tenant-isolated for security

### Get Providers by Specialty
**Query:** `providers.getProvidersBySpecialty`

**Parameters:**
```typescript
{
  specialty: string;
  tenantId: string;
}
```

**Returns:** `Provider[]`

**Real-Time Features:**
- Filters providers by medical specialty
- Automatically updates when provider specialties change
- Useful for appointment scheduling

### Get Provider Statistics
**Query:** `providers.getProviderStats`

**Parameters:**
```typescript
{
  tenantId: string;
}
```

**Returns:**
```typescript
{
  total: number;
  specialties: number;         // Number of unique specialties
  specialtyBreakdown: Record<string, number>;
  withPhone: number;
}
```

**Real-Time Features:**
- Automatically recalculates when provider data changes
- Provides specialty distribution analytics
- Perfect for administrative dashboards

### Get Recent Providers
**Query:** `providers.getRecentProviders`

**Parameters:**
```typescript
{
  tenantId: string;
  limit?: number;              // Default: 10
}
```

**Returns:** `Provider[]`

**Real-Time Features:**
- Shows most recently added providers
- Perfect for activity feeds
- Automatically updates with new provider registrations

## Appointment Real-Time Queries

### Get Appointments by Tenant
**Query:** `appointments.getAppointmentsByTenant`

**Parameters:**
```typescript
{
  tenantId: string;
  limit?: number;              // Default: 50
}
```

**Returns:** `Appointment[]`

**Real-Time Features:**
- Automatically updates when appointments are created, modified, or cancelled
- Ordered by creation date (newest first)
- Tenant-isolated for security

### Get Today's Appointments
**Query:** `appointments.getTodaysAppointments`

**Parameters:**
```typescript
{
  tenantId: string;
  providerId?: Id<"providers">; // Optional filter by provider
}
```

**Returns:** `Appointment[]`

**Real-Time Features:**
- Shows all appointments scheduled for today
- Automatically updates throughout the day
- Can be filtered by specific provider
- Perfect for daily schedule views

### Get Upcoming Appointments
**Query:** `appointments.getUpcomingAppointments`

**Parameters:**
```typescript
{
  tenantId: string;
  providerId?: Id<"providers">; // Optional filter by provider
  limit?: number;              // Default: 20
}
```

**Returns:** `Appointment[]`

**Real-Time Features:**
- Shows future appointments ordered by date
- Automatically updates when new appointments are scheduled
- Can be filtered by specific provider
- Perfect for upcoming schedule views

### Get Appointment Statistics
**Query:** `appointments.getAppointmentStats`

**Parameters:**
```typescript
{
  tenantId: string;
  startDate?: number;          // Default: 30 days ago
  endDate?: number;            // Default: now
}
```

**Returns:**
```typescript
{
  total: number;
  statusBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}
```

**Real-Time Features:**
- Automatically recalculates when appointment data changes
- Provides comprehensive appointment analytics
- Perfect for administrative dashboards

### Get Appointment Calendar Data
**Query:** `appointments.getAppointmentCalendar`

**Parameters:**
```typescript
{
  tenantId: string;
  startDate: number;
  endDate: number;
  providerId?: Id<"providers">; // Optional filter by provider
}
```

**Returns:** `Record<string, Appointment[]>`

**Real-Time Features:**
- Groups appointments by date for calendar views
- Automatically updates when appointments change
- Perfect for calendar components
- Can be filtered by specific provider

## Medical Records Real-Time Queries

### Get Medical Records by Tenant
**Query:** `medicalRecords.getMedicalRecordsByTenant`

**Parameters:**
```typescript
{
  tenantId: string;
  limit?: number;              // Default: 50
}
```

**Returns:** `MedicalRecord[]`

**Real-Time Features:**
- Automatically updates when medical records are added or modified
- Ordered by creation date (newest first)
- Tenant-isolated for security

### Get Recent Medical Records
**Query:** `medicalRecords.getRecentMedicalRecords`

**Parameters:**
```typescript
{
  tenantId: string;
  limit?: number;              // Default: 10
}
```

**Returns:** `MedicalRecord[]`

**Real-Time Features:**
- Shows most recently created medical records
- Perfect for activity feeds
- Automatically updates with new records

### Get Medical Record Statistics
**Query:** `medicalRecords.getMedicalRecordStats`

**Parameters:**
```typescript
{
  tenantId: string;
  startDate?: number;          // Default: 30 days ago
  endDate?: number;            // Default: now
}
```

**Returns:**
```typescript
{
  total: number;
  withMedications: number;
  uniqueDiagnoses: number;
  uniqueTreatments: number;
  recentRecords: number;       // Last 7 days
}
```

**Real-Time Features:**
- Automatically recalculates when medical records change
- Provides comprehensive medical analytics
- Perfect for clinical dashboards

### Get Medical Records by Date Range
**Query:** `medicalRecords.getMedicalRecordsByDateRange`

**Parameters:**
```typescript
{
  tenantId: string;
  startDate: number;
  endDate: number;
  patientId?: Id<"patients">;  // Optional filter by patient
  providerId?: Id<"providers">; // Optional filter by provider
}
```

**Returns:** `MedicalRecord[]`

**Real-Time Features:**
- Filters records by date range
- Can be filtered by specific patient or provider
- Automatically updates when records change
- Perfect for reporting and analytics

## Dashboard Real-Time Queries

### Get Comprehensive Dashboard Data
**Query:** `dashboard.getDashboardData`

**Parameters:**
```typescript
{
  tenantId: string;
}
```

**Returns:**
```typescript
{
  tenantId: string;
  lastUpdated: number;
  stats: {
    patients: PatientStats;
    providers: ProviderStats;
    appointments: AppointmentStats;
    medicalRecords: MedicalRecordStats;
  };
  recent: {
    patients: Patient[];
    providers: Provider[];
    appointments: Appointment[];
    upcomingAppointments: Appointment[];
  };
  activityFeed: ActivityItem[];
  summary: {
    totalPatients: number;
    totalProviders: number;
    totalAppointments: number;
    totalMedicalRecords: number;
    todaysAppointments: number;
    upcomingAppointments: number;
  };
}
```

**Real-Time Features:**
- Comprehensive dashboard data in a single query
- Automatically updates when any data changes
- Includes activity feed with recent changes
- Perfect for main dashboard views

### Get Real-Time Notifications
**Query:** `dashboard.getNotifications`

**Parameters:**
```typescript
{
  tenantId: string;
  userId?: Id<"users">;        // Optional user-specific notifications
}
```

**Returns:**
```typescript
{
  tenantId: string;
  notifications: Notification[];
  lastChecked: number;
}
```

**Real-Time Features:**
- Automatically updates when relevant data changes
- Includes alerts for overdue appointments
- Shows today's appointment count
- Perfect for notification systems

### Get Real-Time Analytics
**Query:** `dashboard.getAnalytics`

**Parameters:**
```typescript
{
  tenantId: string;
  startDate?: number;          // Default: 30 days ago
  endDate?: number;            // Default: now
}
```

**Returns:**
```typescript
{
  tenantId: string;
  period: { startDate: number; endDate: number };
  dailyMetrics: DailyMetric[];
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
```

**Real-Time Features:**
- Automatically recalculates when data changes
- Provides daily metrics for trend analysis
- Perfect for analytics dashboards
- Includes completion rates and trends

## Performance Optimization

### Indexing Strategy
All real-time queries use proper indexing for optimal performance:

1. **Tenant Indexes**: All queries use `by_tenant` index for tenant isolation
2. **Date Indexes**: Time-based queries use `by_scheduled_at` and `by_created_at` indexes
3. **Relationship Indexes**: Queries use `by_patient`, `by_provider`, etc. for relationships
4. **Search Indexes**: Text-based queries use appropriate search indexes

### Query Optimization
- **Parallel Execution**: Dashboard queries use `Promise.all()` for parallel data fetching
- **Pagination**: Large datasets use pagination to prevent memory issues
- **Filtering**: Queries use proper filtering to reduce data transfer
- **Caching**: Convex automatically caches query results

### Real-Time Efficiency
- **Selective Updates**: Only subscribed clients receive updates
- **Delta Updates**: Only changed data is transmitted
- **Connection Management**: Automatic connection handling
- **Error Recovery**: Automatic reconnection on network issues

## Real-Time Features

### Automatic Updates
All queries automatically update when:
- New records are created
- Existing records are modified
- Records are deleted
- Related data changes

### Subscription Management
- **Automatic Subscriptions**: Convex handles subscription lifecycle
- **Connection Monitoring**: Automatic reconnection on network issues
- **Error Handling**: Graceful error recovery
- **Performance Monitoring**: Built-in performance metrics

### Data Consistency
- **ACID Compliance**: All operations are atomic
- **Eventual Consistency**: Real-time updates are eventually consistent
- **Conflict Resolution**: Automatic conflict resolution
- **Data Integrity**: Foreign key relationships are maintained

### Security
- **Tenant Isolation**: All queries respect tenant boundaries
- **Authentication**: Queries require proper authentication
- **Authorization**: Role-based access control
- **Data Privacy**: Sensitive data is properly protected

## Usage Examples

### React Component with Real-Time Updates
```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function Dashboard() {
  const dashboardData = useQuery(api.dashboard.getDashboardData, { 
    tenantId: "tenant-1" 
  });
  
  if (!dashboardData) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total Patients: {dashboardData.summary.totalPatients}</p>
      <p>Today's Appointments: {dashboardData.summary.todaysAppointments}</p>
      {/* Automatically updates when data changes */}
    </div>
  );
}
```

### Real-Time Notifications
```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function Notifications() {
  const notifications = useQuery(api.dashboard.getNotifications, { 
    tenantId: "tenant-1" 
  });
  
  return (
    <div>
      {notifications?.notifications.map(notification => (
        <div key={notification.timestamp} className="notification">
          <h3>{notification.title}</h3>
          <p>{notification.message}</p>
        </div>
      ))}
    </div>
  );
}
```

### Real-Time Calendar
```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function Calendar() {
  const startDate = new Date().getTime();
  const endDate = startDate + (30 * 24 * 60 * 60 * 1000); // 30 days
  
  const calendarData = useQuery(api.appointments.getAppointmentCalendar, {
    tenantId: "tenant-1",
    startDate,
    endDate
  });
  
  return (
    <div>
      {Object.entries(calendarData || {}).map(([date, appointments]) => (
        <div key={date}>
          <h3>{date}</h3>
          {appointments.map(appointment => (
            <div key={appointment._id}>
              {appointment.type} - {new Date(appointment.scheduledAt).toLocaleTimeString()}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

## Best Practices

### Query Optimization
1. **Use Specific Queries**: Don't fetch more data than needed
2. **Leverage Indexes**: Use proper indexes for filtering
3. **Implement Pagination**: Use pagination for large datasets
4. **Cache Results**: Leverage Convex's built-in caching

### Real-Time Updates
1. **Subscribe Selectively**: Only subscribe to data you need
2. **Handle Loading States**: Always handle loading and error states
3. **Optimize Re-renders**: Use React.memo for expensive components
4. **Monitor Performance**: Watch for performance issues

### Security
1. **Tenant Isolation**: Always include tenantId in queries
2. **Authentication**: Ensure proper authentication
3. **Authorization**: Implement role-based access control
4. **Data Validation**: Validate all input data

### Error Handling
1. **Graceful Degradation**: Handle network issues gracefully
2. **Retry Logic**: Implement retry logic for failed queries
3. **User Feedback**: Provide clear error messages
4. **Logging**: Log errors for debugging

This comprehensive real-time query system provides the foundation for a highly responsive, real-time medical practice management application.
