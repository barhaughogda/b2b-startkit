/**
 * Claim status utility functions
 * 
 * Shared utility functions for claim status display and messaging
 * across billing components.
 */

/**
 * Get claim status display label
 * 
 * Maps claim status to user-friendly label for display
 * 
 * @param claimStatus - Claim status string (e.g., 'submitted', 'denied', 'paid')
 * @returns User-friendly status label
 */
export function getClaimStatusMessage(claimStatus?: string): string {
  if (!claimStatus) return '';
  
  switch (claimStatus) {
    case 'submitted':
    case 'accepted':
      return 'Insurance Pending';
    case 'denied':
      return 'Denied - You Owe Full Amount';
    case 'paid':
      return 'Insurance Paid';
    default:
      return claimStatus;
  }
}

/**
 * Get helpful messaging for claim status
 * 
 * Provides user-friendly explanations for each claim status
 * to help patients understand what the status means
 * 
 * @param claimStatus - Claim status string (e.g., 'submitted', 'denied', 'paid')
 * @returns Helpful message explaining the status, or empty string if no status
 */
export function getClaimStatusHelpfulMessage(claimStatus?: string): string {
  if (!claimStatus) return '';
  
  switch (claimStatus) {
    case 'submitted':
    case 'accepted':
      return 'Your insurance is currently processing this claim. You will be notified once a decision is made.';
    case 'denied':
      return 'This claim was denied by your insurance. You are responsible for the full amount. Please contact your insurance provider if you have questions.';
    case 'paid':
      return 'Your insurance has paid their portion of this claim. Any remaining balance is your responsibility.';
    default:
      return '';
  }
}






















