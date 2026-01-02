import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import bcrypt from 'bcryptjs';

/**
 * Convex MFA Functions
 * 
 * Handles MFA operations in Convex backend:
 * - Storing encrypted TOTP secrets
 * - Verifying TOTP codes
 * - Managing backup codes (hashing and validation)
 * - Enabling/disabling MFA
 */

/**
 * Setup MFA for a user
 * Creates encrypted secret and hashed backup codes
 */
export const setupMFA = action({
  args: {
    userId: v.id("users"),
    encryptedSecret: v.string(), // JSON-encoded encrypted secret from client
    backupCodes: v.array(v.string()), // Plaintext backup codes (will be hashed)
  },
  handler: async (ctx, args) => {
    // Get user to verify they exist
    const user = await ctx.runQuery(api.users.getUser, { id: args.userId });
    if (!user) {
      throw new Error("User not found");
    }

    // Hash backup codes using bcrypt (one-way hash)
    const hashedBackupCodes = await Promise.all(
      args.backupCodes.map(code => bcrypt.hash(code, 12))
    );

    // Update user with MFA settings
    await ctx.runMutation(api.mfa.updateMFASettings, {
      userId: args.userId,
      mfaSettings: {
        enabled: true,
        method: "totp",
        secret: args.encryptedSecret, // Store encrypted secret as JSON string
        backupCodes: hashedBackupCodes,
        setupCompletedAt: Date.now(),
      },
    });

    // Log MFA setup in audit log
    await ctx.runMutation(api.auditLogs.create, {
      tenantId: user.tenantId || "",
      userId: args.userId,
      action: "mfa_enabled",
      resource: "user",
      resourceId: args.userId,
      details: {
        method: "totp",
        setupCompletedAt: Date.now(),
      },
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: "MFA setup completed successfully",
    };
  },
});

/**
 * Check and update rate limit for MFA verification attempts
 * Prevents brute force attacks on MFA codes
 */
export const checkMFAVerificationRateLimit = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const identifier = `mfa_verification:${args.userId}`;
    const action = "mfa_verification";
    const maxAttempts = 5; // Maximum 5 attempts
    const windowMs = 15 * 60 * 1000; // 15 minutes window
    
    // Find existing rate limit record
    const existingLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier_action", (q) =>
        q.eq("identifier", identifier).eq("action", action)
      )
      .first();
    
    if (existingLimit) {
      // Check if window has expired
      const windowExpired = now - existingLimit.windowStart >= windowMs;
      
      if (windowExpired) {
        // Reset the window
        await ctx.db.patch(existingLimit._id, {
          attempts: 1,
          windowStart: now,
          updatedAt: now,
        });
        return { allowed: true, remaining: maxAttempts - 1 };
      } else {
        // Check if limit exceeded
        if (existingLimit.attempts >= maxAttempts) {
          const resetTime = existingLimit.windowStart + windowMs;
          const waitTime = Math.ceil((resetTime - now) / 1000 / 60); // minutes
          throw new Error(`Too many MFA verification attempts. Please try again in ${waitTime} minute(s).`);
        }
        
        // Increment attempts
        await ctx.db.patch(existingLimit._id, {
          attempts: existingLimit.attempts + 1,
          updatedAt: now,
        });
        return { allowed: true, remaining: maxAttempts - existingLimit.attempts - 1 };
      }
    } else {
      // Create new rate limit record
      await ctx.db.insert("rateLimits", {
        identifier,
        action,
        attempts: 1,
        windowStart: now,
        windowMs,
        maxAttempts,
        createdAt: now,
        updatedAt: now,
      });
      return { allowed: true, remaining: maxAttempts - 1 };
    }
  },
});

/**
 * Reset rate limit on successful MFA verification
 */
export const resetMFAVerificationRateLimit = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identifier = `mfa_verification:${args.userId}`;
    const action = "mfa_verification";
    
    const existingLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier_action", (q) =>
        q.eq("identifier", identifier).eq("action", action)
      )
      .first();
    
    if (existingLimit) {
      await ctx.db.delete(existingLimit._id);
    }
  },
});

/**
 * Verify TOTP code for a user
 * Client should verify the code first, then call this to update lastVerifiedAt
 * Note: For security, the actual TOTP verification happens on the client side
 * after decrypting the secret. This function updates the verification timestamp.
 * 
 * Rate limiting is enforced to prevent brute force attacks.
 */
export const confirmTOTPVerification = action({
  args: {
    userId: v.id("users"),
    code: v.string(), // 6-digit TOTP code (for audit logging)
  },
  handler: async (ctx, args) => {
    // Check rate limit first
    await ctx.runMutation(api.mfa.checkMFAVerificationRateLimit, {
      userId: args.userId,
    });

    // Get user and MFA settings
    const user = await ctx.runQuery(api.users.getUser, { id: args.userId });
    if (!user || !user.mfaSettings?.enabled) {
      throw new Error("MFA not enabled for this user");
    }

    // Update lastVerifiedAt timestamp
    await ctx.runMutation(api.mfa.updateMFASettings, {
      userId: args.userId,
      mfaSettings: {
        ...user.mfaSettings,
        lastVerifiedAt: Date.now(),
      },
    });

    // Reset rate limit on successful verification
    await ctx.runMutation(api.mfa.resetMFAVerificationRateLimit, {
      userId: args.userId,
    });

    // Log successful verification
    await ctx.runMutation(api.auditLogs.create, {
      tenantId: user.tenantId || "",
      userId: args.userId,
      action: "mfa_verified",
      resource: "user",
      resourceId: args.userId,
      details: {
        method: user.mfaSettings.method || "totp",
        verifiedAt: Date.now(),
      },
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: "TOTP code verified successfully",
    };
  },
});

/**
 * Verify backup code for a user
 * Checks hashed backup codes and removes used code
 */
export const verifyBackupCode = action({
  args: {
    userId: v.id("users"),
    code: v.string(), // Backup code (plaintext)
  },
  handler: async (ctx, args) => {
    // Get user and MFA settings
    const user = await ctx.runQuery(api.users.getUser, { id: args.userId });
    if (!user || !user.mfaSettings?.enabled) {
      throw new Error("MFA not enabled for this user");
    }

    if (!user.mfaSettings.backupCodes || user.mfaSettings.backupCodes.length === 0) {
      throw new Error("No backup codes available");
    }

    // Check each hashed backup code
    let isValid = false;
    let usedCodeIndex = -1;

    for (let i = 0; i < user.mfaSettings.backupCodes.length; i++) {
      const hashedCode = user.mfaSettings.backupCodes[i];
      if (!hashedCode) continue;
      const matches = await bcrypt.compare(args.code, hashedCode);
      
      if (matches) {
        isValid = true;
        usedCodeIndex = i;
        break;
      }
    }

    if (!isValid) {
      // Log failed backup code attempt
      await ctx.runMutation(api.auditLogs.create, {
        tenantId: user.tenantId || "",
        userId: args.userId,
        action: "mfa_backup_code_failed",
        resource: "user",
        resourceId: args.userId,
        details: {
          attemptedAt: Date.now(),
        },
        timestamp: Date.now(),
      });

      throw new Error("Invalid backup code");
    }

    // Remove used backup code
    const updatedBackupCodes: string[] = user.mfaSettings.backupCodes.filter(
      (_: string, index: number) => index !== usedCodeIndex
    );

    // Update user with remaining backup codes
    await ctx.runMutation(api.mfa.updateMFASettings, {
      userId: args.userId,
      mfaSettings: {
        ...user.mfaSettings,
        backupCodes: updatedBackupCodes,
        lastVerifiedAt: Date.now(),
      },
    });

    // Log successful backup code usage
    await ctx.runMutation(api.auditLogs.create, {
      tenantId: user.tenantId || "",
      userId: args.userId,
      action: "mfa_backup_code_used",
      resource: "user",
      resourceId: args.userId,
      details: {
        usedAt: Date.now(),
        remainingCodes: updatedBackupCodes.length,
      },
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: "Backup code verified successfully",
      remainingCodes: updatedBackupCodes.length,
    };
  },
});

/**
 * Disable MFA for a user
 * Removes MFA settings and logs the action
 */
export const disableMFA = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get user to verify they exist
    const user = await ctx.runQuery(api.users.getUser, { id: args.userId });
    if (!user) {
      throw new Error("User not found");
    }

    // Remove MFA settings
    await ctx.runMutation(api.mfa.updateMFASettings, {
      userId: args.userId,
      mfaSettings: undefined, // Remove MFA settings
    });

    // Log MFA disable
    await ctx.runMutation(api.auditLogs.create, {
      tenantId: user.tenantId || "",
      userId: args.userId,
      action: "mfa_disabled",
      resource: "user",
      resourceId: args.userId,
      details: {
        disabledAt: Date.now(),
      },
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: "MFA disabled successfully",
    };
  },
});

/**
 * Regenerate backup codes for a user
 * Generates new backup codes and replaces old ones
 */
export const regenerateBackupCodes = action({
  args: {
    userId: v.id("users"),
    newBackupCodes: v.array(v.string()), // Plaintext backup codes (will be hashed)
  },
  handler: async (ctx, args) => {
    // Get user to verify they exist and MFA is enabled
    const user = await ctx.runQuery(api.users.getUser, { id: args.userId });
    if (!user || !user.mfaSettings?.enabled) {
      throw new Error("MFA not enabled for this user");
    }

    // Hash new backup codes
    const hashedBackupCodes = await Promise.all(
      args.newBackupCodes.map(code => bcrypt.hash(code, 12))
    );

    // Update user with new backup codes
    await ctx.runMutation(api.mfa.updateMFASettings, {
      userId: args.userId,
      mfaSettings: {
        ...user.mfaSettings,
        backupCodes: hashedBackupCodes,
      },
    });

    // Log backup code regeneration
    await ctx.runMutation(api.auditLogs.create, {
      tenantId: user.tenantId || "",
      userId: args.userId,
      action: "mfa_backup_codes_regenerated",
      resource: "user",
      resourceId: args.userId,
      details: {
        regeneratedAt: Date.now(),
        codeCount: hashedBackupCodes.length,
      },
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: "Backup codes regenerated successfully",
    };
  },
});

/**
 * Get MFA status for a user
 */
export const getMFAStatus = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ enabled: boolean; method?: string; setupCompletedAt?: number; lastVerifiedAt?: number; backupCodesCount: number }> => {
    const user: any = await ctx.runQuery(api.users.getUser, { id: args.userId });
    if (!user) {
      throw new Error("User not found");
    }

    return {
      enabled: user.mfaSettings?.enabled || false,
      method: user.mfaSettings?.method,
      setupCompletedAt: user.mfaSettings?.setupCompletedAt,
      lastVerifiedAt: user.mfaSettings?.lastVerifiedAt,
      backupCodesCount: user.mfaSettings?.backupCodes?.length || 0,
    };
  },
});

/**
 * Internal mutation to update MFA settings
 * Called by actions, not directly by clients
 */
export const updateMFASettings = mutation({
  args: {
    userId: v.id("users"),
    mfaSettings: v.optional(v.object({
      enabled: v.boolean(),
      method: v.optional(v.union(v.literal("totp"), v.literal("sms"))),
      secret: v.optional(v.string()),
      backupCodes: v.optional(v.array(v.string())),
      setupCompletedAt: v.optional(v.number()),
      lastVerifiedAt: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      mfaSettings: args.mfaSettings,
      updatedAt: Date.now(),
    });
  },
});

