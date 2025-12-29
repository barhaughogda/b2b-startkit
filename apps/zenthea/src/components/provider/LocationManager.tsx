'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, X, Building2, Phone, Star, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface LocationManagerProps {
  userId: Id<'users'>;
  tenantId: string;
}

type LocationType = 'office' | 'hospital' | 'telehealth';

interface LocationFormData {
  name: string;
  type: LocationType;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

export function LocationManager({ userId, tenantId }: LocationManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<Id<'locations'> | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    type: 'office',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    phone: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Check function existence safely - if it doesn't exist, always skip the query
  // This prevents errors when Convex functions aren't deployed yet
  // Use try-catch to safely check function existence without causing render-phase errors
  let getUserLocationsFn: typeof api.locations.getUserLocations | undefined;
  let hasGetUserLocationsFunction = false;
  try {
    getUserLocationsFn = (api.locations as any).getUserLocations;
    hasGetUserLocationsFunction = typeof getUserLocationsFn === 'function' && getUserLocationsFn !== undefined;
  } catch {
    // Function doesn't exist - will use fallback
    hasGetUserLocationsFunction = false;
  }

  // Fetch user locations (user-based)
  // Always call useQuery with a valid function reference (use fallback if needed)
  // Use getUserLocations if available, otherwise fall back to getLocationsByTenant
  const providerLocations = useQuery(
    hasGetUserLocationsFunction && getUserLocationsFn ? getUserLocationsFn : api.locations.getLocationsByTenant, // Fallback to tenant-based query
    hasGetUserLocationsFunction && userId && tenantId
      ? {
          userId,
          tenantId,
        }
      : tenantId
      ? {
          tenantId,
        }
      : 'skip' // Only skip if no tenantId
  );

  // Fetch all tenant locations for selection
  const allLocations = useQuery(
    api.locations.getLocationsByTenant,
    tenantId
      ? {
          tenantId,
        }
      : 'skip'
  );

  const createLocationMutation = useMutation(api.locations.createLocation);
  const updateLocationMutation = useMutation(api.locations.updateLocation);
  const addUserToLocationMutation = useMutation(api.locations.addUserToLocation);
  const removeProviderFromLocationMutation = useMutation(api.locations.removeProviderFromLocation);
  const setDefaultLocationMutation = useMutation(api.locations.setUserDefaultLocation);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'office',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US',
      phone: '',
    });
    setShowAddForm(false);
    setEditingLocationId(null);
  };

  const handleInputChange = (field: keyof LocationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateLocation = async () => {
    if (!formData.name.trim()) {
      toast.error('Name required', {
        description: 'Please enter a location name.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const locationId = await createLocationMutation({
        name: formData.name,
        type: formData.type,
        address: formData.street || formData.city || formData.state || formData.zipCode
          ? {
              street: formData.street,
              city: formData.city,
              state: formData.state,
              zipCode: formData.zipCode,
              country: formData.country || undefined,
            }
          : undefined,
        phone: formData.phone || undefined,
        tenantId,
      });

      // Automatically assign user to the new location
      await addUserToLocationMutation({
        userId,
        locationId,
        isDefault: providerLocations?.length === 0, // Set as default if it's the first location
        tenantId,
      });

      toast.success('Location created', {
        description: 'The location has been created and added to your locations.',
      });

      resetForm();
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to create location',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExistingLocation = async (locationId: Id<'locations'>) => {
    setIsSaving(true);
    try {
      await addUserToLocationMutation({
        userId,
        locationId,
        isDefault: false,
        tenantId,
      });

      toast.success('Location added', {
        description: 'The location has been added to your locations.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to add location',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveLocation = async (providerLocationId: Id<'providerLocations'>) => {
    setIsSaving(true);
    try {
      await removeProviderFromLocationMutation({
        providerLocationId,
        tenantId,
      });

      toast.success('Location removed', {
        description: 'The location has been removed from your locations.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to remove location',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (locationId: Id<'locations'>) => {
    setIsSaving(true);
    try {
      await setDefaultLocationMutation({
        userId,
        locationId,
        tenantId,
      });

      toast.success('Default location updated', {
        description: 'The default location has been updated.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to set default location',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Get locations not yet assigned to user
  // Handle case where providerLocations might be undefined (loading) or null (not found)
  const availableLocations = React.useMemo(() => {
    if (!allLocations || !Array.isArray(allLocations)) return [];
    // If providerLocations is undefined, it's still loading - return empty array
    if (providerLocations === undefined) return [];
    // If providerLocations is null or not an array, return all locations
    if (!providerLocations || !Array.isArray(providerLocations)) return allLocations;
    return allLocations.filter(
      (loc: any) => !providerLocations.some((pl: any) => pl._id === loc._id)
    );
  }, [allLocations, providerLocations]);

  const getLocationTypeIcon = (type: LocationType | undefined) => {
    switch (type) {
      case 'office':
        return <Building2 className="h-4 w-4" />;
      case 'hospital':
        return <Building2 className="h-4 w-4" />;
      case 'telehealth':
        return <Phone className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  const getLocationTypeLabel = (type: LocationType | undefined) => {
    switch (type) {
      case 'office':
        return 'Office';
      case 'hospital':
        return 'Hospital';
      case 'telehealth':
        return 'Telehealth';
      default:
        return 'Office';
    }
  };

  // Show loading state while query is running
  // providerLocations will be undefined while loading, null if user has no locations, or an array if locations exist
  if (providerLocations === undefined && userId && tenantId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-text-secondary">Loading locations...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Locations</h2>
          <p className="text-text-secondary mt-1">
            Manage the locations where you provide services
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showAddForm ? 'Cancel' : 'Add Location'}
        </Button>
      </div>

      {/* Add New Location Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Location</CardTitle>
            <CardDescription>
              Add a new location where you provide services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location-name">Location Name *</Label>
                <Input
                  id="location-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Main Office"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange('type', value as LocationType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="hospital">Hospital</SelectItem>
                    <SelectItem value="telehealth">Telehealth</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-street">Street Address</Label>
                <Input
                  id="location-street"
                  value={formData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  placeholder="123 Main St"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-city">City</Label>
                <Input
                  id="location-city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-state">State</Label>
                <Input
                  id="location-state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="State"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-zip">ZIP Code</Label>
                <Input
                  id="location-zip"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  placeholder="12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-phone">Phone</Label>
                <Input
                  id="location-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleCreateLocation} disabled={isSaving}>
                {isSaving ? 'Creating...' : 'Create Location'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Locations List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Locations</CardTitle>
          <CardDescription>
            Locations where you are currently assigned to provide services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {providerLocations && Array.isArray(providerLocations) && providerLocations.length > 0 ? (
            <div className="space-y-3">
              {providerLocations.map((location: any) => (
                <div
                  key={location._id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getLocationTypeIcon(location.type)}
                      <h3 className="font-semibold text-text-primary">{location.name}</h3>
                      {location.isDefault && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Default
                        </Badge>
                      )}
                      <Badge variant="outline">{getLocationTypeLabel(location.type)}</Badge>
                    </div>

                    {location.address && (
                      <div className="flex items-start gap-2 text-sm text-text-secondary mb-1">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>
                          {[
                            location.address.street,
                            location.address.city,
                            location.address.state,
                            location.address.zipCode,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}

                    {location.phone && (
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Phone className="h-4 w-4" />
                        <span>{location.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!location.isDefault && location._id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (location._id) {
                            handleSetDefault(location._id);
                          }
                        }}
                        disabled={isSaving}
                        title="Set as default"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLocation(location.providerLocationId)}
                      disabled={isSaving}
                      title="Remove location"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No locations assigned yet.</p>
              <p className="text-sm mt-1">Add a location to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Existing Location */}
      {availableLocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Add Existing Location</CardTitle>
            <CardDescription>
              Add a location that already exists in your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {availableLocations.map((location: any) => (
                <div
                  key={location._id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {getLocationTypeIcon(location.type)}
                    <div>
                      <div className="font-medium">{location.name}</div>
                      {location.address && (
                        <div className="text-sm text-text-secondary">
                          {location.address.city}, {location.address.state}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddExistingLocation(location._id)}
                    disabled={isSaving}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

