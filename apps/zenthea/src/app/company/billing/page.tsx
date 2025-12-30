'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ClinicLayout } from '@/components/layout/ClinicLayout';
import { BillingKPICards } from '@/components/billing/BillingKPICards';
import { ClinicClaimCard } from '@/components/billing/ClinicClaimCard';
import { ClinicBillingFilters, type ClinicBillingFiltersState } from '@/components/billing/ClinicBillingFilters';
import { DeniedClaimsAlert } from '@/components/billing/DeniedClaimsAlert';
import { BillingKPICardsSkeleton } from '@/components/billing/BillingSkeletons';
import { ErrorState, ClaimsEmptyState } from '@/components/billing/BillingStates';
import { ClaimDetailsDrawer } from '@/components/billing/ClaimDetailsDrawer';
import { RevenueChart, type MonthlyRevenueData } from '@/components/billing/RevenueChart';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileCheck, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/back-button';
import { formatCurrency } from '@/lib/billing/formatting';
import type { RCMMetrics, InsuranceClaim, ClaimStatus } from '@/types/billing';
import type { Id } from '@/convex/_generated/dataModel';

/**
 * Constants
 */
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

/**
 * Clinic Billing Page - RCM Dashboard
 * 
 * Task 3.1: Replace Clinic Billing Page Scaffold ✅
 * Task 3.2: Use BillingKPICards Component ✅
 * Task 3.3: Use ClaimsTable Component ✅
 * Task 3.4: Add Clinic-Level Filters Panel ✅
 * Task 3.5: Implement "Action Center - Denials" Panel ✅
 * 
 * Features:
 * - RCM metrics display with KPI cards
 * - Filterable and sortable claims table
 * - Clinic-level filters (date range, providers, payers, status)
 * - Real-time data updates via Convex
 */
export default function BillingPage() {
  const { data: session, status: sessionStatus } = useZentheaSession();

  // Filter state (Task 3.4)
  const [filters, setFilters] = useState<ClinicBillingFiltersState>({
    dateFrom: undefined,
    dateTo: undefined,
    providerIds: [],
    payerIds: [],
    patientIds: [],
    statuses: [],
  });

  // Claim details drawer state
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Appeal dialog state
  const [appealDialogOpen, setAppealDialogOpen] = useState(false);
  const [selectedClaimForAppeal, setSelectedClaimForAppeal] = useState<InsuranceClaim | null>(null);
  const [isAppealing, setIsAppealing] = useState(false);
  
  // Track when filters change to scroll to table after data loads
  const [shouldScrollToTable, setShouldScrollToTable] = useState(false);

  // Extract and memoize session data
  const { userEmail, tenantId, canQuery } = useMemo(() => {
    const email = session?.user?.email;
    const tenant = session?.user?.tenantId;
    const canExecuteQuery = sessionStatus === 'authenticated' && email && tenant;
    
    return {
      userEmail: email,
      tenantId: tenant,
      canQuery: canExecuteQuery,
    };
  }, [session, sessionStatus]);

  // Memoize query arguments to prevent unnecessary re-renders
  const rcmQueryArgs = useMemo(
    () => (canQuery ? { tenantId: tenantId!, userEmail: userEmail! } : 'skip'),
    [canQuery, tenantId, userEmail]
  );

  // Build claims query args with filters
  // Backend now supports arrays for multiple selections
  const claimsQueryArgs = useMemo(
    () =>
      canQuery
        ? {
            tenantId: tenantId!,
            userEmail: userEmail!,
            page: DEFAULT_PAGE,
            pageSize: DEFAULT_PAGE_SIZE,
            // Backend supports arrays for multiple selections
            // Create new array references to ensure React detects changes
            status: filters.statuses.length > 0 ? [...filters.statuses] : undefined,
            payerId: filters.payerIds.length > 0 ? [...(filters.payerIds as Id<'insurancePayers'>[])] : undefined,
            providerId: filters.providerIds.length > 0 ? [...(filters.providerIds as Id<'providers'>[])] : undefined,
            patientId: filters.patientIds.length > 0 ? [...(filters.patientIds as Id<'patients'>[])] : undefined,
            startDate: filters.dateFrom ? filters.dateFrom.getTime() : undefined,
            endDate: filters.dateTo ? filters.dateTo.getTime() : undefined,
          }
        : 'skip',
    [canQuery, tenantId, userEmail, filters.statuses, filters.payerIds, filters.providerIds, filters.patientIds, filters.dateFrom, filters.dateTo]
  );

  // Query RCM metrics
  const rcmMetrics = useQuery(
    (api as any).billing?.getClinicRCM,
    rcmQueryArgs
  ) as RCMMetrics | undefined;

  // Query monthly revenue data for chart
  const monthlyRevenueQueryArgs = useMemo(
    () =>
      canQuery
        ? {
            tenantId: tenantId!,
            userEmail: userEmail!,
            startDate: filters.dateFrom ? filters.dateFrom.getTime() : undefined,
            endDate: filters.dateTo ? filters.dateTo.getTime() : undefined,
          }
        : 'skip',
    [canQuery, tenantId, userEmail, filters.dateFrom, filters.dateTo]
  );

  const monthlyRevenueData = useQuery(
    (api as any).billing?.getClinicMonthlyRevenue,
    monthlyRevenueQueryArgs
  ) as MonthlyRevenueData[] | undefined;

  // Query claims list
  const claimsListResponse = useQuery(
    (api as any).billing?.getClinicClaimsList,
    claimsQueryArgs
  ) as
    | {
        claims: Array<{
          _id: Id<'insuranceClaims'>;
          claimId: string;
          patientId: Id<'patients'>;
          providerId: Id<'providers'>;
          payerId: Id<'insurancePayers'>;
          status: ClaimStatus;
          totalCharges: number;
          createdAt: number;
          claimControlNumber?: string;
        }>;
        pagination: {
          page: number;
          pageSize: number;
          totalCount: number;
          totalPages: number;
        };
      }
    | undefined;

  // Query providers for filter dropdown
  const providers = useQuery(
    (api as any).providers?.getProvidersByTenant,
    canQuery ? { tenantId: tenantId!, limit: 100 } : 'skip'
  ) as Array<{ _id: Id<'providers'>; firstName: string; lastName: string }> | undefined;

  // Extract unique patient IDs from claims for efficient batch fetching
  const uniquePatientIds = useMemo(() => {
    if (!claimsListResponse?.claims) return [];
    const patientIdSet = new Set<Id<'patients'>>();
    claimsListResponse.claims.forEach((claim) => {
      patientIdSet.add(claim.patientId);
    });
    return Array.from(patientIdSet);
  }, [claimsListResponse]);

  // Query patients by IDs for name mapping (more efficient than fetching all patients)
  const patientsForMapping = useQuery(
    (api as any).patients?.getPatientsByIds,
    canQuery && uniquePatientIds.length > 0
      ? { patientIds: uniquePatientIds, tenantId: tenantId! }
      : 'skip'
  ) as Array<{ _id: Id<'patients'>; firstName: string; lastName: string }> | undefined;

  // Query all patients for filter dropdown
  const allPatientsResponse = useQuery(
    (api as any).patients?.getPatientsByTenant,
    canQuery ? { tenantId: tenantId!, limit: 1000 } : 'skip'
  ) as { page: Array<{ _id: Id<'patients'>; firstName: string; lastName: string }> } | undefined;
  
  const allPatients = allPatientsResponse?.page;

  // Query insurance payers for filter dropdown and name mapping
  const insurancePayers = useQuery(
    (api as any).billing?.getInsurancePayers,
    canQuery ? { tenantId: tenantId! } : 'skip'
  ) as Array<{ _id: Id<'insurancePayers'>; payerId: string; name: string }> | undefined;

  // Build payers list for filters (use actual payer data)
  const payers = useMemo(() => {
    if (!insurancePayers) return [];
    return insurancePayers.map((payer) => ({
      id: payer._id,
      name: payer.name,
    }));
  }, [insurancePayers]);

  // Get unique statuses from claims
  const availableStatuses = useMemo(() => {
    if (!claimsListResponse?.claims) return [];
    const statusSet = new Set<ClaimStatus>();
    claimsListResponse.claims.forEach((claim) => {
      statusSet.add(claim.status);
    });
    return Array.from(statusSet);
  }, [claimsListResponse]);

  // Transform claims to InsuranceClaim format
  // Backend now handles all filtering, so no frontend filtering needed
  const transformedClaims = useMemo(() => {
    if (!claimsListResponse?.claims) return [];

    // Transform to InsuranceClaim format
    // Backend returns claims with _id field, which we map to claimId
    return claimsListResponse.claims.map((claim: any) => ({
      claimId: claim._id || claim.claimId, // Use _id from database as claimId
      patientId: claim.patientId,
      providerId: claim.providerId,
      payerId: claim.payerId,
      status: claim.status,
      totalCharges: claim.totalCharges,
      datesOfService: claim.datesOfService || [], // Use datesOfService if available
      claimControlNumber: claim.claimControlNumber || '',
      tenantId: tenantId!,
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt || claim.createdAt,
    })) as InsuranceClaim[];
  }, [claimsListResponse, tenantId]);

  // Scroll to claims list when filters change and data is loaded
  useEffect(() => {
    if (shouldScrollToTable && transformedClaims.length > 0) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        setTimeout(() => {
          const claimsList = document.querySelector('[data-testid="claims-list"]');
          if (claimsList) {
            claimsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setShouldScrollToTable(false);
          }
        }, 100);
      });
    }
  }, [shouldScrollToTable, transformedClaims.length]);

  // Count denied claims for the alert banner
  const deniedClaimsCount = useMemo(() => {
    return transformedClaims.filter((claim) => claim.status === 'denied').length;
  }, [transformedClaims]);

  // Calculate total amount of denied claims
  const deniedClaimsTotalAmount = useMemo(() => {
    return transformedClaims
      .filter((claim) => claim.status === 'denied')
      .reduce((sum, claim) => sum + claim.totalCharges, 0);
  }, [transformedClaims]);

  // Build name maps for ClaimsTable
  const patientNames = useMemo(() => {
    if (!patientsForMapping) return {};
    const map: Record<string, string> = {};
    patientsForMapping.forEach((patient) => {
      map[patient._id] = `${patient.firstName} ${patient.lastName}`;
    });
    return map;
  }, [patientsForMapping]);

  const providerNames = useMemo(() => {
    if (!providers) return {};
    const map: Record<string, string> = {};
    providers.forEach((provider) => {
      map[provider._id] = `${provider.firstName} ${provider.lastName}`;
    });
    return map;
  }, [providers]);

  const payerNames = useMemo(() => {
    if (!insurancePayers) return {};
    const map: Record<string, string> = {};
    insurancePayers.forEach((payer) => {
      map[payer._id] = payer.name;
    });
    return map;
  }, [insurancePayers]);

  // Appeal claim mutation
  const appealClaim = useMutation(api.billing.appealClaim);

  // Handle appeal action
  const handleAppeal = async () => {
    if (!selectedClaimForAppeal || !userEmail || !claimsListResponse) {
      toast.error('Missing required information', {
        description: 'Unable to appeal claim. Please try again.',
      });
      return;
    }

    // Validate claim is denied before appealing
    if (selectedClaimForAppeal.status !== 'denied') {
      toast.error('Invalid claim status', {
        description: 'Only denied claims can be appealed.',
      });
      setAppealDialogOpen(false);
      setSelectedClaimForAppeal(null);
      return;
    }

    setIsAppealing(true);
    try {
      // Find the original claim from the list response to get its _id
      const originalClaim = claimsListResponse.claims.find(
        (c) => c.claimId === selectedClaimForAppeal.claimId
      );

      if (!originalClaim) {
        throw new Error('Claim not found in the current list');
      }

      // Validate claim status matches
      if (originalClaim.status !== 'denied') {
        throw new Error('Claim status has changed. Please refresh and try again.');
      }

      await appealClaim({
        claimId: originalClaim._id,
        userEmail,
      });

      // Success feedback
      toast.success('Claim appealed successfully', {
        description: `Claim ${selectedClaimForAppeal.claimControlNumber || selectedClaimForAppeal.claimId} has been resubmitted for review.`,
      });

      // Close dialog and reset state
      setAppealDialogOpen(false);
      setSelectedClaimForAppeal(null);
    } catch (error) {
      console.error('Failed to appeal claim:', error);
      
      // User-friendly error messages
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to appeal claim. Please try again.';
      
      toast.error('Appeal failed', {
        description: errorMessage,
      });
    } finally {
      setIsAppealing(false);
    }
  };

  // Loading state - queries return undefined while loading
  const isLoading = canQuery && (
    rcmMetrics === undefined ||
    claimsListResponse === undefined ||
    providers === undefined ||
    (uniquePatientIds.length > 0 && patientsForMapping === undefined) ||
    allPatientsResponse === undefined ||
    insurancePayers === undefined
  );

  // Error state - queries return null on error
  const hasError = rcmMetrics === null || claimsListResponse === null;

  return (
    <ClinicLayout showSearch={true}>
      <div className="flex-1 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <BackButton />
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-text-primary">
              Billing & Revenue Cycle Management
            </h1>
            <p className="text-text-secondary mt-1">
              Monitor your clinic&apos;s billing performance and claims
            </p>
          </div>

          {/* Error State */}
          {hasError && (
            <ErrorState
              title="Failed to load billing data"
              message="We encountered an error while loading your billing information. Please try again."
              onRetry={() => window.location.reload()}
            />
          )}

          {/* Clinic-Level Filters Panel - Task 3.4 ✅ */}
          {/* Moved to top so filters affect all content on the page */}
          {!hasError && (
            <div className="mb-6">
              <ClinicBillingFilters
                providers={
                  providers?.map((p) => ({
                    id: p._id,
                    name: `${p.firstName} ${p.lastName}`,
                  })) || []
                }
                payers={payers}
                patients={
                  allPatients?.map((p) => ({
                    id: p._id,
                    name: `${p.firstName} ${p.lastName}`,
                  })) || []
                }
                statuses={availableStatuses}
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          )}

          {/* Loading State */}
          {isLoading && !hasError && (
            <>
              {/* KPI Cards Skeleton */}
              <div className="mb-8">
                <BillingKPICardsSkeleton />
              </div>

              {/* Claims List Skeleton */}
              <div className="space-y-4">
                <div className="h-6 w-32 bg-surface-interactive rounded animate-pulse" />
                {[1, 2, 3, 4, 5].map((i) => (
                  <div 
                    key={i} 
                    className="bg-surface-elevated rounded-xl border border-border-primary/20 p-5 animate-pulse"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-surface-interactive rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 bg-surface-interactive rounded" />
                        <div className="h-4 w-32 bg-surface-interactive rounded" />
                        <div className="h-5 w-20 bg-surface-interactive rounded" />
                      </div>
                      <div className="h-6 w-16 bg-surface-interactive rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* RCM Metrics Display */}
          {!isLoading && !hasError && rcmMetrics && (
            <>
              {/* KPI Cards */}
              <div className="mb-8">
                <BillingKPICards metrics={rcmMetrics} showDefaultTooltips={true} />
              </div>

              {/* Revenue Chart */}
              {monthlyRevenueData && monthlyRevenueData.length > 0 && (
                <div className="mb-8">
                  <div className="bg-surface-elevated rounded-xl border border-border-primary/20 p-6">
                    <h2 className="text-lg font-semibold text-text-primary mb-4">
                      Monthly Revenue Trend
                    </h2>
                    <RevenueChart data={monthlyRevenueData} height={300} />
                  </div>
                </div>
              )}

              {/* Denied Claims Alert Banner */}
              {deniedClaimsCount > 0 && (
                <div className="mb-6">
                  <DeniedClaimsAlert
                    deniedCount={deniedClaimsCount}
                    totalAmount={deniedClaimsTotalAmount}
                    onReview={() => {
                      // Filter to show only denied claims
                      setFilters({
                        dateFrom: undefined,
                        dateTo: undefined,
                        providerIds: [],
                        payerIds: [],
                        patientIds: [],
                        statuses: ['denied'],
                      });
                      setShouldScrollToTable(true);
                    }}
                  />
                </div>
              )}

              {/* Claims List - Accordion Cards */}
              <div data-testid="claims-list">
                {transformedClaims.length > 0 ? (
                  <div className="space-y-4">
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-text-primary">Claims</h2>
                        <p className="text-sm text-text-secondary mt-0.5">
                          {transformedClaims.length} {transformedClaims.length === 1 ? 'claim' : 'claims'} found
                        </p>
                      </div>
                    </div>

                    {/* Claims Cards */}
                    <div className="space-y-3">
                      {transformedClaims.map((claim) => (
                        <ClinicClaimCard
                          key={claim.claimId}
                          claim={claim}
                          patientName={patientNames[claim.patientId] || claim.patientId}
                          providerName={providerNames[claim.providerId] || claim.providerId}
                          payerName={payerNames[claim.payerId] || claim.payerId}
                          onViewDetails={(c) => {
                            const claimIdentifier = c.claimId || c.claimControlNumber;
                            if (claimIdentifier) {
                              setSelectedClaimId(claimIdentifier);
                              setIsDrawerOpen(true);
                            }
                          }}
                          onAppeal={(c) => {
                            setSelectedClaimForAppeal(c);
                            setAppealDialogOpen(true);
                          }}
                          onDownload={(c) => {
                            // Export claim data as JSON
                            try {
                              const claimData = {
                                claimId: c.claimId,
                                claimControlNumber: c.claimControlNumber,
                                patient: patientNames[c.patientId] || c.patientId,
                                provider: providerNames[c.providerId] || c.providerId,
                                payer: payerNames[c.payerId] || c.payerId,
                                status: c.status,
                                totalCharges: formatCurrency(c.totalCharges),
                                datesOfService: c.datesOfService?.map((date) =>
                                  new Date(date).toLocaleDateString()
                                ) || [],
                                createdAt: new Date(c.createdAt).toLocaleString(),
                                updatedAt: new Date(c.updatedAt).toLocaleString(),
                              };

                              const blob = new Blob([JSON.stringify(claimData, null, 2)], {
                                type: 'application/json',
                              });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `claim-${c.claimControlNumber || c.claimId}-${Date.now()}.json`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);

                              toast.success('Claim data downloaded', {
                                description: 'Claim information exported as JSON file.',
                              });
                            } catch (error) {
                              console.error('Failed to download claim:', error);
                              toast.error('Download failed', {
                                description: 'Unable to export claim data. Please try again.',
                              });
                            }
                          }}
                        />
                      ))}
                    </div>

                    {/* Pagination (if needed in future) */}
                    {claimsListResponse?.pagination && claimsListResponse.pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-border-primary/10">
                        <p className="text-sm text-text-secondary">
                          Page {claimsListResponse.pagination.page} of {claimsListResponse.pagination.totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={claimsListResponse.pagination.page <= 1}
                            aria-label="Previous page"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={claimsListResponse.pagination.page >= claimsListResponse.pagination.totalPages}
                            aria-label="Next page"
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <ClaimsEmptyState
                    hasFilters={
                      filters.dateFrom !== undefined ||
                      filters.dateTo !== undefined ||
                      filters.providerIds.length > 0 ||
                      filters.payerIds.length > 0 ||
                      filters.patientIds.length > 0 ||
                      filters.statuses.length > 0
                    }
                    onClearFilters={() => {
                      setFilters({
                        dateFrom: undefined,
                        dateTo: undefined,
                        providerIds: [],
                        payerIds: [],
                        patientIds: [],
                        statuses: [],
                      });
                    }}
                  />
                )}
              </div>
            </>
          )}

          {/* Claim Details Drawer */}
          {selectedClaimId && tenantId && userEmail && (
            <ClaimDetailsDrawer
              claimId={selectedClaimId}
              open={isDrawerOpen}
              onOpenChange={setIsDrawerOpen}
              tenantId={tenantId}
              userEmail={userEmail}
              useClinicAccess={true}
            />
          )}

          {/* Appeal Claim Dialog */}
          <Dialog open={appealDialogOpen} onOpenChange={setAppealDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Appeal Denied Claim
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to appeal this denied claim? This will resubmit the claim to the insurance company for review.
                </DialogDescription>
              </DialogHeader>
              
              {selectedClaimForAppeal && (
                <div className="space-y-3 py-4">
                  <div className="bg-surface-elevated rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Claim Number:</span>
                      <span className="font-medium text-text-primary">
                        {selectedClaimForAppeal.claimControlNumber || selectedClaimForAppeal.claimId}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Patient:</span>
                      <span className="font-medium text-text-primary">
                        {patientNames[selectedClaimForAppeal.patientId] || selectedClaimForAppeal.patientId}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Amount:</span>
                      <span className="font-medium text-text-primary">
                        {formatCurrency(selectedClaimForAppeal.totalCharges)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Payer:</span>
                      <span className="font-medium text-text-primary">
                        {payerNames[selectedClaimForAppeal.payerId] || selectedClaimForAppeal.payerId}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 p-3 bg-status-warning/10 border border-status-warning/20 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-status-warning mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-text-secondary">
                      The claim status will be changed from &quot;denied&quot; to &quot;submitted&quot; and will be resubmitted to the insurance company for review.
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAppealDialogOpen(false);
                    setSelectedClaimForAppeal(null);
                  }}
                  disabled={isAppealing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAppeal}
                  disabled={isAppealing}
                  className="bg-interactive-primary hover:bg-interactive-primary-hover"
                >
                  {isAppealing ? 'Appealing...' : 'Appeal Claim'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ClinicLayout>
  );
}
