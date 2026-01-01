'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Save, 
  AlertCircle, 
  Loader2,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin
} from 'lucide-react';
import { useClinicProfile } from '@/hooks/useClinicProfile';
import { toast } from 'sonner';

interface ClinicProfileFormData {
  // Basic info
  name: string;
  type: 'clinic' | 'hospital' | 'practice' | 'group';
  // Contact info
  phone: string;
  email: string;
  website?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/**
 * Clinic Profile Editor Component
 * Form for editing clinic business information, branding, and URL settings
 */
export function ClinicProfileEditor() {
  const { 
    tenantData, 
    tenantId, 
    isLoading, 
    hasError, 
    canQuery, 
    updateContactInfo,
    updateOrganization
  } = useClinicProfile();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ClinicProfileFormData>({
    defaultValues: {
      // Basic info
      name: '',
      type: 'clinic',
      // Contact info
      phone: '',
      email: '',
      website: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
  });

  // Populate form when tenant data loads
  useEffect(() => {
    if (tenantData && !isDirty) {
      reset({
        name: tenantData.name || '',
        type: tenantData.type || 'clinic',
        phone: tenantData.contactInfo?.phone || '',
        email: tenantData.contactInfo?.email || '',
        website: tenantData.contactInfo?.website || '',
        street: tenantData.contactInfo?.address?.street || '',
        city: tenantData.contactInfo?.address?.city || '',
        state: tenantData.contactInfo?.address?.state || '',
        zipCode: tenantData.contactInfo?.address?.zipCode || '',
        country: tenantData.contactInfo?.address?.country || '',
      });
    }
  }, [tenantData, isDirty, reset]);

  const onSubmit = async (data: ClinicProfileFormData) => {
    if (!tenantId || !canQuery) {
      setSaveError('Cannot save: Session not found or tenant ID not available');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // 1. Update organization name in Clerk if changed
      if (data.name !== tenantData?.name && updateOrganization) {
        await updateOrganization({ name: data.name });
      }

      // 2. Update clinic details in Postgres
      if (updateContactInfo && tenantId) {
        await updateContactInfo({
          tenantId,
          contactInfo: {
            type: data.type,
            phone: data.phone,
            email: data.email,
            website: data.website || undefined,
            address: {
              street: data.street,
              city: data.city,
              state: data.state,
              zipCode: data.zipCode,
              country: data.country,
            },
          },
        });
      }

      setSaveSuccess(true);
      toast.success('Profile saved successfully!');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving clinic profile:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save clinic profile');
      toast.error(error instanceof Error ? error.message : 'Failed to save clinic profile');
    } finally {
      setIsSaving(false);
    }
  };


  if (!canQuery) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 p-4 bg-status-warning/10 border border-status-warning rounded-md">
              <AlertCircle className="h-5 w-5 text-status-warning" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Not Authenticated
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Please sign in to edit your clinic profile.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zenthea-teal mx-auto"></div>
            <p className="mt-2 text-text-secondary">Loading clinic profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 p-4 bg-status-error/10 border border-status-error rounded-md">
              <AlertCircle className="h-5 w-5 text-status-error" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Tenant not found
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  The clinic profile could not be loaded. Please ensure your tenant is properly configured.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4 pb-4 border-b border-border-primary">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                {...register('name', { required: 'Organization name is required' })}
                placeholder="Enter organization name"
                className={errors.name ? 'border-status-error' : ''}
              />
              {errors.name && (
                <p className="text-xs text-status-error mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="type">Organization Type</Label>
              <Select
                value={watch('type')}
                onValueChange={(value) => setValue('type', value as ClinicProfileFormData['type'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="practice">Practice</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4 pt-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Contact Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone *
              </Label>
              <Input
                id="phone"
                {...register('phone', { required: 'Phone is required' })}
                placeholder="(555) 123-4567"
                className={errors.phone ? 'border-status-error' : ''}
              />
              {errors.phone && (
                <p className="text-xs text-status-error mt-1">{errors.phone.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email', { required: 'Email is required' })}
                placeholder="clinic@example.com"
                className={errors.email ? 'border-status-error' : ''}
              />
              {errors.email && (
                <p className="text-xs text-status-error mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="website" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Website
            </Label>
            <Input
              id="website"
              type="url"
              {...register('website')}
              placeholder="https://www.example.com"
            />
          </div>
          
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address
            </Label>
            <div>
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                {...register('street')}
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  {...register('city')}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  {...register('state')}
                  placeholder="State"
                />
              </div>
              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  {...register('zipCode')}
                  placeholder="12345"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                {...register('country')}
                placeholder="Country"
              />
            </div>
          </div>
        </div>

        {/* Save Button and Messages */}
        <div className="flex items-center justify-between pt-4 border-t border-border-primary">
          <div>
            {saveError && (
              <div className="flex items-center gap-2 text-status-error">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{saveError}</p>
              </div>
            )}
            {saveSuccess && (
              <p className="text-sm text-status-success">Profile saved successfully!</p>
            )}
          </div>
          <Button
            type="submit"
            disabled={isSaving || !isDirty}
            className="bg-interactive-primary hover:bg-interactive-primary-hover"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </form>
  );
}


