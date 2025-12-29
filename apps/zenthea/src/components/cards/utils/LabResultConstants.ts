// Lab Result Status Configurations
export const LAB_STATUS_CONFIG = {
  pending: { label: 'PENDING', variant: 'secondary' as const, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  reviewed: { label: 'REVIEWED', variant: 'default' as const, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  critical: { label: 'CRITICAL', variant: 'destructive' as const, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  flagged: { label: 'FLAGGED', variant: 'secondary' as const, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' }
} as const;

// Test Type Configurations
export const TEST_TYPE_CONFIG = {
  routine: { label: 'ROUTINE', priority: 1, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  stat: { label: 'STAT', priority: 2, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  critical: { label: 'CRITICAL', priority: 3, color: 'text-red-600', bgColor: 'bg-red-50' }
} as const;

// Lab Value Flag Configurations
export const VALUE_FLAG_CONFIG = {
  normal: { label: 'NORMAL', variant: 'default' as const, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  high: { label: 'HIGH', variant: 'secondary' as const, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  low: { label: 'LOW', variant: 'secondary' as const, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  critical: { label: 'CRITICAL', variant: 'destructive' as const, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' }
} as const;

// Trend Configurations
export const TREND_CONFIG = {
  improving: { label: 'improving', color: 'text-green-600', icon: 'TrendingUp' },
  worsening: { label: 'worsening', color: 'text-red-600', icon: 'TrendingDown' },
  stable: { label: 'stable', color: 'text-gray-600', icon: 'Minus' }
} as const;

// Lab Categories
export const LAB_CATEGORIES = [
  { id: 'basic-metabolic', name: 'Basic Metabolic', tests: ['Glucose', 'Sodium', 'Potassium', 'Calcium', 'Alkaline Phosphatase'] },
  { id: 'complete-blood-count', name: 'Complete Blood Count', tests: ['Hemoglobin', 'White Blood Cell Count', 'Platelet Count'] },
  { id: 'prothrombin-time', name: 'Prothrombin Time', tests: ['PT', 'INR'] },
  { id: 'hemoglobin-a1c', name: 'Hemoglobin A1C', tests: ['HbA1c'] },
  { id: 'lipid', name: 'Lipid', tests: ['Total Cholesterol', 'HDL', 'LDL', 'Triglycerides'] },
  { id: 'liver', name: 'Liver', tests: ['ALT', 'AST', 'Bilirubin'] }
] as const;

// Time Period Options
export const TIME_PERIODS = [
  { id: 'past-year', label: 'Past Year', months: 12 },
  { id: 'past-6-months', label: 'Past 6 Months', months: 6 },
  { id: 'past-3-months', label: 'Past 3 Months', months: 3 },
  { id: 'past-month', label: 'Past Month', months: 1 }
] as const;
