'use client';

import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, X, Building2, Star, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface ClinicAssignmentManagerProps {
  userId: Id<'users'>;
  tenantId: string;
}

// Clinic type from Convex
interface Clinic {
  _id: Id<'clinics'>;
  name: string;
  description?: string;
  address?: string;
  timezone?: string;
  isActive: boolean;
  tenantId: string;
}

/**
 * ClinicAssignmentManager - Provider clinic selection component
 * 
 * This component allows providers to:
 * - Add themselves to existing clinics (created by admins)
 * - Remove themselves from clinics
 * - Set a default clinic
 * 
 * Providers CANNOT create new clinics - only admins can do that.
 * Clinic management happens at /company/settings/clinics
 */
export function ClinicAssignmentManager({ userId, tenantId }: ClinicAssignmentManagerProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Fetch user's assigned clinics
  const userClinics = useQuery(
    api.clinics.getUserClinics,
    userId && tenantId ? { userId, tenantId } : 'skip'
  ) as Clinic[] | undefined;

  // Fetch available clinics (not yet assigned to user)
  const availableClinics = useQuery(
    api.clinics.getAvailableClinicsForUser,
    userId && tenantId ? { userId, tenantId } : 'skip'
  ) as Clinic[] | undefined;

  // Mutations
  const assignToClinic = useMutation(api.clinics.assignUserToClinic);
  const removeFromClinic = useMutation(api.clinics.removeUserFromClinic);
  const setDefaultClinic = useMutation(api.clinics.setUserDefaultClinic);

  const handleAddClinic = async (clinicId: string) => {
    setIsSaving(true);
    try {
      await assignToClinic({
        userId,
        clinicId,
      });

      toast.success('Clinic added', {
        description: 'You have been added to the clinic.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to add clinic',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveClinic = async (clinicId: string) => {
    setIsSaving(true);
    try {
      await removeFromClinic({
        userId,
        clinicId,
      });

      toast.success('Clinic removed', {
        description: 'You have been removed from the clinic.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to remove clinic',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (clinicId: string) => {
    setIsSaving(true);
    try {
      await setDefaultClinic({
        userId,
        clinicId,
      });

      toast.success('Default clinic updated', {
        description: 'Your default clinic has been updated.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to set default clinic',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (userClinics === undefined && userId && tenantId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-text-secondary">Loading clinics...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if the user's first clinic is the default
  const defaultClinicId = userClinics && userClinics.length > 0 ? userClinics[0]._id : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Clinics</h2>
        <p className="text-text-secondary mt-1">
          Select the clinics where you provide services
        </p>
      </div>

      {/* Your Clinics */}
      <Card>
        <CardHeader>
          <CardTitle>Your Clinics</CardTitle>
          <CardDescription>
            Clinics where you are currently providing services. Your default clinic is used for availability settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userClinics && userClinics.length > 0 ? (
            <div className="space-y-3">
              {userClinics.map((clinic, index) => {
                const isDefault = index === 0;
                return (
                  <div
                    key={clinic._id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-zenthea-teal" />
                        <h3 className="font-semibold text-text-primary">{clinic.name}</h3>
                        {isDefault && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current" />
                            Default
                          </Badge>
                        )}
                        {!clinic.isActive && (
                          <Badge variant="outline" className="text-status-warning">
                            Inactive
                          </Badge>
                        )}
                      </div>

                      {clinic.description && (
                        <p className="text-sm text-text-secondary mb-2">
                          {clinic.description}
                        </p>
                      )}

                      {clinic.address && (
                        <div className="flex items-start gap-2 text-sm text-text-secondary mb-1">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{clinic.address}</span>
                        </div>
                      )}

                      {clinic.timezone && (
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <Globe className="h-4 w-4" />
                          <span>{clinic.timezone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(clinic._id)}
                          disabled={isSaving}
                          title="Set as default"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveClinic(clinic._id)}
                        disabled={isSaving}
                        title="Remove from this clinic"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>You are not assigned to any clinics yet.</p>
              <p className="text-sm mt-1">
                Select a clinic from the available options below to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Clinics */}
      {availableClinics && availableClinics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Clinics</CardTitle>
            <CardDescription>
              Clinics in your organization that you can join. Contact your administrator if you don&apos;t see a clinic you need.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {availableClinics.map((clinic) => (
                <div
                  key={clinic._id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-text-secondary" />
                    <div>
                      <div className="font-medium">{clinic.name}</div>
                      {clinic.description && (
                        <div className="text-sm text-text-secondary">
                          {clinic.description}
                        </div>
                      )}
                      {clinic.address && (
                        <div className="text-sm text-text-secondary flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {clinic.address}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddClinic(clinic._id)}
                    disabled={isSaving}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Join
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No clinics available message */}
      {availableClinics && availableClinics.length === 0 && userClinics && userClinics.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-text-secondary opacity-50" />
            <h3 className="font-semibold text-text-primary mb-2">No Clinics Available</h3>
            <p className="text-text-secondary">
              There are no clinics configured for your organization yet.
              Please contact your administrator to set up clinic locations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
