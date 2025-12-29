"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Building2,
  Users,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface TenantSummary {
  id: string;
  name: string;
  type: string;
  status: "active" | "inactive" | "suspended" | "trial";
  subscription: {
    plan: "demo" | "basic" | "premium" | "enterprise";
    status: "active" | "cancelled" | "expired";
    maxUsers: number;
    maxPatients: number;
  };
  userCount: number;
  patientCount: number;
  createdAt: number;
  updatedAt: number;
  configCompleteness?: number;
}

interface TenantListResponse {
  tenants: TenantSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function TenantList() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Debounce search input
  const debouncedSearch = useDebounce(search, 500);

  // Load tenants
  const loadTenants = useCallback(async () => {
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
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (planFilter !== "all") {
        params.append("plan", planFilter);
      }
      if (typeFilter !== "all") {
        params.append("type", typeFilter);
      }

      const response = await fetch(`/api/superadmin/tenants?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load tenants");
      }

      const data = await response.json();
      if (data.success && data.data) {
        const result: TenantListResponse = data.data;
        setTenants(result.tenants);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load tenants"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, planFilter, typeFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, planFilter, typeFilter, sortBy, sortOrder]);

  const handleTenantClick = (tenantId: string) => {
    router.push(`/superadmin/tenants/${tenantId}`);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "suspended":
        return "destructive";
      case "trial":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case "enterprise":
        return "default";
      case "premium":
        return "default";
      case "basic":
        return "secondary";
      case "demo":
        return "outline";
      default:
        return "secondary";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCompletenessBadge = (completeness?: number) => {
    if (!completeness) return null;
    if (completeness >= 80) return "default";
    if (completeness >= 50) return "secondary";
    return "destructive";
  };

  const getCompletenessIcon = (completeness?: number) => {
    if (!completeness) return null;
    if (completeness >= 80) {
      return <CheckCircle2 className="h-3 w-3 text-status-success" />;
    }
    if (completeness >= 50) {
      return <AlertTriangle className="h-3 w-3 text-status-warning" />;
    }
    return <AlertCircle className="h-3 w-3 text-status-error" />;
  };

  if (isLoading && tenants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
          <CardDescription>Manage all tenants in the system</CardDescription>
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
    <Card data-testid="tenant-list">
      <CardHeader>
        <CardTitle>Tenants</CardTitle>
        <CardDescription>
          Manage all tenants in the system ({total} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              placeholder="Search by name, tenant ID, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-filter">Plan</Label>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger id="plan-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type-filter">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="practice">Practice</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort-by">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
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

        {/* Tenant Table */}
        {!isLoading && tenants.length === 0 && (
          <div className="text-center py-12 text-text-secondary">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tenants found</p>
            {debouncedSearch || statusFilter !== "all" || planFilter !== "all" || typeFilter !== "all" ? (
              <p className="text-sm mt-2">Try adjusting your filters</p>
            ) : null}
          </div>
        )}

        {!isLoading && tenants.length > 0 && (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Config</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Patients</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow
                      key={tenant.id}
                      data-testid={`tenant-row-${tenant.id}`}
                      className="cursor-pointer hover:bg-surface-interactive"
                      onClick={() => handleTenantClick(tenant.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-text-secondary" />
                          {tenant.name}
                        </div>
                        <div className="text-sm text-text-secondary mt-1">
                          {tenant.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{tenant.type}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(tenant.status)}>
                          {tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPlanBadgeVariant(tenant.subscription.plan)}>
                          {tenant.subscription.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tenant.configCompleteness !== undefined ? (
                          <div className="flex items-center gap-2">
                            {getCompletenessIcon(tenant.configCompleteness)}
                            <Badge variant={getCompletenessBadge(tenant.configCompleteness) || "secondary"}>
                              {tenant.configCompleteness}%
                            </Badge>
                            {tenant.configCompleteness < 80 && (
                              <Badge variant="outline" className="text-xs">
                                Needs Setup
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-text-secondary">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-text-secondary" />
                          {tenant.userCount} / {tenant.subscription.maxUsers}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <UserCheck className="h-4 w-4 text-text-secondary" />
                          {tenant.patientCount} / {tenant.subscription.maxPatients}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-text-secondary">
                          {formatDate(tenant.createdAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4" data-testid="pagination">
              <div className="text-sm text-text-secondary">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} tenants
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

