'use client';

import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

/**
 * Password strength requirements and validation
 */
const requirements = [
  { label: 'At least 8 characters', test: (pwd: string) => pwd.length >= 8 },
  { label: 'Contains uppercase letter', test: (pwd: string) => /[A-Z]/.test(pwd) },
  { label: 'Contains lowercase letter', test: (pwd: string) => /[a-z]/.test(pwd) },
  { label: 'Contains number', test: (pwd: string) => /\d/.test(pwd) },
  { label: 'Contains special character', test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
];

/**
 * Calculate password strength score (0-100)
 */
function calculatePasswordStrength(password: string): number {
  if (!password) return 0;
  
  const passedRequirements = requirements.filter(req => req.test(password)).length;
  return (passedRequirements / requirements.length) * 100;
}

/**
 * Get strength level based on score
 */
function getStrengthLevel(score: number): {
  level: 'weak' | 'fair' | 'good' | 'strong';
  color: string;
  label: string;
} {
  if (score < 25) return { level: 'weak', color: 'bg-status-error', label: 'Weak' };
  if (score < 50) return { level: 'fair', color: 'bg-status-warning', label: 'Fair' };
  if (score < 75) return { level: 'good', color: 'bg-zenthea-teal', label: 'Good' };
  return { level: 'strong', color: 'bg-status-success', label: 'Strong' };
}

/**
 * Password strength indicator component
 * Shows password requirements and strength level
 */
export function PasswordStrengthIndicator({ password, className = '' }: PasswordStrengthIndicatorProps) {
  const score = calculatePasswordStrength(password);
  const strength = getStrengthLevel(score);
  
  if (!password) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Password strength:</span>
          <span className={`font-medium ${
            strength.level === 'weak' ? 'text-status-error' :
            strength.level === 'fair' ? 'text-status-warning' :
            strength.level === 'good' ? 'text-zenthea-teal' :
            'text-status-success'
          }`}>
            {strength.label}
          </span>
        </div>
        <div className="w-full bg-surface-elevated rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Requirements List */}
      <div className="space-y-2">
        <p className="text-sm text-text-secondary">Password requirements:</p>
        <div className="space-y-1">
          {requirements.map((req, index) => {
            const isValid = req.test(password);
            return (
              <div key={index} className="flex items-center space-x-2 text-sm">
                {isValid ? (
                  <Check className="h-4 w-4 text-status-success" />
                ) : (
                  <X className="h-4 w-4 text-status-error" />
                )}
                <span className={isValid ? 'text-status-success' : 'text-text-tertiary'}>
                  {req.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
