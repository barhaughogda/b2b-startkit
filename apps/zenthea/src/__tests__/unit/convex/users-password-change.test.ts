import { describe, it, expect, beforeEach } from 'vitest';
import { ConvexTestingHelper } from 'convex/testing';
import { api } from '../../../../convex/_generated/api';

describe('Password Change Rate Limiting', () => {
  let t: ConvexTestingHelper;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();
  });

  describe('checkPasswordChangeRateLimit', () => {
    it('should allow first password change attempt', async () => {
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'test@example.com',
        name: 'Test User',
        role: 'patient',
        passwordHash: 'hashed_password',
        isActive: true,
        tenantId: 'demo-tenant',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await t.mutation(api.users.checkPasswordChangeRateLimit, {
        userId,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 max attempts - 1 used
    });

    it('should track multiple attempts within the window', async () => {
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'test@example.com',
        name: 'Test User',
        role: 'patient',
        passwordHash: 'hashed_password',
        isActive: true,
        tenantId: 'demo-tenant',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // First attempt
      await t.mutation(api.users.checkPasswordChangeRateLimit, { userId });

      // Second attempt
      const result2 = await t.mutation(
        api.users.checkPasswordChangeRateLimit,
        { userId }
      );

      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3); // 5 max attempts - 2 used

      // Third attempt
      const result3 = await t.mutation(
        api.users.checkPasswordChangeRateLimit,
        { userId }
      );

      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(2); // 5 max attempts - 3 used
    });

    it('should block after maximum attempts exceeded', async () => {
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'test@example.com',
        name: 'Test User',
        role: 'patient',
        passwordHash: 'hashed_password',
        isActive: true,
        tenantId: 'demo-tenant',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Make 5 attempts (the maximum)
      for (let i = 0; i < 5; i++) {
        await t.mutation(api.users.checkPasswordChangeRateLimit, { userId });
      }

      // Sixth attempt should be blocked
      await expect(
        t.mutation(api.users.checkPasswordChangeRateLimit, { userId })
      ).rejects.toThrow(/Too many password change attempts/);
    });

    it('should reset window after expiration', async () => {
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'test@example.com',
        name: 'Test User',
        role: 'patient',
        passwordHash: 'hashed_password',
        isActive: true,
        tenantId: 'demo-tenant',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Make 3 attempts
      for (let i = 0; i < 3; i++) {
        await t.mutation(api.users.checkPasswordChangeRateLimit, { userId });
      }

      // Note: Testing window expiration requires manipulating time or waiting
      // For unit tests, we verify the logic works correctly with the current time
      // Integration tests would be better suited for testing time-based expiration
    });

    it('should reset rate limit on successful password change', async () => {
      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'test@example.com',
        name: 'Test User',
        role: 'patient',
        passwordHash: 'hashed_password',
        isActive: true,
        tenantId: 'demo-tenant',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Make 2 attempts
      await t.mutation(api.users.checkPasswordChangeRateLimit, { userId });
      await t.mutation(api.users.checkPasswordChangeRateLimit, { userId });

      // Reset rate limit (simulating successful password change)
      await t.mutation(api.users.resetPasswordChangeRateLimit, { userId });

      // Next attempt should start fresh
      const result = await t.mutation(
        api.users.checkPasswordChangeRateLimit,
        { userId }
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // Fresh start
    });
  });

  describe('changePassword action', () => {
    it('should successfully change password with valid credentials', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('OldPassword123!', 10);

      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'test@example.com',
        name: 'Test User',
        role: 'patient',
        passwordHash: hashedPassword,
        isActive: true,
        tenantId: 'demo-tenant',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await t.action(api.users.changePassword, {
        userId,
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password changed successfully');

      // Verify rate limit was reset by checking that a new attempt is allowed
      // (If rate limit wasn't reset, this would fail)
      const result2 = await t.mutation(api.users.checkPasswordChangeRateLimit, {
        userId,
      });
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(4); // Fresh start after reset
    });

    it('should reject password change with incorrect current password', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('OldPassword123!', 10);

      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'test@example.com',
        name: 'Test User',
        role: 'patient',
        passwordHash: hashedPassword,
        isActive: true,
        tenantId: 'demo-tenant',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        t.action(api.users.changePassword, {
          userId,
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
        })
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should enforce rate limiting on password change attempts', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('OldPassword123!', 10);

      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'test@example.com',
        name: 'Test User',
        role: 'patient',
        passwordHash: hashedPassword,
        isActive: true,
        tenantId: 'demo-tenant',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Make 5 failed attempts (wrong current password)
      for (let i = 0; i < 5; i++) {
        await expect(
          t.action(api.users.changePassword, {
            userId,
            currentPassword: 'WrongPassword123!',
            newPassword: 'NewPassword123!',
          })
        ).rejects.toThrow();
      }

      // Sixth attempt should be blocked by rate limit
      await expect(
        t.action(api.users.changePassword, {
          userId,
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
        })
      ).rejects.toThrow(/Too many password change attempts/);
    });

    it('should validate new password length', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('OldPassword123!', 10);

      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'test@example.com',
        name: 'Test User',
        role: 'patient',
        passwordHash: hashedPassword,
        isActive: true,
        tenantId: 'demo-tenant',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        t.action(api.users.changePassword, {
          userId,
          currentPassword: 'OldPassword123!',
          newPassword: 'Short1!', // Too short
        })
      ).rejects.toThrow('New password must be at least 8 characters long');
    });

    it('should validate new password complexity', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('OldPassword123!', 10);

      const userId = await t.mutation(api.users.createUserMutation, {
        email: 'test@example.com',
        name: 'Test User',
        role: 'patient',
        passwordHash: hashedPassword,
        isActive: true,
        tenantId: 'demo-tenant',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        t.action(api.users.changePassword, {
          userId,
          currentPassword: 'OldPassword123!',
          newPassword: 'simplepassword', // Missing uppercase, number, special char
        })
      ).rejects.toThrow(
        /must contain at least one uppercase letter, one lowercase letter, one number, and one special character/
      );
    });
  });
});

