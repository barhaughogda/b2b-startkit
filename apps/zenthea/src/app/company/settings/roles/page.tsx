"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { isOwner } from "@/lib/auth-utils";
import type { CustomRole } from "@/types";
import { Plus, Edit, Trash2, Users, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/components/ui/back-button";

// Force dynamic rendering - requires session context
export const dynamic = 'force-dynamic';

interface RoleWithUsage extends CustomRole {
  usageCount: number;
}

export default function RolesListPage() {
  const { data: session, status } = useZentheaSession();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleWithUsage | null>(null);

  // Get tenant ID from session
  const tenantId = session?.user?.tenantId;

  // Fetch roles and usage counts
  const roles = useQuery(
    (api as any).customRoles?.getCustomRolesByTenant as any,
    tenantId ? { tenantId } : "skip"
  ) as CustomRole[] | undefined;

  const usageCounts = useQuery(
    (api as any).customRoles?.getRoleUsageCounts as any,
    tenantId ? { tenantId } : "skip"
  ) as Record<string, number> | undefined;

  // Combine roles with usage counts
  const rolesWithUsage: RoleWithUsage[] = useMemo(() => {
    if (!roles || !usageCounts) return [];
    
    return roles.map((role: CustomRole) => ({
      ...role,
      usageCount: usageCounts[role._id] || 0,
    }));
  }, [roles, usageCounts]);

  // Check if user is owner
  const userIsOwner = useMemo(() => {
    if (!session?.user) return false;
    return isOwner(session.user);
  }, [session]);

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
          <p className="text-text-secondary">Access denied. Only clinic owners can manage roles.</p>
        </div>
      </ClinicLayout>
    );
  }

  // Define table columns
  const columns = [
    {
      key: "name" as const,
      label: "Role Name",
      sortable: true,
      render: (_value: any, role: RoleWithUsage) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary">{role?.name ?? "Unknown"}</span>
          {role?.isTemplate && (
            <Badge variant="secondary" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Template
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "description" as const,
      label: "Description",
      sortable: false,
      render: (_value: any, role: RoleWithUsage) => (
        <span className="text-text-secondary text-sm">
          {role?.description || "No description"}
        </span>
      ),
    },
    {
      key: "usageCount" as const,
      label: "Users",
      sortable: true,
      render: (_value: any, role: RoleWithUsage) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-text-tertiary" />
          <span className="text-text-primary font-medium">{role?.usageCount ?? 0}</span>
        </div>
      ),
    },
    {
      key: "createdAt" as const,
      label: "Created",
      sortable: true,
      render: (_value: any, role: RoleWithUsage) => (
        <span className="text-text-secondary text-sm">
          {role?.createdAt ? new Date(role.createdAt).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
    {
      key: "actions" as const,
      label: "Actions",
      sortable: false,
      render: (_value: any, role: RoleWithUsage) => {
        if (!role) return null;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/company/settings/roles/${role._id}`);
              }}
              className="h-8"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setRoleToDelete(role);
                setDeleteDialogOpen(true);
              }}
              disabled={!role || (role.usageCount ?? 0) > 0}
              className="h-8 text-status-error hover:text-status-error"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!roleToDelete) return;

    // TODO: Implement delete mutation in Task 6.1.3
    // For now, show a toast message
    toast.error("Delete functionality will be implemented in Task 6.1.3");
    setDeleteDialogOpen(false);
    setRoleToDelete(null);
  };

  return (
    <ClinicLayout>
      <div className="max-w-7xl mx-auto p-6">
        <BackButton />
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Custom Roles</h1>
              <p className="text-text-secondary mt-1">
                Manage custom roles and permissions for your clinic
              </p>
            </div>
            <Button
              onClick={() => router.push("/company/settings/roles/new")}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Role
            </Button>
          </div>
        </div>

        {/* Roles Table */}
        <Card>
          <CardContent>
            {rolesWithUsage.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-secondary mb-4">No custom roles have been created yet.</p>
                <Button
                  onClick={() => router.push("/company/settings/roles/new")}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Role
                </Button>
              </div>
            ) : (
              <div className="mt-5">
                <DataTable
                  data={rolesWithUsage}
                  columns={columns}
                  searchKeys={["name", "description"]}
                  searchPlaceholder="Search roles by name or description..."
                  entityLabel="roles"
                  onRowClick={(role) => router.push(`/company/settings/roles/${role._id}`)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Role</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the role &quot;{roleToDelete?.name}&quot;? This action
                cannot be undone.
                {roleToDelete && roleToDelete.usageCount > 0 && (
                  <span className="block mt-2 text-status-error">
                    This role is assigned to {roleToDelete.usageCount} user
                    {roleToDelete.usageCount !== 1 ? "s" : ""}. You must reassign these users
                    before deleting this role.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setRoleToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={roleToDelete?.usageCount !== 0}
                className="bg-status-error hover:bg-status-error/90"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClinicLayout>
  );
}

