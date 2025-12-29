/**
 * Unit Tests for Service Pricing Utilities
 * 
 * Tests the pricing formatting functions in src/lib/services/pricing.ts
 * Covers all pricing modes: hidden, free, fixed, from, range
 */

import { describe, it, expect } from 'vitest';
import {
  formatServicePrice,
  formatCents,
  hasVisiblePrice,
  validatePricing,
  type ServicePricing,
  type PricingMode,
} from '@/lib/services/pricing';

describe('Service Pricing Utilities', () => {
  describe('formatCents()', () => {
    it('should format USD correctly', () => {
      expect(formatCents(15000, 'USD')).toBe('$150.00');
    });

    it('should format cents properly', () => {
      expect(formatCents(15099, 'USD')).toBe('$150.99');
    });

    it('should format zero correctly', () => {
      expect(formatCents(0, 'USD')).toBe('$0.00');
    });

    it('should format small amounts correctly', () => {
      expect(formatCents(50, 'USD')).toBe('$0.50');
    });

    it('should format EUR with symbol after', () => {
      expect(formatCents(10000, 'EUR')).toBe('100.00 €');
    });

    it('should format GBP correctly', () => {
      expect(formatCents(10000, 'GBP')).toBe('£100.00');
    });

    it('should format NOK without decimals', () => {
      expect(formatCents(10000, 'NOK')).toBe('100 kr');
    });

    it('should handle unknown currency with currency code as symbol', () => {
      const result = formatCents(10000, 'XYZ');
      expect(result).toContain('100');
      expect(result).toContain('XYZ');
    });
  });

  describe('formatServicePrice()', () => {
    describe('Hidden Mode', () => {
      it('should return empty string for hidden pricing mode', () => {
        const pricing: ServicePricing = { mode: 'hidden' };
        expect(formatServicePrice(pricing)).toBe('');
      });

      it('should return empty string when pricing is undefined and no legacy price', () => {
        expect(formatServicePrice(undefined)).toBe('');
      });
    });

    describe('Free Mode', () => {
      it('should return "Free" for free pricing mode', () => {
        const pricing: ServicePricing = { mode: 'free' };
        expect(formatServicePrice(pricing)).toBe('Free');
      });

      it('should return "Free" regardless of any amount values', () => {
        const pricing: ServicePricing = { 
          mode: 'free', 
          amountCents: 10000, // Should be ignored
        };
        expect(formatServicePrice(pricing)).toBe('Free');
      });
    });

    describe('Fixed Mode', () => {
      it('should format fixed price in USD by default', () => {
        const pricing: ServicePricing = { 
          mode: 'fixed', 
          amountCents: 15000, 
          currency: 'USD' 
        };
        expect(formatServicePrice(pricing)).toBe('$150.00');
      });

      it('should return empty string if amountCents is missing for fixed', () => {
        const pricing: ServicePricing = { 
          mode: 'fixed', 
          currency: 'USD' 
        };
        expect(formatServicePrice(pricing)).toBe('');
      });

      it('should handle zero amount as valid', () => {
        const pricing: ServicePricing = { 
          mode: 'fixed', 
          amountCents: 0, 
          currency: 'USD' 
        };
        expect(formatServicePrice(pricing)).toBe('$0.00');
      });
    });

    describe('From Mode', () => {
      it('should format "from" price with prefix', () => {
        const pricing: ServicePricing = { 
          mode: 'from', 
          amountCents: 5000, 
          currency: 'USD' 
        };
        expect(formatServicePrice(pricing)).toBe('From $50.00');
      });

      it('should return empty string if amountCents is missing', () => {
        const pricing: ServicePricing = { 
          mode: 'from', 
          currency: 'USD' 
        };
        expect(formatServicePrice(pricing)).toBe('');
      });
    });

    describe('Range Mode', () => {
      it('should format range price with dash separator', () => {
        const pricing: ServicePricing = { 
          mode: 'range', 
          minCents: 5000, 
          maxCents: 10000, 
          currency: 'USD' 
        };
        expect(formatServicePrice(pricing)).toBe('$50.00 – $100.00');
      });

      it('should return empty string if minCents is missing', () => {
        const pricing: ServicePricing = { 
          mode: 'range', 
          maxCents: 10000,
          currency: 'USD' 
        };
        expect(formatServicePrice(pricing)).toBe('');
      });

      it('should return empty string if maxCents is missing', () => {
        const pricing: ServicePricing = { 
          mode: 'range', 
          minCents: 5000, 
          currency: 'USD' 
        };
        expect(formatServicePrice(pricing)).toBe('');
      });

      it('should return empty string if both amounts are missing for range', () => {
        const pricing: ServicePricing = { 
          mode: 'range', 
          currency: 'USD' 
        };
        expect(formatServicePrice(pricing)).toBe('');
      });
    });

    describe('Legacy Price Handling', () => {
      it('should format legacy price when pricing is undefined', () => {
        expect(formatServicePrice(undefined, 10000)).toBe('$100.00');
      });

      it('should ignore legacy price of zero', () => {
        expect(formatServicePrice(undefined, 0)).toBe('');
      });

      it('should ignore legacy price when pricing object is provided', () => {
        const pricing: ServicePricing = { mode: 'free' };
        expect(formatServicePrice(pricing, 10000)).toBe('Free');
      });
    });

    describe('Currency Handling', () => {
      it('should use currency from pricing object', () => {
        const pricing: ServicePricing = { 
          mode: 'fixed', 
          amountCents: 10000, 
          currency: 'EUR' 
        };
        const result = formatServicePrice(pricing);
        expect(result).toContain('100');
        expect(result).toContain('€');
      });

      it('should use tenant currency when pricing has no currency', () => {
        const pricing: ServicePricing = { 
          mode: 'fixed', 
          amountCents: 10000 
        };
        const result = formatServicePrice(pricing, undefined, 'GBP');
        expect(result).toContain('100');
        expect(result).toContain('£');
      });

      it('should default to USD when no currency is provided', () => {
        const pricing: ServicePricing = { 
          mode: 'fixed', 
          amountCents: 10000 
        };
        const result = formatServicePrice(pricing);
        expect(result).toBe('$100.00');
      });
    });
  });

  describe('hasVisiblePrice()', () => {
    it('should return false for hidden mode', () => {
      expect(hasVisiblePrice({ mode: 'hidden' })).toBe(false);
    });

    it('should return true for free mode', () => {
      expect(hasVisiblePrice({ mode: 'free' })).toBe(true);
    });

    it('should return true for fixed mode', () => {
      expect(hasVisiblePrice({ mode: 'fixed', amountCents: 5000 })).toBe(true);
    });

    it('should return true for from mode', () => {
      expect(hasVisiblePrice({ mode: 'from', amountCents: 5000 })).toBe(true);
    });

    it('should return true for range mode', () => {
      expect(hasVisiblePrice({ mode: 'range', minCents: 5000, maxCents: 10000 })).toBe(true);
    });

    it('should return false for undefined pricing with no legacy price', () => {
      expect(hasVisiblePrice(undefined)).toBe(false);
    });

    it('should return true for undefined pricing with legacy price', () => {
      expect(hasVisiblePrice(undefined, 5000)).toBe(true);
    });

    it('should return false for undefined pricing with zero legacy price', () => {
      expect(hasVisiblePrice(undefined, 0)).toBe(false);
    });
  });

  describe('validatePricing()', () => {
    it('should return undefined for valid hidden pricing', () => {
      expect(validatePricing({ mode: 'hidden' })).toBeUndefined();
    });

    it('should return undefined for valid free pricing', () => {
      expect(validatePricing({ mode: 'free' })).toBeUndefined();
    });

    it('should return undefined for valid fixed pricing', () => {
      expect(validatePricing({ mode: 'fixed', amountCents: 5000 })).toBeUndefined();
    });

    it('should return error for fixed pricing without amount', () => {
      const error = validatePricing({ mode: 'fixed' });
      expect(error).toBeDefined();
      expect(error).toContain('Amount');
    });

    it('should return error for fixed pricing with negative amount', () => {
      const error = validatePricing({ mode: 'fixed', amountCents: -100 });
      expect(error).toBeDefined();
    });

    it('should return undefined for valid from pricing', () => {
      expect(validatePricing({ mode: 'from', amountCents: 5000 })).toBeUndefined();
    });

    it('should return error for from pricing without amount', () => {
      const error = validatePricing({ mode: 'from' });
      expect(error).toBeDefined();
    });

    it('should return undefined for valid range pricing', () => {
      expect(validatePricing({ mode: 'range', minCents: 5000, maxCents: 10000 })).toBeUndefined();
    });

    it('should return error for range pricing without minCents', () => {
      const error = validatePricing({ mode: 'range', maxCents: 10000 });
      expect(error).toBeDefined();
    });

    it('should return error for range pricing without maxCents', () => {
      const error = validatePricing({ mode: 'range', minCents: 5000 });
      expect(error).toBeDefined();
    });

    it('should return error when minCents > maxCents', () => {
      const error = validatePricing({ mode: 'range', minCents: 10000, maxCents: 5000 });
      expect(error).toBeDefined();
      expect(error).toContain('Minimum');
    });

    it('should return error for negative prices in range', () => {
      const error = validatePricing({ mode: 'range', minCents: -100, maxCents: 5000 });
      expect(error).toBeDefined();
      expect(error).toContain('negative');
    });
  });

  describe('PricingMode type', () => {
    it('should support all valid pricing modes', () => {
      const modes: PricingMode[] = ['hidden', 'free', 'fixed', 'from', 'range'];
      
      modes.forEach(mode => {
        const pricing: ServicePricing = { mode };
        expect(pricing.mode).toBe(mode);
      });
    });
  });
});
