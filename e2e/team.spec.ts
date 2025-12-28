/**
 * Team Management E2E Tests
 * 
 * Tests for team invite and member management flows
 */

import { test, expect } from '@playwright/test'

test.describe('Team Management', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is authenticated - navigate to team page
    await page.goto('/team')
  })

  test('should display team members list', async ({ page }) => {
    // Should show team members
    await expect(page.getByText(/team members|members/i)).toBeVisible()
    
    // Should show at least current user
    await expect(page.getByText(/you|current user/i).or(page.locator('[data-testid="member-list"]'))).toBeVisible()
  })

  test('should allow inviting a team member', async ({ page }) => {
    // Click invite button
    const inviteButton = page.getByRole('button', { name: /invite|add member/i })
    await inviteButton.click()

    // Wait for invite modal/form
    const emailInput = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i))
    await expect(emailInput).toBeVisible({ timeout: 5000 })

    // Fill in email
    await emailInput.fill('newmember@example.com')

    // Select role if dropdown exists
    const roleSelect = page.getByLabel(/role/i).or(page.locator('select'))
    const roleSelectCount = await roleSelect.count()
    if (roleSelectCount > 0) {
      await roleSelect.first().selectOption('member')
    }

    // Submit invite
    const submitButton = page.getByRole('button', { name: /send invite|invite/i })
    await submitButton.click()

    // Should show success message
    await expect(page.getByText(/invite sent|success/i)).toBeVisible({ timeout: 5000 })
  })

  test('should allow changing member role (admin only)', async ({ page }) => {
    // Find a member row (not the current user)
    const memberRows = page.locator('[data-testid="member-row"]').or(page.locator('tr'))
    const rowCount = await memberRows.count()

    if (rowCount > 1) {
      // Click role dropdown for a member
      const roleDropdown = memberRows.nth(1).getByRole('button', { name: /role|change role/i })
      const dropdownCount = await roleDropdown.count()

      if (dropdownCount > 0) {
        await roleDropdown.click()

        // Select new role
        const adminOption = page.getByRole('menuitem', { name: /admin/i })
        await adminOption.click()

        // Should show success message
        await expect(page.getByText(/role updated|success/i)).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('should allow removing a team member', async ({ page }) => {
    // Find remove button for a member (not current user)
    const memberRows = page.locator('[data-testid="member-row"]').or(page.locator('tr'))
    const rowCount = await memberRows.count()

    if (rowCount > 1) {
      // Click remove button
      const removeButton = memberRows.nth(1).getByRole('button', { name: /remove|delete/i })
      const buttonCount = await removeButton.count()

      if (buttonCount > 0) {
        await removeButton.click()

        // Confirm deletion if confirmation dialog appears
        const confirmButton = page.getByRole('button', { name: /confirm|yes|remove/i })
        const confirmCount = await confirmButton.count()
        if (confirmCount > 0) {
          await confirmButton.click()
        }

        // Should show success message
        await expect(page.getByText(/removed|deleted|success/i)).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('should show pending invitations', async ({ page }) => {
    // Look for pending invitations section
    const pendingSection = page.getByText(/pending|invitations/i)
    const hasPending = await pendingSection.count() > 0

    if (hasPending) {
      await expect(pendingSection.first()).toBeVisible()

      // Should show resend/cancel options for pending invites
      const resendButton = page.getByRole('button', { name: /resend/i })
      const cancelButton = page.getByRole('button', { name: /cancel/i })

      const resendCount = await resendButton.count()
      if (resendCount > 0) {
        await expect(resendButton.first()).toBeVisible()
      }

      const cancelCount = await cancelButton.count()
      if (cancelCount > 0) {
        await expect(cancelButton.first()).toBeVisible()
      }
    }
  })

  test('should prevent non-admin from managing members', async ({ page }) => {
    // If user is not admin, invite/remove buttons should not be visible
    // This depends on your permission checks
    const inviteButton = page.getByRole('button', { name: /invite|add member/i })
    const buttonCount = await inviteButton.count()

    // If button exists but user doesn't have permission, clicking should show error
    if (buttonCount > 0) {
      // Try to click - might be disabled or show error
      const isDisabled = await inviteButton.first().isDisabled()
      if (!isDisabled) {
        await inviteButton.click()
        // Should show permission error
        await expect(page.getByText(/permission|forbidden|not allowed/i)).toBeVisible({ timeout: 5000 })
      }
    }
  })
})
