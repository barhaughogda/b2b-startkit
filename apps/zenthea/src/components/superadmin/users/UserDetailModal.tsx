"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  Mail,
  Shield,
  Building2,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface TenantInfo {
  id: string;
  name: string;
  type: string;
}

interface UserSummary {
  _id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: "admin" | "provider" | "demo" | "patient" | "super_admin";
  isActive: boolean;
  tenantId?: string;
  tenant?: TenantInfo | null;
  createdAt: number;
  updatedAt: number;
  lastLogin?: number;
}

interface UserDetailModalProps {
  user: UserSummary;
  open: boolean;
  onClose: () => void;
}

export function UserDetailModal({
  user,
  open,
  onClose,
}: UserDetailModalProps) {
  const [selectedRole, setSelectedRole] = useState<string>(user.role);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRoleChange = async () => {
    if (selectedRole === user.role) {
      return;
    }

    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/superadmin/users/${user._id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update user role");
      }

      setSuccess("User role updated successfully");
      // Refresh after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update user role"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin":
        return "default";
      case "admin":
        return "default";
      case "provider":
        return "secondary";
      case "patient":
        return "outline";
      case "demo":
        return "outline";
      default:
        return "secondary";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (timestamp?: number) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details
          </DialogTitle>
          <DialogDescription>
            View and manage user information and permissions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert className="border-status-error bg-status-error/10">
              <AlertCircle className="h-4 w-4 text-status-error" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-status-success bg-status-success/10">
              <CheckCircle2 className="h-4 w-4 text-status-success" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* User Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-text-secondary">Name</Label>
              <div className="flex items-center gap-2 p-2 bg-surface-elevated rounded-md">
                <User className="h-4 w-4 text-text-secondary" />
                <span>{user.name}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-text-secondary">Email</Label>
              <div className="flex items-center gap-2 p-2 bg-surface-elevated rounded-md">
                <Mail className="h-4 w-4 text-text-secondary" />
                <span>{user.email}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-text-secondary">Current Role</Label>
              <Badge variant={getRoleBadgeVariant(user.role)} className="w-full justify-center">
                {user.role === "super_admin" && (
                  <Shield className="h-3 w-3 mr-1" />
                )}
                {user.role.replace(/_/g, " ")}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-text-secondary">Status</Label>
              <Badge
                variant={user.isActive ? "default" : "secondary"}
                className="w-full justify-center"
              >
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-text-secondary">Tenant</Label>
              <div className="flex items-center gap-2 p-2 bg-surface-elevated rounded-md">
                <Building2 className="h-4 w-4 text-text-secondary" />
                <span>
                  {user.tenant ? user.tenant.name : "No tenant"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-text-secondary">Last Login</Label>
              <div className="flex items-center gap-2 p-2 bg-surface-elevated rounded-md">
                <Clock className="h-4 w-4 text-text-secondary" />
                <span>{formatDateTime(user.lastLogin)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-text-secondary">Created</Label>
              <div className="flex items-center gap-2 p-2 bg-surface-elevated rounded-md">
                <Calendar className="h-4 w-4 text-text-secondary" />
                <span>{formatDate(user.createdAt)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-text-secondary">User ID</Label>
              <div className="p-2 bg-surface-elevated rounded-md">
                <span className="text-xs font-mono text-text-secondary">
                  {user._id}
                </span>
              </div>
            </div>
          </div>

          {/* Role Management */}
          <div className="space-y-4 border-t border-border-primary pt-4">
            <div className="space-y-2">
              <Label htmlFor="role-select">Change Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Super Admin
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRole !== user.role && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleRoleChange}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Role"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedRole(user.role)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-border-primary pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

