/**
 * Billing types - client-safe type definitions
 */
import type { PlanTier } from '@startkit/config'

export interface BillingData {
  subscription: {
    id: string | null
    stripeCustomerId: string | null
    plan: PlanTier
    status: string
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean
    seatCount: number
    maxSeats: number | null
  } | null
  planConfig: {
    name: string
    description: string
    monthlyPrice: number
    yearlyPrice: number
    features: { name: string; included: boolean }[]
    limits: {
      seats?: number
      apiCallsPerMonth?: number
      storageGb?: number
    }
  }
  usage: {
    apiCalls: { current: number; limit: number }
    storage: { current: number; limit: number }
    seats: { current: number; limit: number }
  }
  invoices: Array<{
    id: string
    date: Date
    amount: number
    status: string
    pdfUrl?: string
  }>
}
