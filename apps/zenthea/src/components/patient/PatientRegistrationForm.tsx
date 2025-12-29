'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Lock, Mail, User, Phone, Calendar, Shield } from 'lucide-react';

interface PatientRegistrationFormProps {
  tenantId?: string;
  redirectTo?: string;
  primaryColor?: string; // Tenant branding primary color
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export function PatientRegistrationForm({ tenantId, redirectTo = '/patient/dashboard', primaryColor }: PatientRegistrationFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptPrivacy: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Only clear error if the user is fixing the specific field that caused the error
    // Don't clear error automatically on every input change
  };

  const validateStep1 = () => {
    const { firstName, lastName, email, phone, dateOfBirth } = formData;
    
    console.log('Validating step 1 with data:', { firstName, lastName, email, phone, dateOfBirth });
    
    if (!firstName.trim()) {
      console.log('First name validation failed');
      setError('First name is required');
      return false;
    }
    if (!lastName.trim()) {
      console.log('Last name validation failed');
      setError('Last name is required');
      return false;
    }
    if (!email.trim()) {
      console.log('Email validation failed - empty');
      setError('Email address is required');
      return false;
    }
    // More comprehensive email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Email validation failed - invalid format:', email);
      const errorMessage = 'Valid email address is required';
      console.log('Setting error to:', errorMessage);
      setError(errorMessage);
      console.log('Error set complete');
      return false;
    }
    if (!phone.trim()) {
      console.log('Phone validation failed');
      setError('Phone number is required');
      return false;
    }
    if (!dateOfBirth) {
      console.log('Date of birth validation failed');
      setError('Date of birth is required');
      return false;
    }
    
    // Validate age (must be 18 or older)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 18) {
      console.log('Age validation failed');
      setError('You must be 18 or older to register');
      return false;
    }
    
    console.log('Step 1 validation passed');
    return true;
  };

  const validateStep2 = () => {
    const { password, confirmPassword, acceptTerms, acceptPrivacy } = formData;
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!acceptTerms) {
      setError('You must accept the terms of service');
      return false;
    }
    if (!acceptPrivacy) {
      setError('You must accept the privacy policy');
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    console.log('handleNext called, step:', step);
    console.log('Validating step 1...');
    const isValid = validateStep1();
    console.log('Validation result:', isValid);
    if (isValid) {
      console.log('Step 1 validation passed, moving to step 2');
      setError(''); // Clear error only if validation passed
      setStep(2);
    } else {
      console.log('Step 1 validation failed, error should be set');
    }
  };

  const handleBack = () => {
    setStep(1);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement actual patient registration API call
      const response = await fetch('/api/patient/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tenantId: tenantId || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      // Redirect to login or dashboard
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 1) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>
            Step 1 of 2: Personal Information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { 
            console.log('Form onSubmit called'); 
            e.preventDefault(); 
            console.log('Calling handleNext...');
            handleNext(); 
          }} className="space-y-4" role="form">
            <input type="submit" style={{ display: 'none' }} />
            {error && (
              <Alert role="alert" data-testid="error-alert">
                {error}
              </Alert>
            )}
            {/* Debug: Always show error state */}
            <div data-testid="error-state-debug" style={{ display: 'none' }}>
              Error state: &quot;{error}&quot;
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full text-white hover:opacity-90"
              style={{ backgroundColor: primaryColor || 'var(--zenthea-teal)' }}
              disabled={isLoading}
              onClick={(e) => {
                console.log('Button clicked, triggering form submission');
                e.preventDefault();
                handleNext();
              }}
            >
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          Step 2 of 2: Security & Terms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" role="form">
          {error && (
            <Alert>
              {error}
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="pl-10 pr-10"
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Password must be at least 8 characters long
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="pl-10 pr-10"
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="acceptTerms"
                checked={formData.acceptTerms}
                onCheckedChange={(checked) => handleInputChange('acceptTerms', checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="acceptTerms" className="text-sm">
                I agree to the{' '}
                <a href="/terms" className="text-primary hover:underline" target="_blank">
                  Terms of Service
                </a>
              </Label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="acceptPrivacy"
                checked={formData.acceptPrivacy}
                onCheckedChange={(checked) => handleInputChange('acceptPrivacy', checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="acceptPrivacy" className="text-sm">
                I agree to the{' '}
                <a href="/privacy" className="text-primary hover:underline" target="_blank">
                  Privacy Policy
                </a>
              </Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleBack}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1 text-white hover:opacity-90"
              style={{ backgroundColor: primaryColor || 'var(--zenthea-teal)' }}
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
