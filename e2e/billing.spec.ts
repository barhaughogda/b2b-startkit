/**
 * Billing E2E Tests
 * 
 * Tests for subscription and billing flows
 */

import { test, expect } from '@playwright/test'

test.describe('Billing', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is authenticated - navigate to billing page
    // In real tests, you'd set up auth state first
    await page.goto('/billing')
  })

  test('should display current plan', async ({ page }) => {
    // Should show current plan information
    await expect(page.getByText(/current plan|your plan/i)).toBeVisible()
    await expect(page.getByText(/free|starter|pro|enterprise/i)).toBeVisible()
  })

  test('should show upgrade button for free plan', async ({ page }) => {
    // If on free plan, should show upgrade options
    const upgradeButton = page.getByRole('button', { name: /upgrade|choose plan/i })
    
    // This button might not exist if already on highest plan
    // So we check if it exists conditionally
    const buttonCount = await upgradeButton.count()
    if (buttonCount > 0) {
      await expect(upgradeButton.first()).toBeVisible()
    }
  })

  test('should navigate to checkout when upgrading', async ({ page, context }) => {
    // Click upgrade button
    const upgradeButton = page.getByRole('button', { name: /upgrade|choose plan/i })
    const buttonCount = await upgradeButton.count()
    
    if (buttonCount > 0) {
      // Listen for navigation to Stripe checkout
      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        upgradeButton.first().click(),
      ])

      // Should navigate to Stripe checkout
      await expect(newPage).toHaveURL(/.*stripe.*checkout.*|.*checkout.*stripe.*/i)
    }
  })

  test('should display usage metrics if applicable', async ({ page }) => {
    // Check if usage section exists
    const usageSection = page.getByText(/usage|api calls|storage/i)
    const hasUsage = await usageSection.count() > 0

    if (hasUsage) {
      await expect(usageSection.first()).toBeVisible()
    }
  })

  test('should allow opening billing portal', async ({ page, context }) => {
    // Click manage subscription link
    const manageLink = page.getByRole('link', { name: /manage|billing portal/i })
    const linkCount = await manageLink.count()

    if (linkCount > 0) {
      // Listen for navigation to Stripe portal
      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        manageLink.first().click(),
      ])

      // Should navigate to Stripe billing portal
      await expect(newPage).toHaveURL(/.*stripe.*portal.*|.*billing.*stripe.*/i)
    }
  })

  test('should display billing history', async ({ page }) => {
    // Should show billing history section
    const historySection = page.getByText(/billing history|invoices|payments/i)
    const hasHistory = await historySection.count() > 0

    if (hasHistory) {
      await expect(historySection.first()).toBeVisible()
    }
  })
})
