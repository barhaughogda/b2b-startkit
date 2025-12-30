"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { DataTable, type FilterOption } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isOwner } from "@/lib/auth-utils";
import type { Clinic } from "@/types";
import { Plus, Edit, Trash2, Users, UserPlus, ExternalLink, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { BackButton } from "@/components/ui/back-button";
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
import { ClinicForm } from "@/components/clinic/ClinicForm";
import { ClinicUserAssignment } from "@/components/clinic/ClinicUserAssignment";
import { OpeningHoursEditor } from "@/components/opening-hours/OpeningHoursEditor";
import { Id } from "@/convex/_generated/dataModel";

// Force dynamic rendering - requires session context
export const dynamic = 'force-dynamic';

interface ClinicWithUsage extends Clinic {
  usageCount: number;
}

export default function ClinicsListPage() {
  const { data: session, status } = useZentheaSession();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clinicToDelete, setClinicToDelete] = useState<ClinicWithUsage | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [clinicToEdit, setClinicToEdit] = useState<Clinic | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [clinicToAssign, setClinicToAssign] = useState<Clinic | null>(null);
  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [clinicForHours, setClinicForHours] = useState<Clinic | null>(null);

  // Get tenant ID from session
  const tenantId = session?.user?.tenantId;

  // Fetch clinics and usage counts
  // Note: If Convex function is not deployed, useQuery will return undefined
  // This can happen if Convex dev server hasn't synced due to TypeScript errors
  const clinics = useQuery(
    (api as any)["clinic/clinics"].getClinics,
    tenantId && session?.user?.email ? { tenantId, userEmail: session.user.email } : "skip"
  ) as Clinic[] | undefined;

  // Combine clinics with usage counts (getClinics already includes usageCount)
  const clinicsWithUsage: ClinicWithUsage[] = useMemo(() => {
    if (!clinics) return [];
    return clinics as ClinicWithUsage[];
  }, [clinics]);

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
          <p className="text-text-secondary">Access denied. Only clinic owners can manage clinics.</p>
        </div>
      </ClinicLayout>
    );
  }

  // Define filter options
  const filterOptions: FilterOption[] = [
    {
      key: 'isActive',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' },
      ],
    },
  ];

  // Define table columns
  const columns = [
    {
      key: "name" as const,
      label: "Clinic Name",
      sortable: true,
      render: (_value: any, clinic: ClinicWithUsage) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary">{clinic?.name ?? "Unknown"}</span>
        </div>
      ),
    },
    {
      key: "description" as const,
      label: "Description",
      sortable: false,
      render: (_value: any, clinic: ClinicWithUsage) => (
        <span className="text-text-secondary text-sm">
          {clinic?.description || "No description"}
        </span>
      ),
    },
    {
      key: "address" as const,
      label: "Address",
      sortable: false,
      render: (_value: any, clinic: ClinicWithUsage) => {
        if (!clinic?.address) {
          return <span className="text-text-tertiary text-sm">No address</span>;
        }
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.address)}`;
        return (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary text-sm hover:text-interactive-primary flex items-center gap-1.5 transition-colors"
            aria-label={`Open ${clinic.address} in Google Maps`}
          >
            <span>{clinic.address}</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        );
      },
    },
    {
      key: "isActive" as const,
      label: "Status",
      sortable: true,
      render: (_value: any, clinic: ClinicWithUsage) => (
        <Badge
          variant={clinic?.isActive ? "default" : "secondary"}
          className={clinic?.isActive ? "bg-status-success" : "bg-status-error"}
        >
          {clinic?.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "usageCount" as const,
      label: "Users",
      sortable: true,
      render: (_value: any, clinic: ClinicWithUsage) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-text-tertiary" />
          <span className="text-text-primary font-medium">{clinic?.usageCount ?? 0}</span>
        </div>
      ),
    },
    {
      key: "createdAt" as const,
      label: "Created",
      sortable: true,
      render: (_value: any, clinic: ClinicWithUsage) => (
        <span className="text-text-secondary text-sm">
          {clinic?.createdAt ? new Date(clinic.createdAt).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
    {
      key: "actions" as const,
      label: "Actions",
      sortable: false,
      render: (_value: any, clinic: ClinicWithUsage) => {
        if (!clinic) return null;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setClinicForHours(clinic);
                setHoursDialogOpen(true);
              }}
              className="h-8"
              title="Set opening hours for this clinic"
            >
              <Clock className="h-4 w-4 mr-1" />
              Hours
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setClinicToAssign(clinic);
                setAssignmentDialogOpen(true);
              }}
              className="h-8"
              title="Assign users to this clinic"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Assign Users
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setClinicToEdit(clinic);
                setFormDialogOpen(true);
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
                setClinicToDelete(clinic);
                setDeleteDialogOpen(true);
              }}
              disabled={!clinic || (clinic.usageCount ?? 0) > 0}
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
    if (!clinicToDelete) return;

    try {
      const response = await fetch(`/api/company/clinics/${clinicToDelete._id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400 && data.code === "CLINIC_IN_USE") {
          toast.error(
            data.message ||
              `Cannot delete clinic: ${clinicToDelete.usageCount} user(s) are currently assigned to this clinic`
          );
        } else if (response.status === 403) {
          toast.error("Only clinic owners can delete clinics");
        } else if (response.status === 404) {
          toast.error("Clinic not found");
        } else {
          toast.error(data.message || "Failed to delete clinic");
        }
        return;
      }

      toast.success("Clinic deleted successfully");
      setDeleteDialogOpen(false);
      setClinicToDelete(null);
      // Refresh will happen automatically via Convex query
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete clinic";
      toast.error(errorMessage);
    }
  };

  return (
    <ClinicLayout>
      <div className="max-w-7xl mx-auto p-6">
        <BackButton />
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Clinics</h1>
              <p className="text-text-secondary mt-1">
                Manage clinics and organize your clinic staff
              </p>
            </div>
            <Button
              onClick={() => {
                setClinicToEdit(null);
                setFormDialogOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Clinic
            </Button>
          </div>
        </div>

        {/* Clinics Table */}
        <Card>
          <CardContent>
            {clinicsWithUsage.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-secondary mb-4">No clinics have been created yet.</p>
                <Button
                  onClick={() => {
                    setClinicToEdit(null);
                    setFormDialogOpen(true);
                  }}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Clinic
                </Button>
              </div>
            ) : (
              <div className="pt-5">
                <DataTable
                  data={clinicsWithUsage}
                  columns={columns}
                  searchKeys={["name", "description"]}
                  filterOptions={filterOptions}
                  searchPlaceholder="Search clinics by name or description..."
                  entityLabel="clinics"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Clinic Dialog */}
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogContent 
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => {
              // Prevent dialog from closing when clicking on Google Maps autocomplete dropdown
              const target = e.target as HTMLElement;
              
              // Check if the click is on or inside the pac-container
              const pacContainer = document.querySelector('.pac-container');
              if (pacContainer) {
                // Check if target is inside pac-container
                if (pacContainer.contains(target)) {
                  e.preventDefault();
                  return;
                }
                
                // Also check the event path (composedPath) for better detection
                const path = e.composedPath?.() || [];
                const isClickingDropdown = path.some((node) => {
                  if (node instanceof HTMLElement) {
                    return node.classList?.contains('pac-container') || 
                           node.closest?.('.pac-container') !== null;
                  }
                  return false;
                });
                
                if (isClickingDropdown) {
                  e.preventDefault();
                  return;
                }
              }
              
              // Check if clicking on pac-item or pac-matched elements
              if (target.classList?.contains('pac-item') || 
                  target.classList?.contains('pac-matched') ||
                  target.closest?.('.pac-item') ||
                  target.closest?.('.pac-matched')) {
                e.preventDefault();
                return;
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {clinicToEdit ? "Edit Clinic" : "Create New Clinic"}
              </DialogTitle>
              <DialogDescription>
                {clinicToEdit
                  ? "Update clinic information and status"
                  : "Add a new clinic to organize your clinic staff"}
              </DialogDescription>
            </DialogHeader>
            <ClinicForm
              clinic={clinicToEdit || undefined}
              onSave={() => {
                setFormDialogOpen(false);
                setClinicToEdit(null);
                // Refresh will happen automatically via Convex query
              }}
              onCancel={() => {
                setFormDialogOpen(false);
                setClinicToEdit(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* User Assignment Dialog */}
        <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assign Users to Clinic</DialogTitle>
              <DialogDescription>
                {clinicToAssign && `Manage user assignments for ${clinicToAssign.name}`}
              </DialogDescription>
            </DialogHeader>
            {clinicToAssign && (
              <ClinicUserAssignment
                clinic={clinicToAssign}
                onSave={() => {
                  setAssignmentDialogOpen(false);
                  setClinicToAssign(null);
                  // Refresh will happen automatically via Convex query
                }}
                onCancel={() => {
                  setAssignmentDialogOpen(false);
                  setClinicToAssign(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Clinic</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the clinic &quot;{clinicToDelete?.name}&quot;? This action
                cannot be undone.
                {clinicToDelete && clinicToDelete.usageCount > 0 && (
                  <span className="block mt-2 text-status-error">
                    This clinic has {clinicToDelete.usageCount} user
                    {clinicToDelete.usageCount !== 1 ? "s" : ""} assigned. You must reassign these users
                    before deleting this clinic.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setClinicToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={clinicToDelete?.usageCount !== 0}
                className="bg-status-error hover:bg-status-error/90"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Opening Hours Dialog */}
        <Dialog open={hoursDialogOpen} onOpenChange={setHoursDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Opening Hours</DialogTitle>
              <DialogDescription>
                {clinicForHours && `Set opening hours for ${clinicForHours.name}. Leave empty to use company default hours.`}
              </DialogDescription>
            </DialogHeader>
            {clinicForHours && tenantId && (
              <OpeningHoursEditor
                tenantId={tenantId}
                clinicId={clinicForHours._id as Id<'clinics'>}
                userEmail={session?.user?.email || ''}
                title={`${clinicForHours.name} Opening Hours`}
                description="Set custom opening hours for this clinic. If not set, company default hours will be used."
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ClinicLayout>
  );
}

