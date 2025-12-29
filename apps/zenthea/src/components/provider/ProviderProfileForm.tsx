'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { User, Mail, Phone, Stethoscope, FileText, Hash, Save, X } from 'lucide-react';

interface ProviderProfileFormProps {
  provider: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    specialty: string;
    licenseNumber: string;
    npi: string;
  };
  onSave: (data: Partial<ProviderProfileFormProps['provider']>) => Promise<void>;
  isEditing: boolean;
}

export function ProviderProfileForm({ provider, onSave, isEditing }: ProviderProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: provider.firstName,
    lastName: provider.lastName,
    email: provider.email,
    phone: provider.phone || '',
    specialty: provider.specialty,
    licenseNumber: provider.licenseNumber,
    npi: provider.npi,
  });

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const validateForm = () => {
    const { firstName, lastName, email, phone, specialty, licenseNumber, npi } = formData;
    const errors: string[] = [];
    
    if (!firstName.trim()) {
      errors.push('First name is required');
    }
    if (!lastName.trim()) {
      errors.push('Last name is required');
    }
    if (!email.trim() || !email.includes('@')) {
      errors.push('Valid email address is required');
    }
    if (!phone.trim()) {
      errors.push('Valid phone number is required');
    } else if (phone.length < 10) {
      errors.push('Valid phone number is required');
    }
    if (!specialty.trim()) {
      errors.push('Specialty is required');
    }
    if (!licenseNumber || !licenseNumber.trim()) {
      errors.push('License number must be valid format');
    } else if (!licenseNumber.match(/^[A-Z]{2}\d{6}$/)) {
      errors.push('License number must be valid format');
    }
    if (!npi || !npi.trim() || npi.length !== 10) {
      errors.push('NPI must be 10 digits');
    }
    
    if (errors.length > 0) {
      setError(errors.join(', '));
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: provider.firstName,
      lastName: provider.lastName,
      email: provider.email,
      phone: provider.phone || '',
      specialty: provider.specialty,
      licenseNumber: provider.licenseNumber,
      npi: provider.npi,
    });
    setError('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Basic Information
        </CardTitle>
        <CardDescription>Your professional details and credentials</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-6"
          role="form"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
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
                disabled={!isEditing}
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
                disabled={!isEditing}
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
              disabled={!isEditing}
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
              disabled={!isEditing}
              required
              aria-required="true"
            />
          </div>

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
              disabled={!isEditing}
              required
              aria-required="true"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                disabled={!isEditing}
                required
                aria-required="true"
                placeholder="e.g., MD123456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npi" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                NPI Number
              </Label>
              <Input
                id="npi"
                type="text"
                value={formData.npi}
                onChange={(e) => handleInputChange('npi', e.target.value)}
                disabled={!isEditing}
                required
                aria-required="true"
                placeholder="10-digit NPI"
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
                <Save className="h-4 w-4" aria-hidden="true" />
                {isLoading ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}