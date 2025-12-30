'use client';

import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Id } from '@/convex/_generated/dataModel';

export function AppointmentsDebugInfo() {
  const { data: session, status: sessionStatus } = useZentheaSession();
  const userEmail = session?.user?.email;
  const tenantId = session?.user?.tenantId || 'demo-tenant';
  const userRole = session?.user?.role;
  const userId = session?.user?.id;

  // Check if patient exists
  const patient = useQuery(
    api.patients.getPatientByEmail,
    userEmail && tenantId
      ? { email: userEmail, tenantId }
      : 'skip'
  );

  // Get patient appointments if patient exists
  const appointments = useQuery(
    api.appointments.getPatientAppointments,
    patient?._id && tenantId
      ? {
          patientId: patient._id as Id<'patients'>,
          tenantId,
        }
      : 'skip'
  );

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const copyCommand = () => {
    navigator.clipboard.writeText('npx ts-node scripts/seed-demo-users.ts');
  };

  const getStatusIcon = (status: 'loading' | 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'loading':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
    }
  };

  // Determine statuses
  const sessionLoading = sessionStatus === 'loading';
  const patientLoading = patient === undefined;
  const appointmentsLoading = appointments === undefined && patient?._id;
  
  const hasPatient = patient !== null && patient !== undefined;
  const hasAppointments = Array.isArray(appointments) && appointments.length > 0;

  return (
    <Card className="border-status-warning bg-status-warning-bg/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-status-warning flex items-center gap-2">
          🔍 Debug Information (Development Only)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs font-mono">
        {/* Session Status */}
        <div className="space-y-1">
          <div className="font-semibold text-text-primary">Session Status:</div>
          <div className="ml-4 space-y-0.5">
            <div>{getStatusIcon(sessionLoading ? 'loading' : session ? 'success' : 'error')} Status: {sessionStatus}</div>
            <div>{session?.user?.email ? '✅' : '❌'} Email: {userEmail || 'NOT SET'}</div>
            <div>{session?.user?.tenantId ? '✅' : '⚠️'} Tenant ID: {tenantId} {!session?.user?.tenantId && '(defaulting to demo-tenant)'}</div>
            <div>{userRole ? '✅' : '❌'} Role: {userRole || 'NOT SET'}</div>
            <div>{userId ? '✅' : '❌'} User ID: {userId || 'NOT SET'}</div>
          </div>
        </div>

        {/* Patient Lookup */}
        <div className="space-y-1 border-t border-border-primary pt-2">
          <div className="font-semibold text-text-primary">Patient Lookup:</div>
          <div className="ml-4 space-y-0.5">
            {patientLoading && <div>⏳ Loading patient record...</div>}
            {patient === null && (
              <div className="text-status-error">
                ❌ NO PATIENT RECORD FOUND for {userEmail}
              </div>
            )}
            {hasPatient && (
              <>
                <div>✅ Patient found: {patient._id}</div>
                <div>   Name: {patient.firstName} {patient.lastName}</div>
                <div>   Email: {patient.email}</div>
              </>
            )}
          </div>
        </div>

        {/* Appointments Query */}
        <div className="space-y-1 border-t border-border-primary pt-2">
          <div className="font-semibold text-text-primary">Appointments Query:</div>
          <div className="ml-4 space-y-0.5">
            {!hasPatient && <div>⏸️ Skipped (no patient found)</div>}
            {appointmentsLoading && <div>⏳ Loading appointments...</div>}
            {hasPatient && appointments !== undefined && (
              <>
                <div>✅ Query executed</div>
                <div>📅 Count: {appointments?.length || 0}</div>
              </>
            )}
          </div>
        </div>

        {/* Issue & Solution */}
        {patient === null && (
          <div className="border-t border-border-primary pt-3 mt-3 space-y-2">
            <div className="font-semibold text-status-error">🚨 Issue Identified:</div>
            <div className="text-status-error ml-4">
              The logged-in user&apos;s email <span className="bg-status-error/20 px-1 rounded">{userEmail}</span> does not have a corresponding patient record in the Convex database.
            </div>
            
            <div className="font-semibold text-status-success mt-3">💡 Solution:</div>
            <div className="ml-4 space-y-2">
              <div>Run the seed script to create demo data:</div>
              <div className="bg-background-elevated p-2 rounded flex items-center justify-between">
                <code className="text-zenthea-teal">npx ts-node scripts/seed-demo-users.ts</code>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyCommand}
                  className="ml-2 text-xs"
                >
                  Copy
                </Button>
              </div>
              <div className="text-text-secondary">
                Or run verification first: <code className="bg-background-elevated px-1 rounded">npx ts-node scripts/verify-demo-data.ts</code>
              </div>
            </div>
          </div>
        )}

        {/* Quick Reference */}
        <div className="border-t border-border-primary pt-3 mt-3">
          <div className="font-semibold text-text-primary mb-1">📚 Demo Accounts:</div>
          <div className="ml-4 text-text-secondary space-y-0.5">
            <div>• owner@demo.com / demo123 (Clinic Owner)</div>
            <div>• admin@demo.com / demo123 (Clinic Admin)</div>
            <div>• provider@demo.com / demo123 (Provider/Doctor)</div>
            <div>• patient@demo.com / demo123 (Patient) ← For this page</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
