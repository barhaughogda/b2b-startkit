"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Search,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Shield,
  UserCheck,
  Mail,
  Building2,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { UserDetailModal } from "./UserDetailModal";

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

interface UserListResponse {
  users: UserSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function UserList() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Debounce search input
  const debouncedSearch = useDebounce(search, 500);

  // Load users
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });

      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }
      if (roleFilter !== "all") {
        params.append("role", roleFilter);
      }
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (tenantFilter !== "all") {
        params.append("tenantId", tenantFilter);
      }

      const response = await fetch(`/api/superadmin/users?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load users");
      }

      const data = await response.json();
      if (data.success && data.data) {
        const result: UserListResponse = data.data;
        setUsers(result.users);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load users"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, roleFilter, statusFilter, tenantFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter, tenantFilter, sortBy, sortOrder]);

  const handleUserClick = (user: UserSummary) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedUser(null);
    // Refresh users list after modal closes (in case role was updated)
    loadUsers();
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

  const getStatusBadgeVariant = (isActive: boolean) => {
    return isActive ? "default" : "secondary";
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (timestamp?: number) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading && users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage all users across all tenants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid="user-list">
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage all users across all tenants ({total} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="space-y-4 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                placeholder="Search by name, email, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role-filter">Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger id="role-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="provider">Provider</SelectItem>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant-filter">Tenant</Label>
                <Select value={tenantFilter} onValueChange={setTenantFilter} disabled>
                  <SelectTrigger id="tenant-filter">
                    <SelectValue placeholder="Coming soon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tenants</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-text-tertiary">
                  Tenant filtering coming soon. Use search to filter by tenant ID.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort-by">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger id="sort-by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="lastLogin">Last Login</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-2">
              <Button
                variant={sortOrder === "asc" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortOrder("asc")}
              >
                Ascending
              </Button>
              <Button
                variant={sortOrder === "desc" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortOrder("desc")}
              >
                Descending
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-4 border-status-error bg-status-error/10">
              <AlertCircle className="h-4 w-4 text-status-error" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
            </div>
          )}

          {/* User Table */}
          {!isLoading && users.length === 0 && (
            <div className="text-center py-12 text-text-secondary">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found</p>
              {debouncedSearch && (
                <p className="text-sm mt-2">
                  Try adjusting your search or filters
                </p>
              )}
            </div>
          )}

          {/* User Table */}
          {!isLoading && users.length > 0 && (
            <>
              <div className="rounded-md border border-border-primary">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow
                        key={user._id}
                        className="cursor-pointer hover:bg-surface-elevated"
                        onClick={() => handleUserClick(user)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-text-secondary" />
                            {user.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-text-secondary" />
                            {user.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role === "super_admin" && (
                              <Shield className="h-3 w-3 mr-1" />
                            )}
                            {user.role === "admin" && (
                              <UserCheck className="h-3 w-3 mr-1" />
                            )}
                            {user.role.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.tenant ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-text-secondary" />
                              <span>{user.tenant.name}</span>
                            </div>
                          ) : (
                            <span className="text-text-tertiary">No tenant</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(user.isActive)}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">
                          {formatDateTime(user.lastLogin)}
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">
                          {formatDate(user.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-text-secondary">
                    Showing {(page - 1) * limit + 1} to{" "}
                    {Math.min(page * limit, total)} of {total} users
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="text-sm text-text-secondary">
                      Page {page} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          open={isDetailModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

