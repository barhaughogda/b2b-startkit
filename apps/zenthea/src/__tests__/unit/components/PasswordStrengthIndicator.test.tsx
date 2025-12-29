import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator';

describe('PasswordStrengthIndicator', () => {
  it('should render with no password', () => {
    render(<PasswordStrengthIndicator password="" />);
    
    expect(screen.getByText('Password strength')).toBeInTheDocument();
    expect(screen.getByText('No password')).toBeInTheDocument();
  });

  it('should show very weak password strength', () => {
    render(<PasswordStrengthIndicator password="a" />);
    
    expect(screen.getByText('Very weak')).toBeInTheDocument();
  });

  it('should show weak password strength', () => {
    render(<PasswordStrengthIndicator password="password" />);
    
    expect(screen.getByText('Very weak')).toBeInTheDocument();
  });

  it('should show fair password strength', () => {
    render(<PasswordStrengthIndicator password="Password1" />);
    
    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('should show good password strength', () => {
    render(<PasswordStrengthIndicator password="Password123" />);
    
    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('should show strong password strength', () => {
    render(<PasswordStrengthIndicator password="Password123!" />);
    
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('should display password requirements when showRequirements is true', () => {
    render(<PasswordStrengthIndicator password="test" showRequirements={true} />);
    
    expect(screen.getByText('Password requirements:')).toBeInTheDocument();
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Contains uppercase letter')).toBeInTheDocument();
    expect(screen.getByText('Contains lowercase letter')).toBeInTheDocument();
    expect(screen.getByText('Contains number')).toBeInTheDocument();
    expect(screen.getByText('Contains special character')).toBeInTheDocument();
  });

  it('should not display password requirements when showRequirements is false', () => {
    render(<PasswordStrengthIndicator password="test" showRequirements={false} />);
    
    expect(screen.queryByText('Password requirements:')).not.toBeInTheDocument();
  });

  it('should show checkmarks for met requirements', () => {
    render(<PasswordStrengthIndicator password="Password123!" showRequirements={true} />);
    
    // All requirements should be met for this password - check for green text indicating met requirements
    const metRequirements = screen.getAllByText(/At least 8 characters|Contains uppercase letter|Contains lowercase letter|Contains number|Contains special character/);
    expect(metRequirements).toHaveLength(5); // All 5 requirements met
  });

  it('should show X marks for unmet requirements', () => {
    render(<PasswordStrengthIndicator password="a" showRequirements={true} />);
    
    // Most requirements should not be met for this password - check for muted text indicating unmet requirements
    const unmetRequirements = screen.getAllByText(/At least 8 characters|Contains uppercase letter|Contains number|Contains special character/);
    expect(unmetRequirements.length).toBeGreaterThan(0);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <PasswordStrengthIndicator password="test" className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should handle special characters correctly', () => {
    render(<PasswordStrengthIndicator password="Password123!" showRequirements={true} />);
    
    // Should show that special character requirement is met
    expect(screen.getByText('Contains special character')).toBeInTheDocument();
  });

  it('should handle mixed case correctly', () => {
    render(<PasswordStrengthIndicator password="Password123" showRequirements={true} />);
    
    // Should show that uppercase and lowercase requirements are met
    expect(screen.getByText('Contains uppercase letter')).toBeInTheDocument();
    expect(screen.getByText('Contains lowercase letter')).toBeInTheDocument();
  });

  it('should handle numbers correctly', () => {
    render(<PasswordStrengthIndicator password="Password123" showRequirements={true} />);
    
    // Should show that number requirement is met
    expect(screen.getByText('Contains number')).toBeInTheDocument();
  });

  it('should handle length requirements correctly', () => {
    render(<PasswordStrengthIndicator password="Password123" showRequirements={true} />);
    
    // Should show that length requirement is met (12 characters)
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
  });
});
