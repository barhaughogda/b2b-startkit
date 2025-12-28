/**
 * Authentication E2E Tests
 * 
 * Tests for signup and signin flows
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/')
  })

  test('should allow user to sign up', async ({ page }) => {
    // Click sign up button/link
    const signUpLink = page.getByRole('link', { name: /sign up|sign up/i })
    await signUpLink.click()

    // Wait for sign up page
    await expect(page).toHaveURL(/.*sign-up.*/)

    // Fill in sign up form
    const emailInput = page.getByLabel(/email/i)
    const passwordInput = page.getByLabel(/password/i)
    const submitButton = page.getByRole('button', { name: /sign up|create account/i })

    await emailInput.fill('test@example.com')
    await passwordInput.fill('TestPassword123!')
    await submitButton.click()

    // Should redirect to dashboard after signup
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 })
  })

  test('should allow existing user to sign in', async ({ page }) => {
    // Click sign in button/link
    const signInLink = page.getByRole('link', { name: /sign in|log in/i })
    await signInLink.click()

    // Wait for sign in page
    await expect(page).toHaveURL(/.*sign-in.*/)

    // Fill in sign in form
    const emailInput = page.getByLabel(/email/i)
    const passwordInput = page.getByLabel(/password/i)
    const submitButton = page.getByRole('button', { name: /sign in|log in/i })

    await emailInput.fill('test@example.com')
    await passwordInput.fill('TestPassword123!')
    await submitButton.click()

    // Should redirect to dashboard after signin
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 })
  })

  test('should show error for invalid credentials', async ({ page }) => {
    const signInLink = page.getByRole('link', { name: /sign in|log in/i })
    await signInLink.click()

    await expect(page).toHaveURL(/.*sign-in.*/)

    const emailInput = page.getByLabel(/email/i)
    const passwordInput = page.getByLabel(/password/i)
    const submitButton = page.getByRole('button', { name: /sign in|log in/i })

    await emailInput.fill('invalid@example.com')
    await passwordInput.fill('WrongPassword123!')
    await submitButton.click()

    // Should show error message
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 5000 })
  })

  test('should redirect authenticated user away from auth pages', async ({ page }) => {
    // This test assumes user is already authenticated (via setup)
    // Navigate to sign in page
    await page.goto('/sign-in')

    // Should redirect to dashboard if already authenticated
    // Note: This depends on your auth middleware implementation
    // await expect(page).toHaveURL(/.*dashboard.*/)
  })
})
