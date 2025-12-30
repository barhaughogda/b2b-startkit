"use client";

import { useState, useEffect, useCallback } from "react";
import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  Building2,
  User,
  FileText,
} from "lucide-react";
import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { SupportAccessRequest } from "@/types";

interface Tenant {
  _id: string;
  id: string;
  name: string;
  type: string;
  status: string;
}

interface UserSummary {
  _id: string;
  email: string;
  name: string;
  role: string;
  tenantId?: string;
}

export default function SupportAccessPage() {
  const { data: session, status: sessionStatus } = useZentheaSession();
  const router = useRouter();

  // Form state
  const [targetTenantId, setTargetTenantId] = useState<string>("");
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Data loading state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [requests, setRequests] = useState<SupportAccessRequest[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tenants
  const loadTenants = useCallback(async () => {
    setIsLoadingTenants(true);
    setError(null);

    try {
      const response = await fetch("/api/superadmin/tenants?limit=100");
      if (!response.ok) {
        throw new Error("Failed to load tenants");
      }

      const data = await response.json();
      if (data.success && data.data?.tenants) {
        setTenants(data.data.tenants);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tenants");
    } finally {
      setIsLoadingTenants(false);
    }
  }, []);

  // Load users for selected tenant
  const loadUsers = useCallback(async (tenantId: string) => {
    if (!tenantId) {
      setUsers([]);
      return;
    }

    setIsLoadingUsers(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/superadmin/users?tenantId=${tenantId}&limit=100`
      );
      if (!response.ok) {
        throw new Error("Failed to load users");
      }

      const data = await response.json();
      if (data.success && data.data?.users) {
        setUsers(data.data.users);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Load support access requests
  const loadRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    setError(null);

    try {
      const response = await fetch("/api/superadmin/support-access");
      if (!response.ok) {
        throw new Error("Failed to load support access requests");
      }

      const data = await response.json();
      if (data.success && data.data) {
        setRequests(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.role === "super_admin") {
      loadTenants();
      loadRequests();
    }
  }, [sessionStatus, session, loadTenants, loadRequests]);

  // Load users when tenant changes
  useEffect(() => {
    if (targetTenantId) {
      loadUsers(targetTenantId);
      // Reset user selection when tenant changes
      setTargetUserId("");
    } else {
      setUsers([]);
      setTargetUserId("");
    }
  }, [targetTenantId, loadUsers]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const response = await fetch("/api/superadmin/support-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetTenantId,
          targetUserId: targetUserId || undefined,
          purpose: purpose.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to create request");
      }

      // Success
      setSubmitSuccess(true);
      setPurpose("");
      setTargetTenantId("");
      setTargetUserId("");

      // Reload requests
      await loadRequests();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "denied":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Denied
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-200">
            <Clock className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Check if user is superadmin
  if (sessionStatus === "loading") {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
        </div>
      </SuperAdminLayout>
    );
  }

  if (sessionStatus === "unauthenticated" || session?.user?.role !== "super_admin") {
    router.push("/");
    return null;
  }

  return (
    <SuperAdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Support Access Requests
          </h1>
          <p className="text-text-secondary">
            Request access to user or tenant data for support purposes
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {submitSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-800" />
            <AlertDescription className="text-green-800">
              Support access request created successfully. The user will be notified to approve your request.
            </AlertDescription>
          </Alert>
        )}

        {/* Request Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Create Support Access Request
            </CardTitle>
            <CardDescription>
              Request access to a tenant or specific user account for support purposes.
              The user will need to approve your request before you can access their data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tenant Selector */}
              <div className="space-y-2">
                <Label htmlFor="tenant" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Tenant <span className="text-status-error">*</span>
                </Label>
                <Select
                  value={targetTenantId}
                  onValueChange={setTargetTenantId}
                  disabled={isLoadingTenants || isSubmitting}
                  required
                >
                  <SelectTrigger id="tenant">
                    <SelectValue placeholder="Select a tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingTenants ? (
                      <SelectItem value="loading" disabled>
                        Loading tenants...
                      </SelectItem>
                    ) : tenants.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No tenants found
                      </SelectItem>
                    ) : (
                      tenants.map((tenant) => (
                        <SelectItem key={tenant._id} value={tenant.id}>
                          {tenant.name} ({tenant.id})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* User Selector (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="user" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  User (Optional)
                </Label>
                <Select
                  value={targetUserId}
                  onValueChange={setTargetUserId}
                  disabled={!targetTenantId || isLoadingUsers || isSubmitting}
                >
                  <SelectTrigger id="user">
                    <SelectValue placeholder="Select a user (optional - leave blank for tenant-level access)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tenant-level access (all users)</SelectItem>
                    {isLoadingUsers ? (
                      <SelectItem value="loading" disabled>
                        Loading users...
                      </SelectItem>
                    ) : users.length === 0 && targetTenantId ? (
                      <SelectItem value="none" disabled>
                        No users found for this tenant
                      </SelectItem>
                    ) : (
                      users.map((user) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-sm text-text-secondary">
                  Leave blank to request access to all users in the tenant, or select a specific user account.
                </p>
              </div>

              {/* Purpose Field */}
              <div className="space-y-2">
                <Label htmlFor="purpose" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Purpose <span className="text-status-error">*</span>
                </Label>
                <Textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Describe the reason for requesting access (e.g., troubleshooting login issues, investigating data sync problems, etc.)"
                  required
                  disabled={isSubmitting}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-sm text-text-secondary">
                  Provide a clear explanation of why you need access. This will be shown to the user when they review your request.
                </p>
              </div>

              {/* Submit Error */}
              {submitError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-2">
                <Button
                  type="submit"
                  disabled={!targetTenantId || !purpose.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Request...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Create Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Existing Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>
              View the status of your support access requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                No support access requests found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request._id}>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="font-medium">
                          {request.targetTenantId}
                        </TableCell>
                        <TableCell>
                          {request.targetUserId ? (
                            <span className="text-text-secondary">
                              {request.targetUserId}
                            </span>
                          ) : (
                            <span className="text-text-tertiary italic">
                              All users
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {request.purpose}
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {formatDate(request.createdAt)}
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {request.expirationTimestamp
                            ? formatDate(request.expirationTimestamp)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}

