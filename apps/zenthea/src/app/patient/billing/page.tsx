'use client';

import React, { useState, useEffect } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Download, Eye, DollarSign, Calendar, Receipt, Loader2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { canUseConvexQuery, isValidConvexIdForTable, isValidConvexId } from '@/lib/convexIdValidation';
import { PatientClaimDetailsDrawer } from '@/components/billing/PatientClaimDetailsDrawer';
import { PatientPaymentModal } from '@/components/billing/PatientPaymentModal';
import { getClaimStatusMessage, getClaimStatusHelpfulMessage } from '@/lib/billing/claim-status';
import { getStatusLabel, getStatusColor, getStatusBadgeVariant } from '@/lib/billing/statusMapping';
import { PatientBillingSummarySkeleton, PatientInvoiceCardsSkeleton } from '@/components/billing/BillingSkeletons';
import { ErrorState, InvoicesEmptyState } from '@/components/billing/BillingStates';
import type { ClaimStatus } from '@/types/billing';

export default function PatientBillingPage() {
  const { data: session, status } = useZentheaSession();
  const router = useRouter();
  
  // Task 5.3: State for claim details drawer
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [isClaimDrawerOpen, setIsClaimDrawerOpen] = useState(false);

  // Task 5.4: State for payment modal
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Find patient by email
  const patientEmail = session?.user?.email?.trim() || '';
  const tenantId = session?.user?.tenantId?.trim() || 'demo-tenant';
  const userId = session?.user?.id;
  
  // Only query if we have a valid email and tenantId with valid Convex user ID
  const canQueryByEmail = canUseConvexQuery(userId, tenantId);
  
  // Find patient ID
  // Note: Using type assertion because patientProfile may not be in generated types if codegen was skipped
  const foundPatientId = useQuery(
    (api as any).patientProfile?.findPatientByEmail,
    canQueryByEmail && patientEmail && patientEmail.length > 0 
      ? { email: patientEmail, tenantId } 
      : 'skip'
  ) as Id<'patients'> | null | undefined;

  // Validate that foundPatientId is a valid Convex ID for patients table
  const isValidPatientId = foundPatientId && isValidConvexIdForTable(foundPatientId, 'patients');

  // Get billing data using new getPatientInvoices query (Task 5.1)
  // Note: Using type assertion because billing may not be in generated types if codegen was skipped
  const invoices = useQuery(
    (api as any).billing?.getPatientInvoices,
    isValidPatientId && patientEmail ? { patientId: foundPatientId as Id<'patients'>, userEmail: patientEmail } : 'skip'
  );

  // Get billing summary
  const billingSummary = useQuery(
    (api as any).billing?.getPatientBillingSummary,
    isValidPatientId && patientEmail ? { patientId: foundPatientId as Id<'patients'>, userEmail: patientEmail } : 'skip'
  );

  // Type for invoice returned from getPatientInvoices (Task 5.1)
  type Invoice = {
    _id: Id<'invoices'>;
    invoiceNumber: string;
    date: string;
    createdAt: number;
    total: number;
    patientResponsibility: number;
    insurancePortion: number;
    status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'draft' | 'submitted' | 'denied' | 'partially_paid';
    claimId?: Id<'insuranceClaims'>;
    claimStatus?: string;
    description: string;
    serviceType: string;
    dueDate: number;
    paidDate?: number;
    tenantId: string;
  };

  // Calculate pagination values safely (may be undefined during loading)
  const invoicesList: Invoice[] = invoices || [];
  const totalInvoices = invoicesList.length;
  const totalPages = Math.ceil(totalInvoices / itemsPerPage);

  // Reset to page 1 when invoices list changes
  // CRITICAL: This hook must be called unconditionally before any early returns
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Debug logging to diagnose connection issues (development only)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const debugInfo = {
      status,
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: userId || 'missing',
      email: patientEmail || 'missing',
      tenantId: tenantId || 'missing',
      role: session?.user?.role || 'missing',
      userIdType: typeof userId,
      userIdLength: userId?.length || 0,
      isValidConvexId: userId ? isValidConvexId(userId) : false,
      canQueryByEmail: canUseConvexQuery(userId, tenantId),
    };
    console.log('[Billing] Session status:', JSON.stringify(debugInfo, null, 2));
    console.log('[Billing] Raw session object:', session);
  }

  // Show loading state while session is being fetched (after all hooks)
  if (status === 'loading') {
    return (
      <div className="flex-1 px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-zenthea-teal" />
              <p className="text-text-secondary">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!session || session.user.role !== 'patient') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h2>
          <p className="text-text-secondary">Please sign in to access your billing information.</p>
        </div>
      </div>
    );
  }

  // Check if queries are actually executing (not skipped)
  const isPatientQueryActive = canQueryByEmail && patientEmail && patientEmail.length > 0;
  const isBillingQueryActive = isValidPatientId;

  // Loading state - only show loading if queries are actually executing
  // If queries are skipped (conditions false), they return undefined but aren't loading
  const isPatientQueryLoading = isPatientQueryActive && foundPatientId === undefined;
  const isInvoicesLoading = isBillingQueryActive && invoices === undefined;
  const isSummaryLoading = isBillingQueryActive && billingSummary === undefined;

  if (isPatientQueryLoading || isInvoicesLoading || isSummaryLoading) {
    return (
      <div className="flex-1 px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-text-primary">Billing & Invoices</h1>
            <p className="text-text-secondary mt-1">View your medical service charges and payment history</p>
          </div>
          
          {/* Billing Summary Skeleton - Task 9.3 */}
          <div className="mb-8">
            <PatientBillingSummarySkeleton />
          </div>

          {/* Invoice Cards Skeleton - Task 9.3 */}
          <PatientInvoiceCardsSkeleton />
        </div>
      </div>
    );
  }

  // Handle case where queries were skipped (invalid user ID or missing data)
  if (!canQueryByEmail || !patientEmail || patientEmail.length === 0) {
    // Provide diagnostic information in development
    const diagnosticInfo = process.env.NODE_ENV === 'development' ? (
      <div className="mt-4 p-4 bg-surface-elevated rounded-lg border border-border-primary/20 text-left">
        <p className="text-xs font-mono text-text-secondary mb-2">Debug Info:</p>
        <ul className="text-xs text-text-tertiary space-y-1">
          <li>User ID: {userId || 'missing'}</li>
          <li>User ID Type: {typeof userId}</li>
          <li>Tenant ID: {tenantId || 'missing'}</li>
          <li>Email: {patientEmail || 'missing'}</li>
          <li>Valid Convex ID: {userId ? isValidConvexId(userId) ? 'Yes' : 'No' : 'N/A'}</li>
        </ul>
      </div>
    ) : null;

    return (
      <div className="flex-1 px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-status-error mb-2 font-medium">Unable to load billing information</p>
              <p className="text-text-secondary mb-4 text-sm">
                {!userId 
                  ? "Your session is missing user information. Please sign out and sign back in."
                  : !canQueryByEmail
                  ? "Your account information could not be verified with Convex. Please try signing out and signing back in."
                  : "Your email address is missing from your session. Please sign out and sign back in."
                }
              </p>
              {diagnosticInfo}
              <Button 
                onClick={() => router.push('/auth/signin')}
                variant="outline"
                className="mt-4"
              >
                Sign In Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle case where patient was not found
  if (foundPatientId === null) {
    return (
      <div className="flex-1 px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-status-error mb-2 font-medium">Patient profile not found</p>
              <p className="text-text-secondary mb-4 text-sm">
                We couldn&apos;t find your patient profile. Please contact support if this issue persists.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle case where patient ID was found but is invalid for billing queries
  if (foundPatientId && !isValidPatientId) {
    return (
      <div className="flex-1 px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-status-error mb-2 font-medium">Invalid patient profile</p>
              <p className="text-text-secondary mb-4 text-sm">
                Your patient profile could not be validated. Please try signing out and signing back in.
              </p>
              <Button 
                onClick={() => router.push('/auth/signin')}
                variant="outline"
              >
                Sign In Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state - billing queries failed (null indicates error in Convex)
  // Note: foundPatientId === null is already handled above
  if (invoices === null || billingSummary === null) {
    return (
      <div className="flex-1 px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-text-primary">Billing & Invoices</h1>
            <p className="text-text-secondary mt-1">View your medical service charges and payment history</p>
          </div>
          
          {/* Error State - Task 9.3 */}
          <ErrorState
            title="Failed to load billing information"
            message="We encountered an error while loading your billing data. Please try again."
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  const outstandingBalance = billingSummary?.outstandingBalance || 0;
  const totalSpent = billingSummary?.totalPaid || 0;
  const upcomingCharges = billingSummary?.upcomingCharges || 0;
  const pendingCount = billingSummary?.pendingCount || 0;

  // Pagination calculations (using values calculated above)
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = invoicesList.slice(startIndex, endIndex);

  /**
   * Helper function to get status display label and color (Task 7.2)
   * Uses shared status mapping utility for consistency across all views
   */
  const getStatusDisplay = (status: Invoice['status']) => {
    return {
      label: getStatusLabel(status),
      colorClass: getStatusColor(status),
    };
  };

  /**
   * Invoice Card Component - Accordion Style (Mobile-First)
   * 
   * Collapsed state: Shows essential info (invoice #, "You Owe", status)
   * Expanded state: Shows full breakdown, helpful messages, and action buttons
   * 
   * Features:
   * - Mobile-first design with touch-friendly targets
   * - Smooth expand/collapse animation
   * - Keyboard accessible (Enter/Space to toggle)
   * - ARIA attributes for screen readers
   */
  const InvoiceCard = ({ invoice }: { invoice: Invoice }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const cardId = `invoice-card-${invoice._id}`;
    const contentId = `invoice-content-${invoice._id}`;
    
    const hasInsurance = invoice.insurancePortion > 0;
    const hasClaim = invoice.claimId !== undefined;
    const claimStatusMessage = hasClaim && invoice.claimStatus 
      ? getClaimStatusMessage(invoice.claimStatus) 
      : '';
    const helpfulMessage = hasClaim && invoice.claimStatus
      ? getClaimStatusHelpfulMessage(invoice.claimStatus)
      : '';

    // Consolidated status display - single badge, no duplicates
    let statusDisplay;
    
    if (hasClaim && invoice.claimStatus) {
      const claimStatus = invoice.claimStatus as ClaimStatus;
      switch (claimStatus) {
        case 'submitted':
        case 'accepted':
          statusDisplay = { 
            label: 'Insurance Pending',
            colorClass: getStatusColor(claimStatus) 
          };
          break;
        case 'denied':
          statusDisplay = { 
            label: 'Denied',
            colorClass: getStatusColor(claimStatus) 
          };
          break;
        case 'paid':
          statusDisplay = { 
            label: 'Insurance Paid',
            colorClass: getStatusColor(claimStatus) 
          };
          break;
        default:
          statusDisplay = getStatusDisplay(invoice.status);
      }
    } else {
      statusDisplay = getStatusDisplay(invoice.status);
    }

    // Truncate invoice number for mobile display
    const truncatedInvoiceNumber = invoice.invoiceNumber.length > 20 
      ? `${invoice.invoiceNumber.slice(0, 8)}...${invoice.invoiceNumber.slice(-6)}`
      : invoice.invoiceNumber;

    const handleToggle = () => {
      setIsExpanded(!isExpanded);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    };

    return (
      <div className="border-b border-border-primary/10 last:border-b-0">
        {/* Collapsed Header - Always Visible */}
        <div
          id={cardId}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className="p-4 sm:p-6 cursor-pointer hover:bg-surface-interactive/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary focus-visible:ring-inset"
        >
          <div className="flex items-center justify-between gap-3">
            {/* Left: Icon + Invoice Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zenthea-teal/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-zenthea-teal" />
              </div>
              <div className="min-w-0 flex-1">
                {/* Invoice number + service type */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm text-text-secondary font-mono truncate">
                    <span className="hidden sm:inline">{invoice.invoiceNumber}</span>
                    <span className="sm:hidden">{truncatedInvoiceNumber}</span>
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-interactive text-text-tertiary hidden sm:inline-block">
                    {invoice.serviceType}
                  </span>
                </div>
                {/* You Owe - Prominent on mobile */}
                <p className="font-semibold text-lg sm:text-xl text-text-primary mt-1">
                  You Owe: <span className="text-status-warning">${invoice.patientResponsibility.toFixed(2)}</span>
                </p>
              </div>
            </div>

            {/* Right: Status + Chevron */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusDisplay.colorClass}`}>
                {statusDisplay.label}
              </span>
              <ChevronDown 
                className={`w-5 h-5 text-text-tertiary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {/* Expanded Content - Details Section */}
        <div
          id={contentId}
          role="region"
          aria-labelledby={cardId}
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
            {/* Divider */}
            <div className="border-t border-border-primary/20 pt-4 space-y-4">
              {/* Description */}
              <p className="text-sm text-text-secondary">{invoice.description}</p>
              
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="text-text-tertiary">Service Date</span>
                <span className="text-text-primary font-medium">{invoice.date}</span>
                
                {hasInsurance && (
                  <>
                    <span className="text-text-tertiary">Insurance Portion</span>
                    <span className="text-text-primary font-medium">
                      ${invoice.insurancePortion.toFixed(2)}
                      {claimStatusMessage && (
                        <span className="ml-1 text-xs text-text-tertiary">({claimStatusMessage})</span>
                      )}
                    </span>
                  </>
                )}
                
                <span className="text-text-tertiary">Your Responsibility</span>
                <span className="text-status-warning font-medium">${invoice.patientResponsibility.toFixed(2)}</span>
                
                <span className="text-text-tertiary">Total Amount</span>
                <span className="text-text-primary font-semibold">${invoice.total.toFixed(2)}</span>
              </div>

              {/* Helpful Message */}
              {helpfulMessage && (
                <div className="p-3 bg-surface-interactive/50 rounded-lg">
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {helpfulMessage}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                {/* Pay Now - Primary action */}
                {invoice.patientResponsibility > 0 && invoice.status !== 'paid' && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-10 px-4 text-sm bg-interactive-primary hover:bg-interactive-primary-hover text-text-inverse flex-1 sm:flex-none min-w-[120px]" 
                    aria-label={`Pay invoice ${invoice.invoiceNumber}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInvoiceForPayment(invoice);
                      setIsPaymentModalOpen(true);
                    }}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Pay Now
                  </Button>
                )}
                {/* View Details */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-10 px-4 text-sm" 
                  aria-label={hasClaim && invoice.claimId ? "View claim details" : "View invoice details"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasClaim && invoice.claimId) {
                      setSelectedClaimId(invoice.claimId as string);
                      setIsClaimDrawerOpen(true);
                    } else {
                      router.push(`/patient/billing/invoice/${invoice.invoiceNumber}`);
                    }
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {hasClaim ? 'View Claim' : 'View Invoice'}
                </Button>
                {/* Download */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-10 px-4 text-sm" 
                  aria-label="Download invoice"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.info('Invoice download coming soon');
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 px-6 pb-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary">Billing & Invoices</h1>
          <p className="text-text-secondary mt-1">View your medical service charges and payment history</p>
        </div>
        {/* Billing Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-surface-elevated rounded-xl border border-border-primary/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Outstanding Balance</h3>
              <DollarSign className="h-5 w-5 text-status-warning" />
            </div>
            <p className="text-2xl font-bold text-text-primary">${outstandingBalance.toFixed(2)}</p>
            <p className="text-sm text-text-secondary">
              {outstandingBalance > 0 ? `${pendingCount} pending invoice(s)` : 'All paid'}
            </p>
          </div>
          
          <div className="bg-surface-elevated rounded-xl border border-border-primary/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Upcoming Charges</h3>
              <Calendar className="h-5 w-5 text-zenthea-teal" />
            </div>
            <p className="text-2xl font-bold text-text-primary">${upcomingCharges.toFixed(2)}</p>
            <p className="text-sm text-text-secondary">
              {upcomingCharges > 0 ? 'Due within 30 days' : 'No upcoming charges'}
            </p>
          </div>
          
          <div className="bg-surface-elevated rounded-xl border border-border-primary/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Total Paid</h3>
              <Receipt className="h-5 w-5 text-zenthea-purple" />
            </div>
            <p className="text-2xl font-bold text-text-primary">${totalSpent.toFixed(2)}</p>
            <p className="text-sm text-text-secondary">Last 3 months</p>
          </div>
        </div>

        {/* Billing History */}
        <div className="bg-surface-elevated rounded-xl border border-border-primary/20 overflow-hidden">
          <div className="p-6 border-b border-border-primary/10">
            <h2 className="text-lg font-semibold text-text-primary">Billing History</h2>
            <p className="text-sm text-text-secondary mt-1">View and download your medical service invoices</p>
          </div>
          
          <div>
            {invoicesList.length === 0 ? (
              <div className="p-6">
                <InvoicesEmptyState />
              </div>
            ) : (
              <>
                {paginatedInvoices.map((invoice: Invoice) => (
                  <InvoiceCard key={invoice._id} invoice={invoice} />
                ))}
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-6 border-t border-border-primary/10">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-text-secondary">
                        Showing {startIndex + 1} to {Math.min(endIndex, totalInvoices)} of {totalInvoices} invoice{totalInvoices !== 1 ? 's' : ''}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <span className="flex items-center px-4 text-sm text-text-secondary">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          aria-label="Next page"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Task 5.3: Claim Details Drawer */}
      {selectedClaimId && isValidPatientId && foundPatientId && (
        <PatientClaimDetailsDrawer
          claimId={selectedClaimId}
          open={isClaimDrawerOpen}
          onOpenChange={(open) => {
            setIsClaimDrawerOpen(open);
            if (!open) {
              setSelectedClaimId(null);
            }
          }}
          patientId={foundPatientId}
          userEmail={patientEmail}
        />
      )}

      {/* Task 5.4: Payment Modal */}
      {selectedInvoiceForPayment && patientEmail && (
        <PatientPaymentModal
          open={isPaymentModalOpen}
          onOpenChange={(open) => {
            setIsPaymentModalOpen(open);
            if (!open) {
              setSelectedInvoiceForPayment(null);
            }
          }}
          invoiceId={selectedInvoiceForPayment._id}
          invoiceNumber={selectedInvoiceForPayment.invoiceNumber}
          patientResponsibility={selectedInvoiceForPayment.patientResponsibility}
          userEmail={patientEmail}
          onPaymentSuccess={() => {
            // Refresh queries by triggering a re-render
            // Convex queries will automatically refetch when dependencies change
            // For now, we rely on Convex's automatic refetching
          }}
        />
      )}
    </div>
  );
}

