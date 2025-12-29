'use client';

import React, { useState } from 'react';
import { FileText, DollarSign, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreateClaimForm } from './CreateClaimForm';
import { InsurancePaymentForm } from './InsurancePaymentForm';
import { PatientPaymentForm } from './PatientPaymentForm';

/**
 * Quick Actions Toolbar Component
 * 
 * Task 3.7: Add Quick Actions Toolbar
 * 
 * Provides quick access buttons for common billing actions:
 * - Create Claim from Appointment
 * - Post Insurance Payment
 * - Post Patient Payment
 * 
 * Each button opens a modal dialog for the respective action.
 */
export function QuickActionsToolbar() {
  // Modal state management
  const [createClaimOpen, setCreateClaimOpen] = useState(false);
  const [insurancePaymentOpen, setInsurancePaymentOpen] = useState(false);
  const [patientPaymentOpen, setPatientPaymentOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Create Claim from Appointment Button */}
      <Button
        onClick={() => setCreateClaimOpen(true)}
        variant="outline"
        className="flex items-center gap-2"
      >
        <FileText className="h-4 w-4" />
        Create Claim from Appointment
      </Button>

      {/* Post Insurance Payment Button */}
      <Button
        onClick={() => setInsurancePaymentOpen(true)}
        variant="outline"
        className="flex items-center gap-2"
      >
        <DollarSign className="h-4 w-4" />
        Post Insurance Payment
      </Button>

      {/* Post Patient Payment Button */}
      <Button
        onClick={() => setPatientPaymentOpen(true)}
        variant="outline"
        className="flex items-center gap-2"
      >
        <CreditCard className="h-4 w-4" />
        Post Patient Payment
      </Button>

      {/* Create Claim from Appointment Modal */}
      <Dialog open={createClaimOpen} onOpenChange={setCreateClaimOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Claim from Appointment</DialogTitle>
            <DialogDescription>
              Generate an insurance claim from a completed appointment. All fields are validated before submission.
            </DialogDescription>
          </DialogHeader>
          <CreateClaimForm
            onSuccess={() => {
              setCreateClaimOpen(false);
            }}
            onCancel={() => setCreateClaimOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Post Insurance Payment Modal */}
      <Dialog open={insurancePaymentOpen} onOpenChange={setInsurancePaymentOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post Insurance Payment</DialogTitle>
            <DialogDescription>
              Record a payment received from an insurance company. Select a claim and enter payment details.
            </DialogDescription>
          </DialogHeader>
          <InsurancePaymentForm
            onSuccess={() => {
              setInsurancePaymentOpen(false);
            }}
            onCancel={() => setInsurancePaymentOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Post Patient Payment Modal */}
      <Dialog open={patientPaymentOpen} onOpenChange={setPatientPaymentOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post Patient Payment</DialogTitle>
            <DialogDescription>
              Record a payment received from a patient. Select an invoice and enter payment details.
            </DialogDescription>
          </DialogHeader>
          <PatientPaymentForm
            onSuccess={() => {
              setPatientPaymentOpen(false);
            }}
            onCancel={() => setPatientPaymentOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

