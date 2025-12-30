"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isOwner } from "@/lib/auth-utils";
import { PermissionEditor } from "@/components/clinic/PermissionEditor";
import { getFullAccessPermissionTree } from "@/lib/permissions/validation";
import type { PermissionTree, CustomRole, Clinic } from "@/types";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/ui/back-button";

// Force dynamic rendering - requires session context
export const dynamic = 'force-dynamic';

interface InvitationFormData {
  email: string;
  clinicIds: string[];
  customRoleId: string;
}

export default function InviteUserPage() {
  const { data: session, status } = useZentheaSession();
  const router = useRouter();
  const tenantId = session?.user?.tenantId;

  // Form state
  const [formData, setFormData] = useState<InvitationFormData>({
    email: "",
    clinicIds: [],
    customRoleId: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPermissionPreview, setShowPermissionPreview] = useState(false);

  // Fetch clinics and roles
  const clinics = useQuery(
    (api as any).clinic?.clinics?.getClinics as any,
    tenantId && session?.user?.email ? { tenantId, userEmail: session.user.email } : "skip"
  ) as Clinic[] | undefined;

  const customRoles = useQuery(
    (api as any).customRoles?.getCustomRolesByTenant as any,
    tenantId ? { tenantId } : "skip"
  ) as CustomRole[] | undefined;

  // Get selected role's permissions for preview
  const selectedRole = useMemo(() => {
    if (!formData.customRoleId || !customRoles) return null;
    return customRoles.find((role) => role._id === formData.customRoleId) || null;
  }, [formData.customRoleId, customRoles]);

  const previewPermissions: PermissionTree = useMemo(() => {
    if (selectedRole?.permissions) {
      return selectedRole.permissions as PermissionTree;
    }
    // Default to empty permissions if no role selected
    return getFullAccessPermissionTree();
  }, [selectedRole]);

  // Check if user is owner - must be before conditional returns
  const userIsOwner = useMemo(() => {
    if (!session?.user) return false;
    return isOwner(session.user);
  }, [session]);

  // Filter active clinics only - must be before conditional returns
  const activeClinics = useMemo(() => {
    if (!clinics) return [];
    return clinics.filter((clinic) => clinic.isActive);
  }, [clinics]);

  // Handle loading state
  if (status === "loading") {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-text-secondary">Loading...</p>
        </div>
      </ClinicLayout>
    );
  }

  // Handle unauthenticated state
  if (status === "unauthenticated") {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-text-secondary">Please sign in to access this page.</p>
        </div>
      </ClinicLayout>
    );
  }

  // Check owner-only access
  if (!userIsOwner) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-text-secondary">
            Access denied. Only clinic owners can invite users.
          </p>
        </div>
      </ClinicLayout>
    );
  }

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    // Email validation
    if (!formData.email.trim()) {
      newErrors.push("Email address is required");
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.push("Please enter a valid email address");
      }
    }

    // Clinic validation (at least one required)
    if (formData.clinicIds.length === 0) {
      newErrors.push("At least one clinic must be selected");
    }

    // Role validation (required)
    if (!formData.customRoleId) {
      newErrors.push("A role must be selected");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!tenantId) {
      setErrors(["Unable to determine tenant. Please sign in again."]);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const response = await fetch("/api/company/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          clinicIds: formData.clinicIds,
          customRoleId: formData.customRoleId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Failed to send invitation");
      }

      const result = await response.json();
      toast.success(result.message || "Invitation sent successfully");
      router.push("/company/settings/users");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send invitation";
      setErrors([errorMessage]);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof InvitationFormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleClinicToggle = (clinicId: string) => {
    setFormData((prev) => {
      const newClinicIds = prev.clinicIds.includes(clinicId)
        ? prev.clinicIds.filter((id) => id !== clinicId)
        : [...prev.clinicIds, clinicId];
      return { ...prev, clinicIds: newClinicIds };
    });
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  return (
    <ClinicLayout>
      <div className="max-w-4xl mx-auto p-6">
        <BackButton href="/company/settings/users" label="Back to User Management" />
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Invite User</h1>
          <p className="text-text-secondary mt-1">
            Send an invitation to a new user to join your clinic
          </p>
        </div>

        {/* Invitation Form */}
        <Card>
          <CardHeader>
            <CardTitle>User Invitation</CardTitle>
            <CardDescription>
              Fill in the details below to send an invitation email to the new user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-status-error">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-text-tertiary" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    disabled={isSubmitting}
                    required
                    aria-required="true"
                    aria-invalid={errors.some((e) => e.includes("email"))}
                    placeholder="user@example.com"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-text-tertiary">
                  The invitation will be sent to this email address
                </p>
              </div>

              {/* Clinic Selector */}
              <div className="space-y-2">
                <Label>
                  Clinics <span className="text-status-error">*</span>
                </Label>
                {activeClinics.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No active clinics available. Please create a clinic first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2 rounded-lg border p-4 bg-surface-elevated">
                    {activeClinics.map((clinic) => (
                      <div
                        key={clinic._id}
                        className="flex items-center space-x-2 p-2 hover:bg-background-secondary rounded cursor-pointer"
                        onClick={() => handleClinicToggle(clinic._id as string)}
                      >
                        <input
                          type="checkbox"
                          id={`clinic-${clinic._id}`}
                          checked={formData.clinicIds.includes(clinic._id as string)}
                          onChange={() => handleClinicToggle(clinic._id as string)}
                          disabled={isSubmitting}
                          className="h-4 w-4 rounded border-border-primary text-interactive-primary focus:ring-interactive-primary"
                        />
                        <label
                          htmlFor={`clinic-${clinic._id}`}
                          className="flex-1 cursor-pointer text-sm font-medium text-text-primary"
                        >
                          {clinic.name}
                        </label>
                        {clinic.description && (
                          <span className="text-xs text-text-secondary">
                            {clinic.description}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-text-tertiary">
                  Select one or more clinics for this user
                </p>
              </div>

              {/* Role Selector */}
              <div className="space-y-2">
                <Label htmlFor="customRoleId">
                  Role <span className="text-status-error">*</span>
                </Label>
                <Select
                  value={formData.customRoleId}
                  onValueChange={(value) => handleInputChange("customRoleId", value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="customRoleId" aria-required="true">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {customRoles && customRoles.length > 0 ? (
                      customRoles.map((role) => (
                        <SelectItem key={role._id} value={role._id}>
                          {role.name}
                          {role.description && ` - ${role.description}`}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No roles available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {selectedRole && (
                  <p className="text-xs text-text-tertiary">
                    {selectedRole.description || "No description available"}
                  </p>
                )}
                <p className="text-xs text-text-tertiary">
                  The selected role determines the user&apos;s permissions
                </p>
              </div>

              {/* Permission Preview */}
              {formData.customRoleId && selectedRole && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Permission Preview</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPermissionPreview(!showPermissionPreview)}
                      className="h-8"
                    >
                      {showPermissionPreview ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Hide Preview
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Show Preview
                        </>
                      )}
                    </Button>
                  </div>
                  {showPermissionPreview && (
                    <div className="rounded-lg border p-4 bg-surface-elevated max-h-[400px] overflow-y-auto">
                      <PermissionEditor
                        permissions={previewPermissions}
                        readOnly={true}
                        tenantId={tenantId}
                      />
                    </div>
                  )}
                  <p className="text-xs text-text-tertiary">
                    Preview the permissions that will be granted to this user
                  </p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Invitation...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ClinicLayout>
  );
}

