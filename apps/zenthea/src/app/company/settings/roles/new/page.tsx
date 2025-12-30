"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isOwner } from "@/lib/auth-utils";
import { getDefaultPermissionTree } from "@/lib/permissions/validation";
import { Loader2, AlertCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/ui/back-button";

// Force dynamic rendering - requires session context
export const dynamic = 'force-dynamic';

export default function CreateRolePage() {
  const { data: session, status } = useZentheaSession();
  const router = useRouter();
  const createRole = useMutation((api as any).customRoles?.createCustomRole as any);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    description?: string;
  }>({});

  // Get tenant ID from session
  const tenantId = session?.user?.tenantId;

  // Check if user is owner
  const userIsOwner = session?.user ? isOwner(session.user) : false;

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

    if (!tenantId) {
      toast.error("Error", {
        description: "Tenant ID not found. Please sign in again.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create role with default (empty) permissions
      // Permissions will be configured in the edit page (Task 5.2.3)
      const roleId = await createRole({
        tenantId,
        name: name.trim(),
        description: description.trim() || undefined,
        permissions: getDefaultPermissionTree(),
        isTemplate,
      });

      toast.success("Role created successfully", {
        description: `Role "${name.trim()}" has been created. You can now configure permissions.`,
      });

      // Redirect to edit page to configure permissions
      router.push(`/company/settings/roles/${roleId}`);
    } catch (error) {
      console.error("Error creating role:", error);
      toast.error("Failed to create role", {
        description:
          error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Access denied. Only clinic owners can create custom roles.
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
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-interactive-primary" />
            <h1 className="text-3xl font-bold text-text-primary">Create New Role</h1>
          </div>
          <p className="text-text-secondary">
            Create a new custom role for your clinic. You&apos;ll configure permissions after creation.
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Role Information</CardTitle>
            <CardDescription>
              Provide a name and description for the new role. You can configure permissions on the next page.
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
                      Creating...
                    </>
                  ) : (
                    "Create Role"
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

