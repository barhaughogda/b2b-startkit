'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ArrowUp, ArrowDown, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import type { RCMMetrics } from '@/types/billing';
import { cn } from '@/lib/utils';
import { formatCurrencyFromDollars, formatPercentage, formatNumber } from '@/lib/billing/formatting';

/**
 * Trend data for KPI metrics
 */
export interface KPITrend {
  totalAR?: number; // Percentage change
  daysInAR?: number;
  cleanClaimRate?: number;
  denialRate?: number;
  netCollectionRate?: number;
  [key: string]: number | undefined;
}

/**
 * Custom KPI configuration
 */
export interface CustomKPI {
  label: string;
  value: number;
  format: 'currency' | 'percentage' | 'number';
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
  tooltip?: string;
  trend?: number;
}

/**
 * Extended RCMMetrics with optional trend data
 */
export interface RCMMetricsWithTrend extends RCMMetrics {
  trend?: KPITrend;
}

/**
 * Props for BillingKPICards component
 */
export interface BillingKPICardsProps {
  metrics: RCMMetrics | RCMMetricsWithTrend;
  customKPIs?: CustomKPI[];
  trend?: KPITrend;
  showDefaultTooltips?: boolean;
  showDefaultKPIs?: boolean; // Allow hiding default KPIs when only custom KPIs are needed
}

/**
 * Default tooltip text for standard RCM metrics
 */
const DEFAULT_TOOLTIPS: Record<string, string> = {
  'Total AR': 'Total Accounts Receivable: The total amount of money owed to your clinic',
  'Days in AR': 'Days in AR: Average number of days it takes to collect payment',
  'Clean Claim Rate': 'Clean Claim Rate: Percentage of claims accepted without issues',
  'Denial Rate': 'Denial Rate: Percentage of claims denied by insurance',
  'Net Collection Rate': 'Net Collection Rate: Percentage of billed amounts actually collected',
} as const;

/**
 * Get trend indicator component
 */
function TrendIndicator({ trend }: { trend?: number }) {
  if (trend === undefined || trend === 0) {
    return null;
  }

  const isPositive = trend > 0;
  const trendColor = isPositive ? 'text-status-success' : 'text-status-error';
  const trendValue = isPositive ? `+${trend.toFixed(1)}%` : `${trend.toFixed(1)}%`;

  return (
    <div className={cn('flex items-center gap-1 text-xs mt-1', trendColor)}>
      {isPositive ? (
        <ArrowUp className="h-3 w-3" data-testid="arrow-up-icon" />
      ) : (
        <ArrowDown className="h-3 w-3" data-testid="arrow-down-icon" />
      )}
      <span className={trendColor}>{trendValue}</span>
    </div>
  );
}

/**
 * Single KPI Card Component
 */
function KPICard({
  label,
  value,
  format,
  icon: Icon,
  color = 'text-text-primary',
  tooltip,
  trend,
  testId,
  showDefaultTooltips = false,
}: CustomKPI & { trend?: number; testId?: string; showDefaultTooltips?: boolean }) {
  const formattedValue =
    format === 'currency'
      ? formatCurrencyFromDollars(value) // Backend returns dollars, convert to formatted currency
      : format === 'percentage'
        ? formatPercentage(value)
        : formatNumber(value);

  // Get aria-label: prefer tooltip, then default tooltip if enabled, then label
  const ariaLabel = tooltip 
    || (showDefaultTooltips && DEFAULT_TOOLTIPS[label]) 
    || label;

  const cardContent = (
    <Card
      className={cn('bg-surface-elevated border border-border-primary/20', color)}
      role="article"
      tabIndex={0}
      data-testid={testId}
      aria-label={ariaLabel}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
          {Icon && <Icon className={cn('h-4 w-4', color)} />}
          <span>{label}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', color)}>{formattedValue}</div>
        {trend !== undefined && trend !== 0 && <TrendIndicator trend={trend} />}
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
}

/**
 * BillingKPICards Component
 * 
 * Displays Revenue Cycle Management (RCM) key performance indicators
 * in a responsive grid layout with trend indicators, icons, colors, and tooltips.
 * 
 * @example
 * ```tsx
 * <BillingKPICards 
 *   metrics={rcmMetrics}
 *   trend={{ totalAR: 5.2, cleanClaimRate: -1.5 }}
 *   showDefaultTooltips={true}
 * />
 * ```
 */
/**
 * Create default RCM KPI configurations
 */
function createDefaultKPIs(
  metrics: RCMMetrics,
  trend?: KPITrend,
  showDefaultTooltips = false
): CustomKPI[] {
  return [
    {
      label: 'Total AR',
      value: metrics.totalAR ?? 0,
      format: 'currency',
      icon: DollarSign,
      color: 'text-zenthea-teal',
      tooltip: showDefaultTooltips ? DEFAULT_TOOLTIPS['Total AR'] : undefined,
      trend: trend?.totalAR,
    },
    {
      label: 'Days in AR',
      value: metrics.daysInAR ?? 0,
      format: 'number',
      icon: Calendar,
      color: 'text-text-primary',
      tooltip: showDefaultTooltips ? DEFAULT_TOOLTIPS['Days in AR'] : undefined,
      trend: trend?.daysInAR,
    },
    {
      label: 'Clean Claim Rate',
      value: metrics.cleanClaimRate ?? 0,
      format: 'percentage',
      icon: TrendingUp,
      color: 'text-status-success',
      tooltip: showDefaultTooltips ? DEFAULT_TOOLTIPS['Clean Claim Rate'] : undefined,
      trend: trend?.cleanClaimRate,
    },
    {
      label: 'Denial Rate',
      value: metrics.denialRate ?? 0,
      format: 'percentage',
      icon: TrendingUp,
      color: 'text-status-warning',
      tooltip: showDefaultTooltips ? DEFAULT_TOOLTIPS['Denial Rate'] : undefined,
      trend: trend?.denialRate,
    },
    {
      label: 'Net Collection Rate',
      value: metrics.netCollectionRate ?? 0,
      format: 'percentage',
      icon: TrendingUp,
      color: 'text-status-success',
      tooltip: showDefaultTooltips ? DEFAULT_TOOLTIPS['Net Collection Rate'] : undefined,
      trend: trend?.netCollectionRate,
    },
  ];
}

export function BillingKPICards({
  metrics,
  customKPIs,
  trend: trendProp,
  showDefaultTooltips = false,
  showDefaultKPIs = true,
}: BillingKPICardsProps) {
  // Extract trend from metrics if present, otherwise use prop
  const trend = (metrics as RCMMetricsWithTrend).trend || trendProp;

  // Default RCM KPIs with safe property access
  const defaultKPIs: CustomKPI[] = showDefaultKPIs 
    ? createDefaultKPIs(metrics, trend, showDefaultTooltips)
    : [];

  // Combine default and custom KPIs
  const allKPIs = customKPIs 
    ? (showDefaultKPIs ? [...defaultKPIs, ...customKPIs] : customKPIs)
    : defaultKPIs;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {allKPIs.map((kpi, index) => (
        <KPICard
          key={`${kpi.label}-${index}`}
          {...kpi}
          testId={`kpi-card-${index}`}
          showDefaultTooltips={showDefaultTooltips}
        />
      ))}
    </div>
  );
}

