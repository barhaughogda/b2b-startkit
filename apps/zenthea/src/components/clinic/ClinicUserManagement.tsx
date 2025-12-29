"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Trash2,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit,
  Mail,
  UserCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EditUserDialog } from "./EditUserDialog";

interface ClinicUser {
  _id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: "clinic_user" | "admin" | "provider" | "patient";
  isOwner?: boolean;
  isActive: boolean;
  clinics?: string[];
  customRoleId?: string;
  customRoleName?: string;
  customRoleDescription?: string;
  tenantId?: string;
  isInvited?: boolean;
}

interface CustomRole {
  _id: string;
  name: string;
  description?: string;
  tenantId: string;
}

interface UsersResponse {
  success: boolean;
  data: {
    users: ClinicUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: string;
  message?: string;
}

interface ClinicUserManagementProps {
  className?: string;
}

export function ClinicUserManagement({ className }: ClinicUserManagementProps) {
  const [users, setUsers] = useState<ClinicUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [invitationFilter, setInvitationFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState<number | null>(null);
  const [filteredTotalPages, setFilteredTotalPages] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ClinicUser | null>(null);
  const [roleNamesCache, setRoleNamesCache] = useState<Map<string, string>>(new Map());

  const limit = 10;
  
  // Fetch role name for a given role ID
  const fetchRoleName = useCallback(async (roleId: string): Promise<string | undefined> => {
    // Check cache first
    if (roleNamesCache.has(roleId)) {
      return roleNamesCache.get(roleId);
    }
    
    try {
      const response = await fetch(`/api/company/roles`);
      const data = await response.json();
      if (response.ok && data.success) {
        const roles = data.data || [];
        const role = roles.find((r: CustomRole) => r._id === roleId);
        if (role) {
          setRoleNamesCache(prev => new Map(prev).set(roleId, role.name));
          return role.name;
        }
      }
    } catch (err) {
      console.error(`Failed to fetch role name for ${roleId}:`, err);
    }
    return undefined;
  }, [roleNamesCache]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (ownerFilter !== "all") {
        params.append("isOwner", ownerFilter === "owner" ? "true" : "false");
      }
      // Note: invitationFilter is handled client-side after fetch

      const response = await fetch(`/api/company/users?${params.toString()}`);
      const data: UsersResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to fetch users");
      }

      let fetchedUsers = data.data.users;
      
      // Client-side fallback: Fetch role names for users missing customRoleName
      const usersNeedingRoles = fetchedUsers.filter(
        (u: ClinicUser) => u.customRoleId && !u.customRoleName && !u.isOwner
      );
      
      if (usersNeedingRoles.length > 0) {
        const roleNamePromises = usersNeedingRoles.map(async (user: ClinicUser) => {
          if (user.customRoleId) {
            const roleName = await fetchRoleName(user.customRoleId);
            if (roleName) {
              return { userId: user._id, roleName };
            }
          }
          return null;
        });
        
        const roleNames = await Promise.all(roleNamePromises);
        roleNames.forEach((result) => {
          if (result) {
            const user = fetchedUsers.find((u: ClinicUser) => u._id === result.userId);
            if (user) {
              user.customRoleName = result.roleName;
            }
          }
        });
        // Create a new array to trigger React re-render
        fetchedUsers = [...fetchedUsers];
      }
      
      // Apply invitation filter client-side
      if (invitationFilter !== "all") {
        const isInvited = invitationFilter === "invited";
        fetchedUsers = fetchedUsers.filter(
          (user: ClinicUser) => (user.isInvited ?? false) === isInvited
        );
        
        // When invitation filter is active, we need to estimate the filtered total
        // This is a limitation of client-side filtering - ideally this should be server-side
        // We estimate based on the current page's filter ratio, but handle edge cases
        let estimatedFilteredTotal: number;
        if (data.data.users.length === 0) {
          // No users on this page, can't estimate
          estimatedFilteredTotal = 0;
        } else {
          const filterRatio = fetchedUsers.length / data.data.users.length;
          estimatedFilteredTotal = Math.max(
            fetchedUsers.length, // At least the current page's filtered count
            Math.round(data.data.total * filterRatio)
          );
        }
        const estimatedFilteredTotalPages = Math.max(
          1,
          Math.ceil(estimatedFilteredTotal / limit)
        );
        
        setFilteredTotal(estimatedFilteredTotal);
        setFilteredTotalPages(estimatedFilteredTotalPages);
      } else {
        // Reset filtered totals when filter is "all"
        setFilteredTotal(null);
        setFilteredTotalPages(null);
      }
      
      setUsers(fetchedUsers);
      setTotalPages(data.data.totalPages);
      setTotal(data.data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, statusFilter, ownerFilter, invitationFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleOwnerFilterChange = (value: string) => {
    setOwnerFilter(value);
    setPage(1);
  };

  const handleInvitationFilterChange = (value: string) => {
    setInvitationFilter(value);
    setPage(1);
  };

  const handleEditUser = (user: ClinicUser) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to deactivate this user? This will prevent them from accessing the system."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/company/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || "Failed to deactivate user");
      }

      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate user");
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-status-error bg-status-error/10">
              <AlertCircle className="h-4 w-4 text-status-error" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 pt-5">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                  aria-label="Search users"
                />
              </div>
              <Select value={ownerFilter} onValueChange={handleOwnerFilterChange}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Filter by owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="owner">Owners</SelectItem>
                  <SelectItem value="non-owner">Non-Owners</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={invitationFilter}
                onValueChange={handleInvitationFilterChange}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
                {searchQuery || statusFilter !== "all" || ownerFilter !== "all" ? (
                  <p className="text-sm mt-2">
                    Try adjusting your filters or search query
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {users.map((user) => (
                    <Card key={user._id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-text-primary">
                                  {user.name}
                                </p>
                                {user.isOwner && (
                                  <Badge variant="default" className="bg-zenthea-teal text-white">
                                    Owner
                                  </Badge>
                                )}
                                {!user.isOwner && user.customRoleName && (
                                  <Badge variant="secondary" className="bg-surface-elevated text-text-primary border-border-primary">
                                    {user.customRoleName}
                                  </Badge>
                                )}
                                {!user.isOwner && !user.customRoleName && user.customRoleId && (
                                  <Badge variant="outline" className="text-text-secondary border-border-primary text-xs">
                                    Loading role...
                                  </Badge>
                                )}
                                {!user.isOwner && !user.customRoleName && !user.customRoleId && (
                                  <Badge variant="outline" className="text-text-tertiary border-border-primary text-xs opacity-50">
                                    No role
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-text-secondary">
                                {user.email}
                              </p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  user.isActive
                                    ? "bg-status-success-bg text-status-success"
                                    : "bg-status-error-bg text-status-error"
                                }`}
                              >
                                {user.isActive ? "Active" : "Inactive"}
                              </span>
                              {user.isInvited ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                  <Mail className="h-3 w-3 mr-1" />
                                  Invited
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Registered
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            aria-label={`Edit user ${user.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user._id)}
                            aria-label={`Deactivate user ${user.name}`}
                            disabled={user.isOwner}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {(filteredTotalPages !== null ? filteredTotalPages > 1 : totalPages > 1) && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-text-secondary">
                      Showing {((page - 1) * limit) + 1} to{" "}
                      {Math.min(page * limit, filteredTotal !== null ? filteredTotal : total)} of{" "}
                      {filteredTotal !== null ? filteredTotal : total} users
                      {filteredTotal !== null && (
                        <span className="text-text-tertiary ml-1">
                          (filtered from {total} total)
                        </span>
                      )}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="flex items-center px-4 text-sm text-text-secondary">
                        Page {page} of {filteredTotalPages !== null ? filteredTotalPages : totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage((p) => Math.min(
                            filteredTotalPages !== null ? filteredTotalPages : totalPages,
                            p + 1
                          ))
                        }
                        disabled={
                          page === (filteredTotalPages !== null ? filteredTotalPages : totalPages) ||
                          isLoading
                        }
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <EditUserDialog
        user={selectedUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}

