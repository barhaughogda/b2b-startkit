"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Filter, User, Clock, Globe, Monitor } from "lucide-react";
import { SupportAccessAuditEntry, SupportAccessAuditAction } from "@/types";

interface SupportAccessAuditTrailProps {
  auditTrail: SupportAccessAuditEntry[];
  requestId: string;
  className?: string;
}

/**
 * Helper component to fetch and display user information for a single user ID
 */
function UserInfoCell({ userId }: { userId: string }) {
  const user = useQuery(
    api.users.getUser,
    userId ? { id: userId as Id<"users"> } : "skip"
  );

  if (user === undefined) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin text-text-secondary" />
        <span className="text-text-secondary">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <User className="h-3 w-3 text-text-secondary" />
          <span className="font-medium text-text-primary">Unknown User</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <User className="h-3 w-3 text-text-secondary" />
        <span className="font-medium text-text-primary">
          {user.name || user.email || "Unknown User"}
        </span>
      </div>
      {user.email && (
        <span className="text-xs text-text-secondary ml-5">
          {user.email}
        </span>
      )}
    </div>
  );
}

/**
 * SupportAccessAuditTrail component displays the audit trail for a support access request.
 * 
 * Features:
 * - Displays all audit trail entries in chronological order (newest first)
 * - Filters entries by action type
 * - Shows user information (name, email) for each entry
 * - Formats timestamps in readable format
 * - Displays IP address and user agent when available
 * - Shows action details when present
 * 
 * @example
 * ```tsx
 * <SupportAccessAuditTrail 
 *   auditTrail={request.auditTrail}
 *   requestId={request._id}
 * />
 * ```
 */
export function SupportAccessAuditTrail({
  auditTrail,
  requestId,
  className = "",
}: SupportAccessAuditTrailProps) {
  const [actionFilter, setActionFilter] = useState<SupportAccessAuditAction | "all">("all");

  // Filter and sort audit trail entries
  const filteredEntries = useMemo(() => {
    return auditTrail
      .filter((entry) => actionFilter === "all" || entry.action === actionFilter)
      .sort((a, b) => b.timestamp - a.timestamp); // Newest first
  }, [auditTrail, actionFilter]);

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  // Get action badge
  const getActionBadge = (action: SupportAccessAuditAction) => {
    const variants: Record<SupportAccessAuditAction, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
      requested: {
        variant: "outline",
        className: "bg-blue-50 text-blue-800 border-blue-200",
      },
      approved: {
        variant: "outline",
        className: "bg-green-50 text-green-800 border-green-200",
      },
      denied: {
        variant: "outline",
        className: "bg-red-50 text-red-800 border-red-200",
      },
      accessed: {
        variant: "outline",
        className: "bg-purple-50 text-purple-800 border-purple-200",
      },
      expired: {
        variant: "outline",
        className: "bg-gray-50 text-gray-800 border-gray-200",
      },
      revoked: {
        variant: "outline",
        className: "bg-orange-50 text-orange-800 border-orange-200",
      },
    };

    const config = variants[action];
    return (
      <Badge variant={config.variant} className={config.className}>
        {action.charAt(0).toUpperCase() + action.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Audit Trail
            </CardTitle>
            <CardDescription>
              Complete history of actions performed on this support access request
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-text-secondary" />
            <Select value={actionFilter} onValueChange={(value) => setActionFilter(value as SupportAccessAuditAction | "all")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="requested">Requested</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="accessed">Accessed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            {actionFilter === "all" ? (
              <p>No audit trail entries found</p>
            ) : (
              <p>No entries found for action: {actionFilter}</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>User Agent</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry, index) => (
                  <TableRow key={`${entry.timestamp}-${index}`}>
                    <TableCell>{getActionBadge(entry.action)}</TableCell>
                    <TableCell>
                      <UserInfoCell userId={entry.userId} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-text-secondary" />
                        <span className="text-text-secondary">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.ipAddress ? (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3 w-3 text-text-secondary" />
                          <span className="text-text-secondary font-mono text-xs">
                            {entry.ipAddress}
                          </span>
                        </div>
                      ) : (
                        <span className="text-text-tertiary italic">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.userAgent ? (
                        <div className="flex items-center gap-2 max-w-xs">
                          <Monitor className="h-3 w-3 text-text-secondary" />
                          <span className="text-text-secondary text-xs truncate" title={entry.userAgent}>
                            {entry.userAgent}
                          </span>
                        </div>
                      ) : (
                        <span className="text-text-tertiary italic">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.details ? (
                        <div className="max-w-md">
                          <pre className="text-xs text-text-secondary bg-surface-elevated p-2 rounded border border-border-primary overflow-x-auto">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <span className="text-text-tertiary italic">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

