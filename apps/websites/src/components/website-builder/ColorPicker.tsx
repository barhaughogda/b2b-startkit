'use client';

/**
 * ColorPicker Component
 *
 * Reusable color picker with swatch preview and hex input.
 * Used for customizing navigation colors in the website builder.
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { getContrastRatio, getContrastStatus, isValidHex } from '@/lib/website-builder/contrast';

// =============================================================================
// TYPES
// =============================================================================

export interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export interface ContrastWarningProps {
  backgroundColor?: string;
  textColor?: string;
  label: string;
}

// =============================================================================
// COLOR PICKER COMPONENT
// =============================================================================

/**
 * Normalize hex color input
 * Ensures proper format: uppercase, with # prefix, 6 characters
 * Returns empty string if invalid to prevent invalid state persistence
 */
function normalizeHex(value: string): string {
  // Remove all non-hex characters
  let normalized = value.replace(/[^0-9A-Fa-f]/g, '')
  
  // Handle 3-character shorthand
  if (normalized.length === 3) {
    normalized = normalized.split('').map(char => char + char).join('')
  }
  
  // Ensure 6 characters
  if (normalized.length === 6) {
    return `#${normalized.toUpperCase()}`
  }
  
  // Return empty string if invalid length to prevent invalid state
  // This prevents values like "##" or "#GG" from persisting
  return ''
}

/**
 * Convert CSS variable to hex color value
 * Falls back to default hex if variable can't be resolved
 */
function cssVarToHex(cssVar: string): string {
  // If it's already a hex color, return it
  if (cssVar.startsWith('#')) {
    return cssVar;
  }
  
  // If it's a CSS variable, try to resolve it
  if (cssVar.startsWith('var(--')) {
    // Extract variable name
    const varName = cssVar.match(/var\(--([^)]+)\)/)?.[1];
    if (!varName) {
      return '#000000'; // Fallback
    }
    
    // Try to get computed value from document
    if (typeof window !== 'undefined') {
      const computed = getComputedStyle(document.documentElement).getPropertyValue(`--${varName}`).trim();
      if (computed) {
        // If it's already hex, return it
        if (computed.startsWith('#')) {
          return computed;
        }
        // Try to parse RGB/RGBA
        const rgbMatch = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
          const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
          const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
          const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
          return `#${r}${g}${b}`.toUpperCase();
        }
      }
    }
    
    // Known CSS variable defaults
    const knownVars: Record<string, string> = {
      'zenthea-teal': '#008080',
      'zenthea-purple': '#5F284A',
      'zenthea-coral': '#E07B7E',
      'zenthea-cream': '#F2DDC9',
    };
    
    return knownVars[varName] || '#000000';
  }
  
  // If it's not a CSS variable or hex, return fallback
  return '#000000';
}

export function ColorPicker({ label, value, onChange, disabled }: ColorPickerProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    
    // Allow empty input for partial typing
    if (newValue === '') {
      onChange('')
      return
    }
    
    // Validate and normalize hex color
    if (isValidHex(newValue)) {
      const normalized = normalizeHex(newValue)
      onChange(normalized)
    } else {
      // Allow partial input (user might be typing)
      // Only reject if it's clearly invalid (contains non-hex chars after removing #)
      const cleaned = newValue.replace('#', '')
      if (/^[0-9A-Fa-f]*$/.test(cleaned) || cleaned === '') {
        onChange(newValue)
      }
    }
  }

  // Convert CSS variables to hex for the color input
  const hexValue = isValidHex(value) ? value : cssVarToHex(value);

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-lg border border-border-primary overflow-hidden"
          style={{ backgroundColor: isValidHex(value) ? value : '#000000' }}
        >
          <input
            type="color"
            value={hexValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full opacity-0 cursor-pointer"
            disabled={disabled}
            aria-label={`Pick ${label} color`}
          />
        </div>
        <Input
          value={value}
          onChange={handleInputChange}
          onBlur={(e) => {
            // Normalize on blur if valid, clear if invalid
            if (isValidHex(e.target.value)) {
              const normalized = normalizeHex(e.target.value)
              onChange(normalized)
            } else if (e.target.value.trim() !== '') {
              // Clear invalid input on blur (but allow empty for user to retype)
              onChange('')
            }
          }}
          className="flex-1 font-mono text-sm"
          placeholder="#000000"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// =============================================================================
// CONTRAST WARNING COMPONENT
// =============================================================================

export function ContrastWarning({ backgroundColor, textColor, label }: ContrastWarningProps) {
  if (!backgroundColor || !textColor) {
    return null;
  }

  // Check if colors are valid hex format
  const bgValid = isValidHex(backgroundColor)
  const textValid = isValidHex(textColor)

  if (!bgValid || !textValid) {
    return (
      <div className="flex items-start gap-2 p-2 rounded-lg bg-status-error/10 border border-status-error/30">
        <AlertCircle className="w-4 h-4 text-status-error mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs text-status-error font-medium">{label}</p>
          <p className="text-xs text-status-error/80">
            {!bgValid && !textValid
              ? 'Invalid color format for both colors'
              : !bgValid
              ? 'Invalid background color format'
              : 'Invalid text color format'}
          </p>
        </div>
      </div>
    )
  }

  const ratio = getContrastRatio(backgroundColor, textColor)
  const status = getContrastStatus(ratio, false)

  if (status.status === 'pass') {
    return null
  }

  // Determine if we should suggest lighter or darker with actionable guidance
  const suggestion = ratio && ratio < 4.5
    ? 'Try a darker text color or lighter background. For example, use #000000 on #FFFFFF for maximum contrast.'
    : ''

  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-status-warning/10 border border-status-warning/30">
      <AlertCircle className="w-4 h-4 text-status-warning mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-xs text-status-warning font-medium">{label}</p>
        <p className="text-xs text-status-warning/80">
          {status.message}
          {suggestion && ` ${suggestion}`}
        </p>
      </div>
    </div>
  )
}

export default ColorPicker;
