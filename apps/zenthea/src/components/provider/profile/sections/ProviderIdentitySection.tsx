/**
 * Provider Identity Section Component
 * 
 * Handles basic identity information: name, contact details, title, demographics, specialties, languages, and bio
 */

import React from 'react';
import { useSession } from 'next-auth/react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { FIELD_LABELS, FIELD_PLACEHOLDERS, FIELD_HELP_TEXT } from '@/lib/constants/providerProfileConstants';
import type { ProviderProfileUpdateData } from '@/lib/schemas/providerProfile';
import { User, Mail, Phone, Calendar, Briefcase } from 'lucide-react';

interface ProviderIdentitySectionProps {
  formData: ProviderProfileUpdateData;
  updateField: <K extends keyof ProviderProfileUpdateData>(
    field: K,
    value: ProviderProfileUpdateData[K]
  ) => void;
  errors: any;
}

export function ProviderIdentitySection({
  formData,
  updateField,
  errors,
}: ProviderIdentitySectionProps) {
  const { data: session } = useSession();
  
  // Parse name from session
  const sessionName = session?.user?.name || '';
  const nameParts = sessionName.split(' ');
  const defaultFirstName = nameParts[0] || '';
  const defaultLastName = nameParts.slice(1).join(' ') || '';

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4 pb-4 border-b border-border-primary">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <User className="h-4 w-4" />
          Basic Information
        </h3>
        
        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="title">Title/Prefix</Label>
            <Select
              value={formData.title || ''}
              onValueChange={(value) => updateField('title', value as 'Dr.' | 'Mr.' | 'Ms.' | 'Mrs.' | 'Prof.' | undefined)}
            >
              <SelectTrigger id="title" className={errors.title ? 'border-status-error' : ''}>
                <SelectValue placeholder="Select title" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dr.">Dr.</SelectItem>
                <SelectItem value="Mr.">Mr.</SelectItem>
                <SelectItem value="Ms.">Ms.</SelectItem>
                <SelectItem value="Mrs.">Mrs.</SelectItem>
                <SelectItem value="Prof.">Prof.</SelectItem>
              </SelectContent>
            </Select>
            {errors.title && (
              <p className="text-xs text-status-error mt-1">
                {errors.title.message as string}
              </p>
            )}
            <p className="text-xs text-text-tertiary mt-1">Your professional title</p>
          </div>
          
          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              placeholder="John"
              value={formData.firstName || defaultFirstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              className={errors.firstName ? 'border-status-error' : ''}
            />
            {errors.firstName && (
              <p className="text-xs text-status-error mt-1">
                {errors.firstName.message as string}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={formData.lastName || defaultLastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              className={errors.lastName ? 'border-status-error' : ''}
            />
            {errors.lastName && (
              <p className="text-xs text-status-error mt-1">
                {errors.lastName.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@example.com"
              value={formData.email || session?.user?.email || ''}
              onChange={(e) => updateField('email', e.target.value)}
              className={errors.email ? 'border-status-error' : ''}
            />
            {errors.email && (
              <p className="text-xs text-status-error mt-1">
                {errors.email.message as string}
              </p>
            )}
            <p className="text-xs text-text-tertiary mt-1">Your professional email address</p>
          </div>
          
          <div>
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone *
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.phone || ''}
              onChange={(e) => updateField('phone', e.target.value)}
              className={errors.phone ? 'border-status-error' : ''}
            />
            {errors.phone && (
              <p className="text-xs text-status-error mt-1">
                {errors.phone.message as string}
              </p>
            )}
            <p className="text-xs text-text-tertiary mt-1">Your work phone number</p>
          </div>
        </div>

        {/* Demographics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={formData.gender || ''}
              onValueChange={(value) => updateField('gender', value as 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | undefined)}
            >
              <SelectTrigger id="gender" className={errors.gender ? 'border-status-error' : ''}>
                <SelectValue placeholder="Select gender (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="non-binary">Non-binary</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-xs text-status-error mt-1">
                {errors.gender.message as string}
              </p>
            )}
            <p className="text-xs text-text-tertiary mt-1">Optional demographic information</p>
          </div>
          
          <div>
            <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date of Birth
            </Label>
            <DateInput
              id="dateOfBirth"
              value={formData.dateOfBirth || ''}
              onChange={(value) => updateField('dateOfBirth', value)}
              className={errors.dateOfBirth ? 'border-status-error' : ''}
              max={new Date().toISOString().split('T')[0]!} // Can't be in the future
            />
            {errors.dateOfBirth && (
              <p className="text-xs text-status-error mt-1">
                {errors.dateOfBirth.message as string}
              </p>
            )}
            <p className="text-xs text-text-tertiary mt-1">Optional: Used for age calculation</p>
          </div>
        </div>
      </div>

      {/* Professional Information */}
      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Professional Information
        </h3>
        
        <div>
          <Label htmlFor="specialties">{FIELD_LABELS.specialties} *</Label>
          <Input
            id="specialties"
            placeholder={FIELD_PLACEHOLDERS.specialties}
            value={formData.specialties?.join(', ') || ''}
            onChange={(e) => {
              const specialties = e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
              updateField('specialties', specialties);
            }}
            className={errors.specialties ? 'border-status-error' : ''}
          />
          {errors.specialties && (
            <p className="text-xs text-status-error mt-1">
              {errors.specialties.message as string}
            </p>
          )}
          <p className="text-xs text-text-tertiary mt-1">{FIELD_HELP_TEXT.specialties}</p>
        </div>

        <div>
          <Label htmlFor="languages">{FIELD_LABELS.languages} *</Label>
          <Input
            id="languages"
            placeholder={FIELD_PLACEHOLDERS.languages}
            value={formData.languages?.join(', ') || ''}
            onChange={(e) => {
              const languages = e.target.value
                .split(',')
                .map((l) => l.trim())
                .filter(Boolean);
              updateField('languages', languages);
            }}
            className={errors.languages ? 'border-status-error' : ''}
          />
          {errors.languages && (
            <p className="text-xs text-status-error mt-1">
              {errors.languages.message as string}
            </p>
          )}
          <p className="text-xs text-text-tertiary mt-1">{FIELD_HELP_TEXT.languages}</p>
        </div>

        <div>
          <Label htmlFor="bio">{FIELD_LABELS.bio} *</Label>
          <Textarea
            id="bio"
            className={`min-h-[120px] ${errors.bio ? 'border-status-error' : ''}`}
            placeholder={FIELD_PLACEHOLDERS.bio}
            value={formData.bio || ''}
            onChange={(e) => updateField('bio', e.target.value)}
          />
          {errors.bio && (
            <p className="text-xs text-status-error mt-1">{errors.bio.message as string}</p>
          )}
          <p className="text-xs text-text-tertiary mt-1">{FIELD_HELP_TEXT.bio}</p>
        </div>
      </div>
    </div>
  );
}

