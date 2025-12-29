/**
 * Billing formatting utilities
 * 
 * Shared utility functions for formatting billing-related data
 * (currency, percentages, numbers) across billing components.
 */

/**
 * Format currency from cents to USD string
 * 
 * @param cents - Amount in cents
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Format currency from dollars to USD string
 * 
 * Helper function for when backend returns amounts in dollars.
 * Converts dollars to cents internally before formatting.
 * 
 * @param dollars - Amount in dollars
 * @returns Formatted currency string (e.g., "$1,234.56")
 * 
 * @example
 * ```typescript
 * // Backend returns totalAR in dollars (e.g., 1234.56)
 * formatCurrencyFromDollars(totalAR) // "$1,234.56"
 * ```
 */
export function formatCurrencyFromDollars(dollars: number): string {
  return formatCurrency(dollars * 100);
}

/**
 * Format percentage value
 * 
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "95.5%")
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with thousand separators
 * 
 * @param value - Number to format
 * @returns Formatted number string (e.g., "1,234")
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

