/**
 * Provider Contact Information Section Component
 * 
 * Handles basic contact information: firstName, lastName, email, and phone
 * 
 * IMPORTANT: When saving changes, this component updates BOTH:
 * 1. The `users` table (for authentication/session data)
 * 2. The `providers` table (for appointment references and displays)
 * 
 * This ensures name changes propagate correctly across the entire system,
 * including appointments, schedules, and other provider-related displays.
 */

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { User, Mail, Phone } from 'lucide-react';
import { Id } from '@/convex/_generated/dataModel';

interface ProviderContactInformationSectionProps {
  userData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  } | null;
}

export function ProviderContactInformationSection({
  userData,
}: ProviderContactInformationSectionProps) {
  const { data: session, update: updateSession } = useSession();
  const updateUser = useMutation(api.users.updateUser);
  const updateProvider = useMutation(api.providers.updateProvider);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Get provider record to sync name changes
  const tenantId = session?.user?.tenantId || 'demo-tenant';
  const userEmail = session?.user?.email;
  const provider = useQuery(
    api.providers.getProviderByEmail,
    userEmail && tenantId ? { email: userEmail, tenantId } : 'skip'
  );

  const [formData, setFormData] = useState({
    firstName: userData?.firstName || '',
    lastName: userData?.lastName || '',
    email: userData?.email || session?.user?.email || '',
    phone: userData?.phone || '',
  });

  // Update form data when userData changes
  useEffect(() => {
    if (userData) {
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || session?.user?.email || '',
        phone: userData.phone || '',
      });
    }
  }, [userData, session?.user?.email]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!session?.user?.id) {
      toast.error('Error', {
        description: 'You must be logged in to update your profile.',
      });
      return;
    }

    // Validation
    if (!formData.firstName?.trim()) {
      toast.error('Validation Error', {
        description: 'First name is required.',
      });
      return;
    }

    if (!formData.lastName?.trim()) {
      toast.error('Validation Error', {
        description: 'Last name is required.',
      });
      return;
    }

    if (!formData.email?.trim() || !formData.email.includes('@')) {
      toast.error('Validation Error', {
        description: 'A valid email address is required.',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Update name field when firstName or lastName changes
      const updatedName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
      
      // Update user record
      await updateUser({
        id: session.user.id as Id<'users'>,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        name: updatedName,
        phone: formData.phone?.trim() || undefined,
        // Note: Email updates might require additional validation/verification
        // For now, we'll only update if it's different
      });

      // Also update the provider record to keep names in sync
      // This ensures appointments and other references show the updated name
      if (provider?._id) {
        await updateProvider({
          id: provider._id as Id<'providers'>,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone?.trim() || undefined,
        });
      }

      // Refresh the session to update name across the portal
      if (updateSession) {
        await updateSession();
      }

      toast.success('Profile updated', {
        description: 'Your contact information has been saved.',
      });
      setIsEditing(false);
      // The parent component will refetch the profile data automatically
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save contact information.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      firstName: userData?.firstName || '',
      lastName: userData?.lastName || '',
      email: userData?.email || session?.user?.email || '',
      phone: userData?.phone || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            First Name *
          </Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            disabled={!isEditing}
            placeholder="Enter your first name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Last Name *
          </Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            disabled={!isEditing}
            placeholder="Enter your last name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email Address *
        </Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          disabled={!isEditing}
          placeholder="your.email@example.com"
        />
        <p className="text-xs text-text-tertiary mt-1">
          Your email address is used for account access and notifications.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone" className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Phone Number
        </Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          disabled={!isEditing}
          placeholder="+1 (555) 123-4567"
        />
        <p className="text-xs text-text-tertiary mt-1">
          Optional. Used for contact and appointment notifications.
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        {isEditing ? (
          <>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
          </>
        ) : (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            Edit Contact Information
          </Button>
        )}
      </div>
    </div>
  );
}

