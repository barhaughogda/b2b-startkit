/**
 * Stripe Webhook Handlers Integration Tests
 * 
 * Tests for webhook event handlers that sync Stripe data to database
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { handleStripeWebhook, verifyStripeSignature } from '../webhooks'
import { getStripe } from '../stripe'
import { superadminDb } from '@startkit/database'
import { createMockOrganization, createMockSubscription } from '../../../../test-utils/factories'
import type Stripe from 'stripe'

// Mock Stripe
vi.mock('../stripe', () => ({
  getStripe: vi.fn(),
}))

// Mock database
vi.mock('@startkit/database', async () => {
  const actual = await vi.importActual('@startkit/database')
  return {
    ...actual,
    superadminDb: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      values: vi.fn(),
    },
  }
})

describe('Stripe Webhook Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear processed events set
    ;(handleStripeWebhook as any).processedEvents?.clear?.()
  })

  describe('verifyStripeSignature', () => {
    it('should verify valid signature', () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_test_123',
            type: 'checkout.session.completed',
            data: {},
          }),
        },
      }
      vi.mocked(getStripe).mockReturnValue(mockStripe as any)

      const event = verifyStripeSignature('payload', 'signature', 'secret')
      expect(event.id).toBe('evt_test_123')
      expect(event.type).toBe('checkout.session.completed')
    })

    it('should throw on invalid signature', () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockImplementation(() => {
            throw new Error('Invalid signature')
          }),
        },
      }
      vi.mocked(getStripe).mockReturnValue(mockStripe as any)

      expect(() => {
        verifyStripeSignature('payload', 'invalid', 'secret')
      }).toThrow('Webhook signature verification failed')
    })
  })

  describe('handleStripeWebhook', () => {
    it('should handle checkout.session.completed event', async () => {
      const mockOrg = createMockOrganization()
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test_123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        canceled_at: null,
        items: {
          data: [
            {
              id: 'si_test_123',
              price: { id: 'price_pro_monthly' },
              quantity: 1,
            } as any,
          ],
        },
      }

      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: { organizationId: mockOrg.id },
            subscription: 'sub_test_123',
            customer: 'cus_test_123',
          } as Stripe.Checkout.Session,
        },
      } as Stripe.Event

      const mockStripe = {
        subscriptions: {
          retrieve: vi.fn().mockResolvedValue(mockSubscription),
        },
      }
      vi.mocked(getStripe).mockReturnValue(mockStripe as any)

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      vi.mocked(superadminDb.select).mockImplementation(mockSelect as any)
      vi.mocked(superadminDb.insert).mockImplementation(mockInsert as any)

      const result = await handleStripeWebhook(event)

      expect(result.processed).toBe(true)
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_test_123')
      expect(superadminDb.insert).toHaveBeenCalled()
    })

    it('should be idempotent - skip if already processed', async () => {
      const event: Stripe.Event = {
        id: 'evt_already_processed',
        type: 'checkout.session.completed',
        data: {
          object: {} as Stripe.Checkout.Session,
        },
      } as Stripe.Event

      // Process first time
      const mockStripe = {
        subscriptions: {
          retrieve: vi.fn().mockResolvedValue({}),
        },
      }
      vi.mocked(getStripe).mockReturnValue(mockStripe as any)
      vi.mocked(superadminDb.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any)
      vi.mocked(superadminDb.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any)

      await handleStripeWebhook(event)

      // Process second time - should be idempotent
      const result2 = await handleStripeWebhook(event)
      expect(result2.processed).toBe(true)
      // Should not call retrieve again
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledTimes(1)
    })

    it('should handle customer.subscription.updated event', async () => {
      const mockOrg = createMockOrganization()
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test_123',
        status: 'active',
        metadata: { organizationId: mockOrg.id },
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        canceled_at: null,
        items: {
          data: [
            {
              id: 'si_test_123',
              price: { id: 'price_pro_monthly' },
              quantity: 1,
            } as any,
          ],
        },
      }

      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'customer.subscription.updated',
        data: {
          object: mockSubscription as Stripe.Subscription,
        },
      } as Stripe.Event

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      vi.mocked(superadminDb.update).mockImplementation(mockUpdate as any)
      vi.mocked(superadminDb.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any)

      const result = await handleStripeWebhook(event)

      expect(result.processed).toBe(true)
      expect(superadminDb.update).toHaveBeenCalled()
    })

    it('should handle customer.subscription.deleted event', async () => {
      const mockOrg = createMockOrganization()
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test_123',
        status: 'canceled',
        metadata: { organizationId: mockOrg.id },
        customer: 'cus_test_123',
      }

      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'customer.subscription.deleted',
        data: {
          object: mockSubscription as Stripe.Subscription,
        },
      } as Stripe.Event

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      vi.mocked(superadminDb.update).mockImplementation(mockUpdate as any)
      vi.mocked(superadminDb.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any)

      const result = await handleStripeWebhook(event)

      expect(result.processed).toBe(true)
      expect(mockUpdate().set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'canceled',
        })
      )
    })

    it('should handle invoice.paid event', async () => {
      const mockOrg = createMockOrganization()
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test_123',
        metadata: { organizationId: mockOrg.id },
      }

      const mockInvoice: Partial<Stripe.Invoice> = {
        id: 'in_test_123',
        subscription: 'sub_test_123',
        customer: 'cus_test_123',
        amount_paid: 9900,
        currency: 'usd',
      }

      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'invoice.paid',
        data: {
          object: mockInvoice as Stripe.Invoice,
        },
      } as Stripe.Event

      const mockStripe = {
        subscriptions: {
          retrieve: vi.fn().mockResolvedValue(mockSubscription),
        },
      }
      vi.mocked(getStripe).mockReturnValue(mockStripe as any)

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      vi.mocked(superadminDb.update).mockImplementation(mockUpdate as any)
      vi.mocked(superadminDb.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any)

      const result = await handleStripeWebhook(event)

      expect(result.processed).toBe(true)
      expect(mockUpdate().set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      )
    })

    it('should handle invoice.payment_failed event', async () => {
      const mockOrg = createMockOrganization()
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test_123',
        metadata: { organizationId: mockOrg.id },
      }

      const mockInvoice: Partial<Stripe.Invoice> = {
        id: 'in_test_123',
        subscription: 'sub_test_123',
        customer: 'cus_test_123',
        amount_due: 9900,
        currency: 'usd',
        attempt_count: 1,
      }

      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'invoice.payment_failed',
        data: {
          object: mockInvoice as Stripe.Invoice,
        },
      } as Stripe.Event

      const mockStripe = {
        subscriptions: {
          retrieve: vi.fn().mockResolvedValue(mockSubscription),
        },
      }
      vi.mocked(getStripe).mockReturnValue(mockStripe as any)

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      vi.mocked(superadminDb.update).mockImplementation(mockUpdate as any)
      vi.mocked(superadminDb.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any)

      const result = await handleStripeWebhook(event)

      expect(result.processed).toBe(true)
      expect(mockUpdate().set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'past_due',
        })
      )
    })

    it('should handle errors gracefully', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {}, // Missing organizationId
          } as Stripe.Checkout.Session,
        },
      } as Stripe.Event

      const result = await handleStripeWebhook(event)

      expect(result.processed).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
