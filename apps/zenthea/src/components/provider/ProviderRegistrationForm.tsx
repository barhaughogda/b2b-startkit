'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Lock, Mail, User, Phone, Calendar, Shield, Stethoscope, FileText, Hash } from 'lucide-react';
import { useProviderRegistration } from '@/hooks/useProviderRegistration';

interface ProviderRegistrationFormProps {
  tenantId?: string;
  redirectTo?: string;
}

export function ProviderRegistrationForm({ tenantId, redirectTo = '/provider/dashboard' }: ProviderRegistrationFormProps) {
  const {
    formData,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    isLoading,
    error,
    step,
    handleInputChange,
    handleNext,
    handleBack,
    handleSubmit,
  } = useProviderRegistration({ tenantId, redirectTo });

  if (step === 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Provider Registration - Step 1 of 3
          </CardTitle>
          <CardDescription>Basic Information</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" role="form">
            {error && <Alert className="border-destructive text-destructive">{error}</Alert>}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  First Name
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
                aria-required="true"
              />
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (step === 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Provider Registration - Step 2 of 3
          </CardTitle>
          <CardDescription>Professional Information</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" role="form">
            {error && <Alert className="border-destructive text-destructive">{error}</Alert>}
            
            <div className="space-y-2">
              <Label htmlFor="specialty" className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Specialty
              </Label>
              <Input
                id="specialty"
                type="text"
                value={formData.specialty}
                onChange={(e) => handleInputChange('specialty', e.target.value)}
                required
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseNumber" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                License Number
              </Label>
              <Input
                id="licenseNumber"
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                required
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="npi" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                NPI
              </Label>
              <Input
                id="npi"
                type="text"
                value={formData.npi}
                onChange={(e) => handleInputChange('npi', e.target.value)}
                required
                aria-required="true"
                maxLength={10}
              />
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Provider Registration - Step 3 of 3
        </CardTitle>
        <CardDescription>Security & Terms</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" role="form">
          {error && <Alert className="border-destructive text-destructive">{error}</Alert>}
          
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                aria-required="true"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                required
                aria-required="true"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="acceptTerms"
                checked={formData.acceptTerms}
                onCheckedChange={(checked) => handleInputChange('acceptTerms', checked as boolean)}
                aria-required="true"
              />
              <Label htmlFor="acceptTerms" className="text-sm">
                I accept the terms of service
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="acceptPrivacy"
                checked={formData.acceptPrivacy}
                onCheckedChange={(checked) => handleInputChange('acceptPrivacy', checked as boolean)}
                aria-required="true"
              />
              <Label htmlFor="acceptPrivacy" className="text-sm">
                I accept the privacy policy
              </Label>
            </div>
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={handleBack}>
              Back
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Register'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
