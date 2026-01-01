'use client';

import React from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Check, X, Loader2, Building2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function PatientAccessManager() {
  const { data, error, isLoading, mutate } = useSWR('/api/patient/access', fetcher);

  const handleAction = async (organizationId: string, action: 'approve' | 'revoke') => {
    try {
      const res = await fetch('/api/patient/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, action })
      });

      if (!res.ok) throw new Error(`Failed to ${action} access`);

      toast.success(`Access ${action}d successfully`);
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-zenthea-teal" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-status-error/10 border border-status-error rounded-md text-status-error flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <p>Failed to load access permissions.</p>
      </div>
    );
  }

  const { active = [], pending = [] } = data || {};

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pending.length > 0 && (
        <Card className="border-status-warning/50 bg-status-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-text-primary">
              <Shield className="h-5 w-5 text-status-warning" />
              New Access Requests
            </CardTitle>
            <CardDescription>
              The following medical organizations have requested access to your records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pending.map((req: any) => (
              <div key={req.organizationId} className="flex items-center justify-between p-4 bg-white rounded-lg border border-border-primary shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-full">
                    <Building2 className="h-5 w-5 text-text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{req.organizationName}</p>
                    <p className="text-xs text-text-secondary">Requested on {new Date(req.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAction(req.organizationId, 'approve')} className="bg-status-success hover:bg-status-success/90">
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction(req.organizationId, 'revoke')} className="text-status-error border-status-error hover:bg-status-error/10">
                    <X className="h-4 w-4 mr-1" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-zenthea-teal" />
            Active Medical Teams
          </CardTitle>
          <CardDescription>
            These organizations currently have access to your health records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {active.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <Shield className="h-12 w-12 text-muted mx-auto mb-2 opacity-20" />
              <p className="text-text-secondary">No active medical team access.</p>
            </div>
          ) : (
            active.map((grant: any) => (
              <div key={grant.organizationId} className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg border border-border-primary">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-full border">
                    <Building2 className="h-5 w-5 text-zenthea-teal" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{grant.organizationName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="bg-status-success/10 text-status-success border-status-success/20 py-0 text-[10px]">Active</Badge>
                      <p className="text-[10px] text-text-tertiary">Granted {new Date(grant.approvedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleAction(grant.organizationId, 'revoke')} className="text-status-error border-status-error hover:bg-status-error/10 h-8">
                  Revoke Access
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
