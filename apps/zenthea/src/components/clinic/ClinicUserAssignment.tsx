"use client";

import { useState, useMemo } from "react";
import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Users, Search } from "lucide-react";
import { toast } from "sonner";
import type { Clinic } from "@/types";
import { Id } from "@/convex/_generated/dataModel";

interface ClinicUserAssignmentProps {
  clinic: Clinic;
  onSave?: () => void;
  onCancel?: () => void;
}

interface UserWithClinics {
  _id: Id<"users">;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  clinics?: string[];
}

export function ClinicUserAssignment({
  clinic,
  onSave,
  onCancel,
}: ClinicUserAssignmentProps) {
  const { data: session } = useZentheaSession();
  const tenantId = session?.user?.tenantId;

  // Get all clinic users for the tenant
  const clinicUsers = useQuery(
    api.users.getClinicUsers,
    tenantId ? { tenantId } : "skip"
  ) as UserWithClinics[] | undefined;

  // Get all clinics for context
  const clinics = useQuery(
    (api as any).clinic?.clinics?.getClinics as any,
    tenantId && session?.user?.email ? { tenantId, userEmail: session.user.email } : "skip"
  ) as Clinic[] | undefined;

  // Actions
  const assignUserToClinic = useAction((api as any).clinic?.clinics?.assignUserToClinic as any);

  // State
  const [selectedUserIds, setSelectedUserIds] = useState<Set<Id<"users">>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Clinic ID as string (for comparison with user.clinics array)
  const clinicIdString = clinic._id as string;

  // Initialize selected users based on current assignments
  useMemo(() => {
    if (!clinicUsers) return;

    const currentlyAssigned = new Set<Id<"users">>();
    clinicUsers.forEach((user) => {
      const userClinics = user.clinics ?? [];
      if (userClinics.includes(clinicIdString)) {
        currentlyAssigned.add(user._id);
      }
    });
    setSelectedUserIds(currentlyAssigned);
  }, [clinicUsers, clinicIdString]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!clinicUsers) return [];

    const query = searchQuery.toLowerCase().trim();
    if (!query) return clinicUsers;

    return clinicUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [clinicUsers, searchQuery]);

  // Handle checkbox toggle
  const handleUserToggle = (userId: Id<"users">) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
    // Clear errors when user makes changes
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  // Handle select all / deselect all
  const handleSelectAll = () => {
    if (!filteredUsers) return;

    const allSelected = filteredUsers.every((user) =>
      selectedUserIds.has(user._id)
    );

    if (allSelected) {
      // Deselect all filtered users
      setSelectedUserIds((prev) => {
        const newSet = new Set(prev);
        filteredUsers.forEach((user) => newSet.delete(user._id));
        return newSet;
      });
    } else {
      // Select all filtered users
      setSelectedUserIds((prev) => {
        const newSet = new Set(prev);
        filteredUsers.forEach((user) => newSet.add(user._id));
        return newSet;
      });
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!clinicUsers) {
      setErrors(["Unable to load users. Please try again."]);
      return;
    }

    setIsSaving(true);
    setErrors([]);

    try {
      const results = {
        assigned: 0,
        removed: 0,
        errors: [] as string[],
      };

      // Process each user
      for (const user of clinicUsers) {
        const isCurrentlyAssigned =
          (user.clinics ?? []).includes(clinicIdString);
        const shouldBeAssigned = selectedUserIds.has(user._id);

        try {
          if (shouldBeAssigned && !isCurrentlyAssigned) {
            // Assign user to clinic
            await assignUserToClinic({
              tenantId: tenantId!,
              userEmail: session!.user!.email!,
              userId: user._id,
              clinicId: clinic._id as Id<"clinics">,
            });
            results.assigned++;
          } else if (!shouldBeAssigned && isCurrentlyAssigned) {
            // Note: Remove functionality would need to be implemented
            // For now, we'll skip removal and show a message
            results.errors.push(`Removal not yet implemented for ${user.email}`);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : `Failed to update assignment for ${user.email}`;
          results.errors.push(errorMessage);
        }
      }

      // Show results
      if (results.errors.length > 0) {
        setErrors(results.errors);
        toast.error("Some assignments failed", {
          description: `${results.errors.length} error(s) occurred. Check the error messages below.`,
        });
      } else {
        const totalChanges = results.assigned + results.removed;
        if (totalChanges > 0) {
          toast.success("Assignments updated", {
            description: `Assigned ${results.assigned} user(s) and removed ${results.removed} user(s).`,
          });
        } else {
          toast.info("No changes made", {
            description: "All users are already correctly assigned.",
          });
        }
        onSave?.();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save assignments";
      setErrors([errorMessage]);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Get clinic name helper
  const getClinicName = (clinicId: string): string => {
    if (!clinics) return clinicId;
    const clinic = clinics.find((c: Clinic) => (c._id as string) === clinicId);
    return clinic?.name || clinicId;
  };

  // Count selected users
  const selectedCount = selectedUserIds.size;
  const filteredCount = filteredUsers.length;
  const allFilteredSelected =
    filteredCount > 0 &&
    filteredUsers.every((user) => selectedUserIds.has(user._id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Users to Clinic</CardTitle>
        <CardDescription>
          Select users to assign to "{clinic.name}". Users can belong to
          multiple clinics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Errors */}
        {errors.length > 0 && (
          <Alert className="border-status-error bg-status-error/10">
            <AlertCircle className="h-4 w-4 text-status-error" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Users</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Selection Summary */}
        <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-text-tertiary" />
            <span className="text-sm text-text-secondary">
              {selectedCount} of {clinicUsers?.length || 0} user
              {clinicUsers?.length !== 1 ? "s" : ""} selected
              {searchQuery && ` (${filteredCount} shown)`}
            </span>
          </div>
          {filteredCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-8"
            >
              {allFilteredSelected ? "Deselect All" : "Select All"}
            </Button>
          )}
        </div>

        {/* User List */}
        <div className="border border-border-primary rounded-lg max-h-[400px] overflow-y-auto">
          {!clinicUsers ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
              <span className="ml-2 text-text-secondary">Loading users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Users className="h-8 w-8 text-text-tertiary mb-2" />
              <p className="text-text-secondary">
                {searchQuery
                  ? "No users found matching your search"
                  : "No clinic users found"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-primary">
              {filteredUsers.map((user) => {
                const isSelected = selectedUserIds.has(user._id);
                const userClinics = user.clinics ?? [];
                const otherClinics = userClinics.filter(
                  (clinicId) => clinicId !== clinicIdString
                );

                return (
                  <div
                    key={user._id}
                    className={`p-3 hover:bg-surface-elevated transition-colors ${
                      isSelected ? "bg-surface-elevated" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`user-${user._id}`}
                        checked={isSelected}
                        onCheckedChange={() => handleUserToggle(user._id)}
                        className="mt-1"
                        aria-label={`Select ${user.name}`}
                      />
                      <label
                        htmlFor={`user-${user._id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-text-primary">
                              {user.name}
                            </div>
                            <div className="text-sm text-text-secondary mt-0.5">
                              {user.email}
                            </div>
                            {otherClinics.length > 0 && (
                              <div className="text-xs text-text-tertiary mt-1">
                                Also in:{" "}
                                {otherClinics
                                  .map((clinicId) => getClinicName(clinicId))
                                  .join(", ")}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-status-success ml-2 flex-shrink-0" />
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border-primary">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !clinicUsers}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Assignments"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

