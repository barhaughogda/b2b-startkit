/**
 * TypeScript types for Superadmin functionality
 */

export interface PlatformStats {
  tenants: {
    total: number;
    active: number;
    newThisMonth: number;
    byStatus: Record<string, number>;
    byPlan: Record<string, number>;
  };
  users: {
    total: number;
    activeSessions: number;
    newThisMonth: number;
    byRole: Record<string, number>;
  };
  performance: {
    status: "operational" | "degraded" | "down";
    uptime: number; // Percentage
    averageResponseTime: number; // Milliseconds
  };
  security: {
    complianceStatus: "compliant" | "non-compliant" | "pending";
    lastSecurityScan: number; // Timestamp
    criticalIssues: number;
  };
  lastUpdated: number; // Timestamp
}

export interface ActivityItem {
  type: "tenant" | "user" | "security" | "system";
  id: string;
  description: string;
  tenantId?: string;
  userId?: string;
  timestamp: number;
  severity?: "low" | "medium" | "high" | "critical";
  icon?: string;
}

export interface ActivityFeedResponse {
  activities: ActivityItem[];
  total: number;
  hasMore: boolean;
}

export type ActivityType = "all" | "tenant" | "user" | "security" | "system";

