"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useRouter, useParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isOwner } from "@/lib/auth-utils";
import { Loader2, AlertCircle, Shield, Settings, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import { PermissionEditor } from "@/components/clinic/PermissionEditor";
import type { PermissionTree } from "@/types";
import { getFullAccessPermissionTree } from "@/lib/permissions/validation";

// Force dynamic rendering - requires session context
export const dynamic = 'force-dynamic';

export default function EditRolePage() {
  const { data: session, status } = useZentheaSession();
  const router = useRouter();
  const params = useParams();
  const roleId = params?.id as string;

  const updateRole = useMutation((api as any).customRoles?.updateCustomRole as any);

  // Fetch role data
  const role = useQuery(
    (api as any).customRoles?.getCustomRole as any,
    roleId ? { roleId: roleId as Id<"customRoles"> } : "skip"
  );

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [permissions, setPermissions] = useState<PermissionTree>(getFullAccessPermissionTree());
  const [permissionsChanged, setPermissionsChanged] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    description?: string;
  }>({});

  // Get tenant ID from session
  const tenantId = session?.user?.tenantId;

  // Check if user is owner
  const userIsOwner = useMemo(() => {
    if (!session?.user) return false;
    return isOwner(session.user);
  }, [session]);

  // Initialize form when role data loads
  useEffect(() => {
    if (role) {
      setName(role.name || "");
      setDescription(role.description || "");
      setIsTemplate(role.isTemplate || false);
      // Load permissions if they exist, otherwise use empty tree
      if (role.permissions) {
        setPermissions(role.permissions as PermissionTree);
      } else {
        // Use empty permission tree if no permissions set
        setPermissions(getFullAccessPermissionTree());
      }
      setPermissionsChanged(false);
    }
  }, [role]);

  // Verify tenant access
  const hasAccess = useMemo(() => {
    if (!role || !tenantId) return false;
    return role.tenantId === tenantId;
  }, [role, tenantId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});

    // Validate form
    const validationErrors: { name?: string; description?: string } = {};
    
    if (!name.trim()) {
      validationErrors.name = "Role name is required";
    } else if (name.trim().length < 2) {
      validationErrors.name = "Role name must be at least 2 characters";
    } else if (name.trim().length > 100) {
      validationErrors.name = "Role name must be less than 100 characters";
    }

    if (description && description.trim().length > 500) {
      validationErrors.description = "Description must be less than 500 characters";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!roleId || !role) {
      toast.error("Error", {
        description: "Role not found. Please try again.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await updateRole({
        roleId: roleId as Id<"customRoles">,
        name: name.trim(),
        description: description.trim() || undefined,
        isTemplate,
      });

      toast.success("Role updated successfully", {
        description: `Role "${name.trim()}" has been updated.`,
      });

      // Optionally redirect back to roles list
      // router.push("/company/settings/roles");
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role", {
        description:
          error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle permission changes
  const handlePermissionsChange = (newPermissions: PermissionTree) => {
    setPermissions(newPermissions);
    setPermissionsChanged(true);
  };

  // Handle saving permissions
  const handleSavePermissions = async () => {
    if (!roleId || !role) {
      toast.error("Error", {
        description: "Role not found. Please try again.",
      });
      return;
    }

    setIsSavingPermissions(true);

    try {
      const response = await fetch(`/api/company/roles/${roleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          permissions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to save permissions");
      }

      toast.success("Permissions updated successfully", {
        description: `Permissions for "${name || role.name}" have been updated.`,
      });

      setPermissionsChanged(false);
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("Failed to save permissions", {
        description:
          error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setIsSavingPermissions(false);
    }
  };

  // Handle loading state
  if (status === "loading") {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
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
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Access denied. Only clinic owners can edit custom roles.
            </AlertDescription>
          </Alert>
        </div>
      </ClinicLayout>
    );
  }

  // Handle role loading state
  if (role === undefined) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
        </div>
      </ClinicLayout>
    );
  }

  // Handle role not found
  if (role === null) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Role not found. It may have been deleted or you may not have access to it.
            </AlertDescription>
          </Alert>
        </div>
      </ClinicLayout>
    );
  }

  // Handle tenant access check
  if (!hasAccess) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Access denied. You do not have access to this role.
            </AlertDescription>
          </Alert>
        </div>
      </ClinicLayout>
    );
  }

  return (
    <ClinicLayout>
      <div className="max-w-3xl mx-auto p-6">
        <BackButton href="/company/settings/roles" label="Back to Roles" />
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/company/settings/roles">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Roles
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-interactive-primary" />
            <h1 className="text-3xl font-bold text-text-primary">Edit Role</h1>
          </div>
          <p className="text-text-secondary">
            Update role information and configure permissions.
          </p>
        </div>

        {/* Role Information Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Role Information</CardTitle>
            <CardDescription>
              Update the name, description, and template status for this role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Role Name <span className="text-status-error">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Nurse, Receptionist, Billing Specialist"
                  className={errors.name ? "border-status-error" : ""}
                  disabled={isSubmitting}
                  maxLength={100}
                />
                {errors.name && (
                  <p className="text-sm text-status-error">{errors.name}</p>
                )}
                <p className="text-xs text-text-secondary">
                  Choose a clear, descriptive name for this role (2-100 characters)
                </p>
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the responsibilities and purpose of this role..."
                  className={errors.description ? "border-status-error" : ""}
                  disabled={isSubmitting}
                  rows={4}
                  maxLength={500}
                />
                {errors.description && (
                  <p className="text-sm text-status-error">{errors.description}</p>
                )}
                <p className="text-xs text-text-secondary">
                  Optional. Provide a brief description of this role (max 500 characters)
                </p>
              </div>

              {/* Save as Template Checkbox */}
              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="isTemplate"
                  checked={isTemplate}
                  onCheckedChange={(checked) => setIsTemplate(checked === true)}
                  disabled={isSubmitting}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="isTemplate"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Save as Template
                  </Label>
                  <p className="text-xs text-text-secondary">
                    Templates can be reused when creating new roles. Useful for standard role configurations.
                  </p>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-4 border-t border-border-primary">
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
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Permissions Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Permissions</CardTitle>
                <CardDescription>
                  Configure what this role can access and modify. Use the permission editor to set granular access controls.
                </CardDescription>
              </div>
              {permissionsChanged && (
                <Button
                  onClick={handleSavePermissions}
                  disabled={isSavingPermissions}
                  className="flex items-center gap-2"
                >
                  {isSavingPermissions ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4" />
                      Save Permissions
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {permissionsChanged && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You have unsaved permission changes. Click &quot;Save Permissions&quot; to apply them.
                  </AlertDescription>
                </Alert>
              )}
              <PermissionEditor
                permissions={permissions}
                onChange={handlePermissionsChange}
                readOnly={false}
                tenantId={tenantId}
                hideHeader={true}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </ClinicLayout>
  );
}

