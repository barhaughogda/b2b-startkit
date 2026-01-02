/**
 * Service Pricing Utilities
 * 
 * Provides formatting and utility functions for service pricing.
 * Supports multiple pricing modes: hidden, free, fixed, from, and range.
 */

/** Pricing mode options */
export type PricingMode = 'hidden' | 'free' | 'fixed' | 'from' | 'range';

/** Pricing configuration for a service */
export interface ServicePricing {
  mode: PricingMode;
  currency?: string;
  amountCents?: number;
  minCents?: number;
  maxCents?: number;
}

/** Default currency if not specified */
export const DEFAULT_CURRENCY = 'USD';

/**
 * Currency formatting configuration by currency code
 */
const CURRENCY_CONFIG: Record<string, { symbol: string; position: 'before' | 'after'; decimals: number }> = {
  USD: { symbol: '$', position: 'before', decimals: 2 },
  EUR: { symbol: '€', position: 'after', decimals: 2 },
  GBP: { symbol: '£', position: 'before', decimals: 2 },
  NOK: { symbol: 'kr', position: 'after', decimals: 0 },
  SEK: { symbol: 'kr', position: 'after', decimals: 0 },
  DKK: { symbol: 'kr', position: 'after', decimals: 0 },
  CAD: { symbol: 'CA$', position: 'before', decimals: 2 },
  AUD: { symbol: 'A$', position: 'before', decimals: 2 },
  JPY: { symbol: '¥', position: 'before', decimals: 0 },
  CHF: { symbol: 'CHF', position: 'before', decimals: 2 },
};

/**
 * Get currency configuration for a given currency code
 */
function getCurrencyConfig(currency: string) {
  return CURRENCY_CONFIG[currency] || { symbol: currency, position: 'before' as const, decimals: 2 };
}

/**
 * Format cents amount to display string
 * 
 * @param cents - Amount in cents
 * @param currency - ISO 4217 currency code
 * @returns Formatted price string (e.g., "$120.00", "120 kr")
 */
export function formatCents(cents: number, currency: string = DEFAULT_CURRENCY): string {
  const config = getCurrencyConfig(currency);
  const amount = cents / 100;
  
  // Format with proper decimals
  const formatted = config.decimals === 0 
    ? Math.round(amount).toString()
    : amount.toFixed(config.decimals);
  
  // Apply currency symbol position
  if (config.position === 'before') {
    return `${config.symbol}${formatted}`;
  } else {
    return `${formatted} ${config.symbol}`;
  }
}

/**
 * Format service pricing for display
 * 
 * @param pricing - Pricing configuration (or undefined for legacy services)
 * @param legacyPriceCents - Legacy price in cents (for backward compatibility)
 * @param tenantCurrency - Default currency from tenant settings
 * @returns Display string (e.g., "Free", "From $120", "$80 - $150", or empty string for hidden)
 */
export function formatServicePrice(
  pricing: ServicePricing | undefined,
  legacyPriceCents?: number,
  tenantCurrency: string = DEFAULT_CURRENCY
): string {
  // Handle legacy price (no pricing object)
  if (!pricing) {
    if (legacyPriceCents !== undefined && legacyPriceCents > 0) {
      return formatCents(legacyPriceCents, tenantCurrency);
    }
    return ''; // No price info
  }

  const currency = pricing.currency || tenantCurrency;

  switch (pricing.mode) {
    case 'hidden':
      return '';
    
    case 'free':
      return 'Free';
    
    case 'fixed':
      if (pricing.amountCents === undefined) return '';
      return formatCents(pricing.amountCents, currency);
    
    case 'from':
      if (pricing.amountCents === undefined) return '';
      return `From ${formatCents(pricing.amountCents, currency)}`;
    
    case 'range':
      if (pricing.minCents === undefined || pricing.maxCents === undefined) return '';
      return `${formatCents(pricing.minCents, currency)} – ${formatCents(pricing.maxCents, currency)}`;
    
    default:
      return '';
  }
}

/**
 * Get a short price preview for compact UI display
 * 
 * @param pricing - Pricing configuration
 * @param legacyPriceCents - Legacy price in cents
 * @param tenantCurrency - Default currency
 * @returns Compact display string
 */
export function getShortPricePreview(
  pricing: ServicePricing | undefined,
  legacyPriceCents?: number,
  tenantCurrency: string = DEFAULT_CURRENCY
): string {
  const formatted = formatServicePrice(pricing, legacyPriceCents, tenantCurrency);
  return formatted || 'No price';
}

/**
 * Check if a service has a visible price
 */
export function hasVisiblePrice(pricing: ServicePricing | undefined, legacyPriceCents?: number): boolean {
  if (!pricing) {
    return legacyPriceCents !== undefined && legacyPriceCents > 0;
  }
  return pricing.mode !== 'hidden';
}

/**
 * Convert legacy price to pricing object
 * For backward compatibility with old services that only have a price field
 */
export function legacyPriceToPricing(priceCents: number | undefined): ServicePricing | undefined {
  if (priceCents === undefined || priceCents === 0) {
    return undefined;
  }
  return {
    mode: 'fixed',
    amountCents: priceCents,
  };
}

/**
 * Get effective pricing (handles legacy fallback)
 */
export function getEffectivePricing(
  pricing: ServicePricing | undefined,
  legacyPriceCents?: number
): ServicePricing | undefined {
  if (pricing) return pricing;
  return legacyPriceToPricing(legacyPriceCents);
}

/**
 * Validate pricing configuration
 * @returns Error message if invalid, undefined if valid
 */
export function validatePricing(pricing: ServicePricing): string | undefined {
  switch (pricing.mode) {
    case 'fixed':
    case 'from':
      if (pricing.amountCents === undefined || pricing.amountCents < 0) {
        return 'Amount is required for fixed/from pricing';
      }
      break;
    
    case 'range':
      if (pricing.minCents === undefined || pricing.maxCents === undefined) {
        return 'Both min and max prices are required for range pricing';
      }
      if (pricing.minCents < 0 || pricing.maxCents < 0) {
        return 'Prices cannot be negative';
      }
      if (pricing.minCents > pricing.maxCents) {
        return 'Minimum price cannot exceed maximum price';
      }
      break;
  }
  
  return undefined;
}

