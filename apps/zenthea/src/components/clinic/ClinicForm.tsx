"use client";

import { useState, useEffect } from "react";
import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { Clinic } from "@/types";
import { Id } from "@/convex/_generated/dataModel";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { TimezoneSelector } from "@/components/ui/timezone-selector";

interface ClinicFormProps {
  clinic?: Clinic;
  onSave: () => void;
  onCancel: () => void;
}

interface ClinicFormData {
  name: string;
  description: string;
  address: string;
  timezone: string;
  isActive: boolean;
}

/**
 * Converts technical error messages into user-friendly messages
 */
function parseErrorMessage(error: unknown, context?: { clinicName?: string }): string {
  const errorMessage =
    error instanceof Error ? error.message : String(error) || "An unexpected error occurred";
  
  // Handle "already exists" errors
  if (errorMessage.includes("already exists") || errorMessage.includes("A clinic with this name")) {
    const clinicName = context?.clinicName ? `"${context.clinicName}"` : "this name";
    return `A clinic with ${clinicName} already exists. Please choose a different name.`;
  }
  
  // Handle unauthorized errors
  if (errorMessage.includes("Unauthorized") || errorMessage.includes("not authorized")) {
    return "You don't have permission to perform this action. Please contact your administrator.";
  }
  
  // Handle validation errors
  if (errorMessage.includes("Validation error") || errorMessage.includes("Invalid")) {
    return "Please check your input and try again.";
  }
  
  // Strip out technical details from Convex errors
  let cleanMessage = errorMessage
    .replace(/\[CONVEX[^\]]+\]/g, '') // Remove [CONVEX ...] tags
    .replace(/\[Request ID:[^\]]+\]/g, '') // Remove Request ID tags
    .replace(/Server Error\s*/g, '') // Remove "Server Error" prefix
    .replace(/Uncaught Error:\s*/g, '') // Remove "Uncaught Error:" prefix
    .replace(/at handler[^\n]+/g, '') // Remove file paths and line numbers
    .replace(/Called by client[^\n]+/g, '') // Remove "Called by client" details
    .replace(/\.\.\/[^\s]+/g, '') // Remove relative file paths
    .trim();
  
  // If we stripped everything, provide a generic message
  if (!cleanMessage || cleanMessage.length < 5) {
    return "An error occurred while saving the clinic. Please try again.";
  }
  
  return cleanMessage;
}

export function ClinicForm({ clinic, onSave, onCancel }: ClinicFormProps) {
  const { data: session } = useZentheaSession();
  const createClinic = useAction((api as any).clinic?.clinics?.createClinic as any);
  const updateClinic = useAction((api as any).clinic?.clinics?.updateClinic as any);

  const [formData, setFormData] = useState<ClinicFormData>({
    name: clinic?.name || "",
    description: clinic?.description || "",
    address: clinic?.address || "",
    timezone: (clinic as any)?.timezone || "",
    isActive: clinic?.isActive ?? true,
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data when clinic prop changes
  useEffect(() => {
    if (clinic) {
      setFormData({
        name: clinic.name,
        description: clinic.description || "",
        address: clinic.address || "",
        timezone: (clinic as any)?.timezone || "",
        isActive: clinic.isActive,
      });
    }
  }, [clinic]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    // Name is required
    if (!formData.name.trim()) {
      newErrors.push("Clinic name is required");
    }

    // Name length validation
    if (formData.name.trim().length < 2) {
      newErrors.push("Clinic name must be at least 2 characters long");
    }

    if (formData.name.trim().length > 100) {
      newErrors.push("Clinic name must be less than 100 characters");
    }

    // Description length validation (optional field)
    if (formData.description.length > 500) {
      newErrors.push("Description must be less than 500 characters");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!session?.user?.tenantId) {
      setErrors(["Unable to determine tenant. Please sign in again."]);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      // Prepare address string (only include if not empty)
      const addressData = formData.address.trim() || undefined;
      // Prepare timezone (only include if not empty, otherwise use tenant default)
      const timezoneData = formData.timezone.trim() || undefined;

      if (clinic) {
        // Edit mode
        await updateClinic({
          tenantId: session.user.tenantId,
          userEmail: session.user.email!,
          clinicId: clinic._id as Id<"clinics">,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          address: addressData,
          timezone: timezoneData,
          isActive: formData.isActive,
        });
        toast.success("Clinic updated successfully");
        onSave();
      } else {
        // Create mode
        await createClinic({
          tenantId: session.user.tenantId,
          userEmail: session.user.email!,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          address: addressData,
          timezone: timezoneData,
          isActive: formData.isActive,
        });

        toast.success("Clinic created successfully");
        onSave();
      }
    } catch (error) {
      const userFriendlyMessage = parseErrorMessage(error, {
        clinicName: formData.name.trim(),
      });
      
      setErrors([userFriendlyMessage]);
      toast.error(userFriendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    field: keyof ClinicFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {clinic ? "Edit Clinic" : "Create New Clinic"}
        </CardTitle>
        <CardDescription>
          {clinic
            ? "Update clinic information and status"
            : "Add a new clinic to organize your clinic staff"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.length > 0 && (
            <Alert className="border-status-error bg-status-error/10">
              <AlertCircle className="h-4 w-4 text-status-error" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Clinic Name <span className="text-status-error">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              disabled={isSubmitting}
              required
              aria-required="true"
              aria-invalid={errors.some((e) => e.includes("name"))}
              placeholder="e.g., Cardiology, Pediatrics, General Practice"
              maxLength={100}
            />
            <p className="text-xs text-text-tertiary">
              {formData.name.length}/100 characters
            </p>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              disabled={isSubmitting}
              placeholder="Optional description of the clinic's purpose or responsibilities"
              maxLength={500}
              rows={3}
              aria-invalid={errors.some((e) => e.includes("Description"))}
            />
            <p className="text-xs text-text-tertiary">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Address Field */}
          <div className="space-y-2">
            <AddressAutocomplete
              id="address"
              label="Address"
              value={formData.address}
              onChange={(address) => handleInputChange("address", address)}
              onPlaceSelect={(place) => {
                // Ensure we capture the full formatted address when a place is selected
                // This callback ensures we get the complete address even if onChange was called with partial text
                let fullAddress = "";
                if (place?.formatted_address) {
                  fullAddress = place.formatted_address;
                } else if (place?.address_components && place.address_components.length > 0) {
                  // Construct address from components - prefer this over name for more complete address
                  const components = place.address_components;
                  const streetNumber = components.find((c: any) => c.types.includes('street_number'))?.long_name || '';
                  const streetName = components.find((c: any) => c.types.includes('route'))?.long_name || '';
                  const city = components.find((c: any) => c.types.includes('locality'))?.long_name || '';
                  const state = components.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name || '';
                  const zip = components.find((c: any) => c.types.includes('postal_code'))?.long_name || '';
                  const country = components.find((c: any) => c.types.includes('country'))?.long_name || '';
                  const parts = [streetNumber, streetName, city, state, zip, country].filter(Boolean);
                  fullAddress = parts.join(', ');
                } else if (place?.name) {
                  fullAddress = place.name;
                }
                
                if (fullAddress) {
                  // Force update the form state immediately - this should override any partial text
                  setFormData((prev) => ({ ...prev, address: fullAddress }));
                  // Also call handleInputChange to ensure consistency
                  handleInputChange("address", fullAddress);
                }
              }}
              placeholder="Start typing an address..."
              disabled={isSubmitting}
            />
            <p className="text-xs text-text-tertiary">
              Optional address information for this clinic. Use Google Maps autocomplete for accurate addresses.
            </p>
          </div>

          {/* Timezone Field */}
          <div className="space-y-2">
            <TimezoneSelector
              value={formData.timezone}
              onChange={(timezone) => handleInputChange("timezone", timezone)}
              disabled={isSubmitting}
              label="Timezone"
              placeholder="Use organization default"
            />
            <p className="text-xs text-text-tertiary">
              Set the timezone for this clinic. If not specified, the organization&apos;s default timezone will be used for scheduling.
            </p>
          </div>

          {/* Active/Inactive Toggle */}
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="isActive" className="text-base">
                Clinic Status
              </Label>
              <p className="text-sm text-text-secondary">
                {formData.isActive
                  ? "This clinic is active and can be assigned to users"
                  : "This clinic is inactive and cannot be assigned to new users"}
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange("isActive", checked)}
              disabled={isSubmitting}
              aria-label="Toggle clinic active status"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {clinic ? "Updating..." : "Creating..."}
                </>
              ) : (
                clinic ? "Update Clinic" : "Create Clinic"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

