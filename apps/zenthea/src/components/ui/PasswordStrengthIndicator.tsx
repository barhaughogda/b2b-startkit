'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Check, X } from 'lucide-react';

/**
 * Props for the PasswordStrengthIndicator component
 */
interface PasswordStrengthIndicatorProps {
  /** The password string to analyze */
  password: string;
  /** Additional CSS classes to apply */
  className?: string;
  /** Whether to show the requirements list */
  showRequirements?: boolean;
}

/**
 * Interface for password requirements
 */
interface PasswordRequirement {
  /** Human-readable label for the requirement */
  label: string;
  /** Function to test if the password meets this requirement */
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  {
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    label: 'Contains uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: 'Contains lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    label: 'Contains number',
    test: (password) => /\d/.test(password),
  },
  {
    label: 'Contains special character',
    test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  },
];

/**
 * Password strength indicator component that shows password strength and requirements
 * 
 * @param password - The password string to analyze
 * @param className - Additional CSS classes to apply
 * @param showRequirements - Whether to show the requirements list
 * @returns JSX element displaying password strength indicator
 */
export function PasswordStrengthIndicator({ 
  password, 
  className = '',
  showRequirements = true 
}: PasswordStrengthIndicatorProps) {
  /**
   * Calculates the strength score for a password based on various criteria
   * 
   * @param password - The password to analyze
   * @returns A score from 0-10 indicating password strength
   */
  const getStrengthScore = (password: string): number => {
    if (!password) return 0;
    
    let score = 0;
    const length = password.length;
    
    // Length scoring
    if (length >= 8) score += 1;
    if (length >= 12) score += 1;
    if (length >= 16) score += 1;
    
    // Character variety scoring
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
    
    // Bonus for mixed case and numbers
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password) && /[a-zA-Z]/.test(password)) score += 1;
    
    return Math.min(score, 10); // Cap at 10
  };

  /**
   * Converts a strength score to a human-readable label
   * 
   * @param score - The strength score (0-10)
   * @returns A string describing the password strength
   */
  const getStrengthLabel = (score: number): string => {
    if (score === 0) return 'No password';
    if (score <= 2) return 'Very weak';
    if (score <= 4) return 'Weak';
    if (score <= 6) return 'Fair';
    if (score <= 8) return 'Good';
    return 'Strong';
  };

  /**
   * Returns the appropriate color class for a given strength score
   * 
   * @param score - The strength score (0-10)
   * @returns A CSS class name for the strength color
   */
  const getStrengthColor = (score: number): string => {
    if (score === 0) return 'bg-muted';
    if (score <= 2) return 'bg-destructive';
    if (score <= 4) return 'bg-orange-500';
    if (score <= 6) return 'bg-yellow-500';
    if (score <= 8) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const score = getStrengthScore(password);
  const percentage = (score / 10) * 100;
  const strengthLabel = getStrengthLabel(score);
  const strengthColor = getStrengthColor(score);

  const metRequirements = requirements.map(req => ({
    ...req,
    met: req.test(password),
  }));

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Password strength</span>
          <span className={`font-medium ${
            score <= 2 ? 'text-destructive' :
            score <= 4 ? 'text-orange-600' :
            score <= 6 ? 'text-yellow-600' :
            score <= 8 ? 'text-blue-600' :
            'text-green-600'
          }`}>
            {strengthLabel}
          </span>
        </div>
        
        <div className="relative">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${strengthColor}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Requirements List */}
      {showRequirements && password && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Password requirements:
          </h4>
          <ul className="space-y-1">
            {metRequirements.map((req, index) => (
              <li
                key={index}
                className={`flex items-center gap-2 text-sm ${
                  req.met ? 'text-green-600' : 'text-muted-foreground'
                }`}
              >
                {req.met ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <X className="h-3 w-3 text-muted-foreground" />
                )}
                <span>{req.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
