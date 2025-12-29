'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Skeleton loader for Billing KPI Cards (Task 9.3)
 * Displays placeholder cards matching the structure of BillingKPICards
 */
export function BillingKPICardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="bg-surface-elevated">
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-3 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for Claims Table (Task 9.3)
 * Displays placeholder rows matching the structure of ClaimsTable
 */
export function ClaimsTableSkeleton() {
  return (
    <div className="bg-surface-elevated rounded-xl border border-border-primary/20 overflow-hidden">
      {/* Table Header */}
      <div className="border-b border-border-primary/10 p-4">
        <Skeleton className="h-6 w-48" />
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-primary/10">
              {Array.from({ length: 6 }).map((_, index) => (
                <th key={index} className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border-primary/10">
                {Array.from({ length: 6 }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-4">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for Patient Invoice Cards (Task 9.3)
 * Displays placeholder cards matching the structure of invoice cards
 */
export function PatientInvoiceCardsSkeleton() {
  return (
    <div className="bg-surface-elevated rounded-xl border border-border-primary/20 overflow-hidden">
      <div className="p-6 border-b border-border-primary/10">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="divide-y divide-border-primary/10">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <Skeleton className="w-10 h-10 rounded-lg mr-4" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-3 w-24 mb-2" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <Skeleton className="h-6 w-20 mb-2" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for Patient Billing Summary Cards (Task 9.3)
 * Displays placeholder cards for outstanding balance, upcoming charges, total paid
 */
export function PatientBillingSummarySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="bg-surface-elevated rounded-xl border border-border-primary/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </div>
  );
}

