import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Create a new user with authentication
export const createUser = action({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
    role: v.union(
      v.literal("admin"), 
      v.literal("provider"), 
      v.literal("clinic_user"), // New unified clinic role (replaces admin/provider in Phase 4)
      v.literal("demo"), 
      v.literal("super_admin")
    ),
    tenantId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; userId?: string; message: string }> => {
    // Check if user already exists
    const existingUser = await ctx.runQuery(api.users.getUserByEmail, {
      email: args.email,
      tenantId: args.tenantId,
    });
    
    if (existingUser) {
      throw new Error("User already exists");
    }
    
    // Hash password (in production, use proper password hashing)
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(args.password, 10);
    
    const now = Date.now();
    const userId = await ctx.runMutation(api.users.createUserMutation, {
      email: args.email,
      name: args.name,
      role: args.role,
      passwordHash,
      isActive: true,
      tenantId: args.tenantId,
      createdAt: now,
      updatedAt: now,
    });
    
    return {
      success: true,
      userId,
      message: "User created successfully"
    };
  },
});

// Internal mutation for creating user (called by action)
export const createUserMutation = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("admin"), 
      v.literal("provider"), 
      v.literal("clinic_user"), // New unified clinic role (replaces admin/provider in Phase 4)
      v.literal("demo"), 
      v.literal("super_admin")
    ),
    passwordHash: v.string(),
    isActive: v.boolean(),
    tenantId: v.optional(v.string()),
    isOwner: v.optional(v.boolean()), // Clinic ownership flag
    departments: v.optional(v.array(v.string())), // Array of department IDs
    customRoleId: v.optional(v.id("customRoles")), // Reference to custom role
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", args);
  },
});

// Authenticate user with email and password
export const authenticateUser = action({
  args: { 
    email: v.string(), 
    password: v.string(),
    tenantId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; user?: any; message: string }> => {
    let user: any = null;
    
    // If tenantId is provided (including empty string), search specifically for that tenant
    // Use !== undefined to distinguish between undefined (not provided) and "" (empty string tenant)
    if (args.tenantId !== undefined) {
      user = await ctx.runQuery(api.users.getUserByEmail, {
        email: args.email,
        tenantId: args.tenantId,
      });
      
      // If not found with provided tenantId and tenantId is not empty string, try with empty string as fallback
      if (!user && args.tenantId !== "") {
        user = await ctx.runQuery(api.users.getUserByEmail, {
          email: args.email,
          tenantId: "",
        });
      }
    } else {
      // No tenantId provided - prioritize superadmin users first
      // Search across all possible tenant IDs, prioritizing superadmin matches
      const commonTenants = ["", "demo-tenant", "demo-tenant-2"];
      let superadminUser: any = null;
      let regularUser: any = null;
      
      for (const tenantId of commonTenants) {
        const foundUser = await ctx.runQuery(api.users.getUserByEmail, {
          email: args.email,
          tenantId: tenantId,
        });
        
        if (foundUser) {
          // Prioritize superadmin users
          if (foundUser.role === "super_admin") {
            superadminUser = foundUser;
            // Found superadmin - this is the one we want, stop searching
            break;
          } else if (!regularUser) {
            // Keep first non-superadmin user found as fallback
            regularUser = foundUser;
          }
        }
      }
      
      // Use superadmin if found, otherwise use regular user
      user = superadminUser || regularUser;
    }
    
    if (!user) {
      console.error(`[authenticateUser] User not found: ${args.email}, tenantId: ${args.tenantId || 'undefined'}`);
      throw new Error("Invalid credentials");
    }
    
    if (!user.isActive) {
      console.error(`[authenticateUser] User inactive: ${args.email}, userId: ${user._id}`);
      throw new Error("Invalid credentials");
    }
    
    // Check if account is locked
    const lockoutStatus = await ctx.runAction(api.users.checkAccountLockout, {
      userId: user._id,
    });
    
    if (lockoutStatus.isLocked) {
      const minutesRemaining = Math.ceil((lockoutStatus.lockedUntil! - Date.now()) / (60 * 1000));
      throw new Error(`ACCOUNT_LOCKED:${minutesRemaining}`);
    }
    
    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare(args.password, user.passwordHash);
    
    if (!isValid) {
      // Increment failed login attempts
      await ctx.runAction(api.users.incrementFailedLoginAttempts, {
        userId: user._id,
      });
      throw new Error("Invalid credentials");
    }
    
    // Reset failed attempts on successful login
    await ctx.runMutation(api.users.resetFailedLoginAttempts, { userId: user._id });
    
    // Update last login
    await ctx.runMutation(api.users.updateUserLastLogin, { userId: user._id });
    
    // Fetch permissions from custom role if user has one
    let permissions: any = undefined;
    if (user.customRoleId) {
      try {
        const customRole = await ctx.runQuery(api.users.getCustomRole, {
          id: user.customRoleId,
        });
        if (customRole) {
          permissions = customRole.permissions;
        }
      } catch (error) {
        // If custom role not found or error, permissions will remain undefined
        // This is acceptable - permissions can be fetched later if needed
        console.warn(`Could not fetch permissions for custom role ${user.customRoleId}:`, error);
      }
    }
    
    // Check password expiration status
    let passwordExpiration: any = null;
    try {
      passwordExpiration = await ctx.runAction(api.users.checkPasswordExpiration, {
        userId: user._id,
      });
    } catch (error) {
      // If password expiration check fails, log but don't block authentication
      // This allows authentication to proceed even if tenant settings are misconfigured
      console.warn(`Could not check password expiration for user ${user._id}:`, error);
    }
    
    // Generate unique session ID
    // Use Web Crypto API to generate a secure random session ID
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for environments without crypto (shouldn't happen in Convex)
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    const sessionId = Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Enforce concurrent session limit before creating new session
    // This will terminate the oldest session if limit is exceeded
    try {
      await ctx.runAction(api.sessions.enforceSessionLimit, {
        userId: user._id,
        tenantId: user.tenantId || "",
      });
    } catch (error) {
      // If session limit enforcement fails, log but don't block authentication
      // This allows authentication to proceed even if session management has issues
      console.warn(`Could not enforce session limit for user ${user._id}:`, error);
    }
    
    // Fetch session timeout configuration to set expiresAt
    // CRITICAL: Always set expiresAt to ensure sessions can be cleaned up properly
    // If session timeout is disabled or config fetch fails, use a very long expiration (1 year)
    // This ensures cleanupExpiredSessions can find and clean up all sessions
    let expiresAt: number | undefined = undefined;
    const now = Date.now();
    const DEFAULT_TIMEOUT_MINUTES = 30; // Default 30 minutes if config fetch fails
    const DISABLED_TIMEOUT_MS = 365 * 24 * 60 * 60 * 1000; // 1 year for disabled timeout (allows cleanup)
    
    try {
      const sessionTimeoutConfig = await ctx.runQuery(api.clinic.sessionTimeout.getSessionTimeoutConfig, {
        tenantId: user.tenantId || "",
      });
      
      if (sessionTimeoutConfig.enabled && sessionTimeoutConfig.timeout) {
        // Session timeout is enabled - calculate expiration time
        expiresAt = now + (sessionTimeoutConfig.timeout * 60 * 1000);
      } else {
        // Session timeout is disabled - set very long expiration (1 year) so sessions can still be cleaned up
        // This prevents unbounded growth of the sessions table
        expiresAt = now + DISABLED_TIMEOUT_MS;
      }
    } catch (error) {
      // If session timeout config fetch fails, use default timeout to ensure sessions expire
      // This prevents sessions from being created without expiration times
      console.warn(`Could not fetch session timeout config for tenant ${user.tenantId || ""}:`, error);
      expiresAt = now + (DEFAULT_TIMEOUT_MINUTES * 60 * 1000);
    }
    
    // Create new session record
    // Note: IP address and user agent should be passed from the API route if available
    // For now, we'll create the session without them (they can be updated later)
    try {
      await ctx.runMutation(api.sessions.createSession, {
        userId: user._id,
        sessionId: sessionId,
        tenantId: user.tenantId || "",
        expiresAt: expiresAt, // Always set - prevents unbounded session table growth
        // IP address and user agent should be passed from the API route
        // They're optional, so we can omit them here
      });
    } catch (error) {
      // If session creation fails, log but don't block authentication
      // This allows authentication to proceed even if session tracking has issues
      console.warn(`Could not create session for user ${user._id}:`, error);
    }
    
    return {
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        isOwner: user.isOwner ?? false,
        departments: user.departments ?? [],
        permissions: permissions,
        mfaEnabled: user.mfaSettings?.enabled || false,
        mfaMethod: user.mfaSettings?.method,
        passwordExpired: passwordExpiration?.expired || false,
        passwordExpiration: passwordExpiration,
        sessionId: sessionId, // Include session ID in response for potential use in JWT token
      },
      message: "Authentication successful"
    };
  },
});

// Internal mutation for updating last login
export const updateUserLastLogin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.userId, { lastLogin: Date.now() });
  },
});

// Update user timezone (for personal timezone preferences - remote work, etc.)
export const updateUserTimezone = mutation({
  args: {
    userId: v.id("users"),
    timezone: v.union(v.string(), v.null()), // IANA timezone (e.g., "America/New_York") or null to inherit from clinic/company
  },
  handler: async (ctx, args) => {
    const { userId, timezone } = args;
    return await ctx.db.patch(userId, {
      timezone: timezone ?? undefined, // Convert null to undefined for Convex
      updatedAt: Date.now(),
    });
  },
});

// Get user by email and tenant
export const getUserByEmail = query({
  args: { 
    email: v.string(),
    tenantId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email_tenant", (q) => 
        q.eq("email", args.email).eq("tenantId", args.tenantId || "")
      )
      .first();
  },
});

// Get user by ID
export const getUser = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get user by ID (alias for consistency with other functions)
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get all users by tenant ID
// CRITICAL: This query must enforce tenant isolation - users can only see users from their own tenant
export const getUsersByTenant = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    // Query using the tenant index
    const users = await ctx.db
      .query("users")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    
    // Defensive filter: Double-check that all users belong to the specified tenant
    // This prevents any edge cases where users might have incorrect tenantId values
    return users.filter(user => user.tenantId === args.tenantId);
  },
});

// Get custom role by ID
export const getCustomRole = query({
  args: { id: v.id("customRoles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update user
export const updateUser = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.union(
      v.literal("admin"), 
      v.literal("provider"), 
      v.literal("clinic_user"), // New unified clinic role (replaces admin/provider in Phase 4)
      v.literal("demo"), 
      v.literal("super_admin")
    )),
    isActive: v.optional(v.boolean()),
    password: v.optional(v.string()),
    timezone: v.optional(v.union(v.string(), v.null())), // User's personal timezone (IANA format). Null to inherit from clinic/company.
  },
  handler: async (ctx, args) => {
    const { id, password, ...updates } = args;
    const patchData: any = {
      ...updates,
      updatedAt: Date.now(),
    };
    
    // Hash new password if provided
    if (password) {
      const bcrypt = require('bcryptjs');
      patchData.passwordHash = await bcrypt.hash(password, 10);
      // Update lastPasswordChange timestamp when password is changed
      patchData.lastPasswordChange = Date.now();
    }
    
    return await ctx.db.patch(id, patchData);
  },
});

// Update user mutation (comprehensive version for clinic user management)
// Supports all user fields including isOwner, departments, customRoleId, email, and user identity fields
export const updateUserMutation = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    isOwner: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    departments: v.optional(v.array(v.string())),
    customRoleId: v.optional(v.union(v.id("customRoles"), v.null())), // Allow null to clear the field
    lastPasswordChange: v.optional(v.number()), // Timestamp of last password change
    passwordHistory: v.optional(v.array(v.object({
      hash: v.string(),
      changedAt: v.number(),
    }))), // Password history array
    failedLoginAttempts: v.optional(v.number()), // Number of consecutive failed login attempts
    accountLockedUntil: v.optional(v.union(v.number(), v.null())), // Timestamp when account lockout expires (null to unlock)
    lastFailedLoginAttempt: v.optional(v.union(v.number(), v.null())), // Timestamp of last failed login attempt
    timezone: v.optional(v.union(v.string(), v.null())), // User's personal timezone (IANA format). Null to inherit from clinic/company.
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, updatedAt, ...updates } = args;
    const patchData: any = {
      ...updates,
      updatedAt: updatedAt || Date.now(),
    };
    
    return await ctx.db.patch(id, patchData);
  },
});

// Check and update rate limit for password change attempts
export const checkPasswordChangeRateLimit = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const identifier = `password_change:${args.userId}`;
    const action = "password_change";
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
          throw new Error(`Too many password change attempts. Please try again in ${waitTime} minute(s).`);
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

// Reset rate limit on successful password change
export const resetPasswordChangeRateLimit = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identifier = `password_change:${args.userId}`;
    const action = "password_change";
    
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

// Check if password is in user's password history
export const checkPasswordInHistory = action({
  args: {
    userId: v.id("users"),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{ inHistory: boolean; reason?: string }> => {
    // Get user to access password history
    const user: any = await ctx.runQuery(api.users.getUser, { id: args.userId });
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Get tenant settings to check if password history is enabled
    if (!user.tenantId) {
      // No tenant, password history check disabled
      return { inHistory: false };
    }
    
    const tenantSettings: any = await ctx.runQuery(api.tenants.getTenantSettings, {
      tenantId: user.tenantId,
    });
    
    const passwordHistoryLength: number = tenantSettings.settings.passwordHistoryLength || 5;
    
    // If password history length is 0 or negative, disable history checking
    if (passwordHistoryLength <= 0) {
      return { inHistory: false };
    }
    
    // Get password history (empty array if not set)
    const passwordHistory: any[] = user.passwordHistory || [];
    
    // Check against current password hash
    const bcrypt = require('bcryptjs');
    const currentPasswordMatches: boolean = await bcrypt.compare(args.password, user.passwordHash);
    if (currentPasswordMatches) {
      return { inHistory: true, reason: "Password matches current password" };
    }
    
    // Check against password history
    for (const historyEntry of passwordHistory) {
      const matches = await bcrypt.compare(args.password, historyEntry.hash);
      if (matches) {
        return { 
          inHistory: true, 
          reason: `Password was used ${new Date(historyEntry.changedAt).toLocaleDateString()}` 
        };
      }
    }
    
    return { inHistory: false };
  },
});

// Change password with current password verification
export const changePassword = action({
  args: {
    userId: v.id("users"),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Check rate limit first
    await ctx.runMutation(api.users.checkPasswordChangeRateLimit, {
      userId: args.userId,
    });
    
    // Get user to verify current password
    const user = await ctx.runQuery(api.users.getUser, { id: args.userId });
    
    if (!user || !user.isActive) {
      throw new Error("User not found or inactive");
    }
    
    // Verify current password
    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare(args.currentPassword, user.passwordHash);
    
    if (!isValid) {
      // Rate limit is already incremented, just throw error
      throw new Error("Current password is incorrect");
    }
    
    // Validate new password length
    if (args.newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters long");
    }

    // Validate password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(args.newPassword)) {
      throw new Error("New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)");
    }
    
    // Check if new password is in password history
    const historyCheck = await ctx.runAction(api.users.checkPasswordInHistory, {
      userId: args.userId,
      password: args.newPassword,
    });
    
    if (historyCheck.inHistory) {
      throw new Error(`Password cannot be reused. ${historyCheck.reason || "This password was used recently."}`);
    }
    
    // Get tenant settings to determine password history length
    let passwordHistoryLength = 5; // Default
    if (user.tenantId) {
      try {
        const tenantSettings = await ctx.runQuery(api.tenants.getTenantSettings, {
          tenantId: user.tenantId,
        });
        passwordHistoryLength = tenantSettings.settings.passwordHistoryLength || 5;
      } catch (error) {
        // If tenant not found, use default
        console.warn("Tenant not found, using default password history length");
      }
    }
    
    // Get current password history (empty array if not set)
    const currentPasswordHistory = user.passwordHistory || [];
    
    // Add current password hash to history before changing
    const newPasswordHistory = [
      {
        hash: user.passwordHash, // Current password hash
        changedAt: user.lastPasswordChange || Date.now(), // Use lastPasswordChange timestamp or current time
      },
      ...currentPasswordHistory, // Prepend to keep most recent first
    ];
    
    // Trim history to configured length (only if password history is enabled)
    const trimmedPasswordHistory = passwordHistoryLength > 0 
      ? newPasswordHistory.slice(0, passwordHistoryLength)
      : [];
    
    // Update password (updateUser mutation will hash it)
    await ctx.runMutation(api.users.updateUser, {
      id: args.userId,
      password: args.newPassword,
    });
    
    // Update lastPasswordChange timestamp and password history
    await ctx.runMutation(api.users.updateUserMutation, {
      id: args.userId,
      lastPasswordChange: Date.now(),
      passwordHistory: trimmedPasswordHistory,
    });
    
    // Reset rate limit on successful password change
    await ctx.runMutation(api.users.resetPasswordChangeRateLimit, {
      userId: args.userId,
    });
    
    return {
      success: true,
      message: "Password changed successfully"
    };
  },
});

// Delete user
export const deleteUser = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// Create a new patient user
export const createPatientUser = action({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    dateOfBirth: v.string(),
    password: v.string(),
    tenantId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; userId?: string; message: string }> => {
    // Check if user already exists
    const existingUser = await ctx.runQuery(api.users.getUserByEmail, {
      email: args.email,
      tenantId: args.tenantId || '',
    });
    
    if (existingUser) {
      return {
        success: false,
        message: "An account with this email already exists"
      };
    }
    
    // Hash password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(args.password, 10);
    
    const now = Date.now();
    const fullName = `${args.firstName} ${args.lastName}`;
    
    const userId = await ctx.runMutation(api.users.createPatientUserMutation, {
      email: args.email,
      name: fullName,
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone,
      dateOfBirth: args.dateOfBirth,
      role: "patient",
      passwordHash,
      isActive: true,
      tenantId: args.tenantId || '',
      createdAt: now,
      updatedAt: now,
    });
    
    return {
      success: true,
      userId,
      message: "Patient account created successfully"
    };
  },
});

// Internal mutation for creating patient user
export const createPatientUserMutation = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    dateOfBirth: v.string(),
    role: v.literal("patient"),
    passwordHash: v.string(),
    isActive: v.boolean(),
    tenantId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", args);
  },
});

// List all users
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// ============================================================================
// Migration Functions - Task 4.1.2: Admin to Clinic User Migration
// ============================================================================

/**
 * Get all admin users (for migration purposes)
 * Optionally filtered by tenantId
 */
export const getAdminUsers = query({
  args: {
    tenantId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let users;
    
    if (args.tenantId !== undefined) {
      // Filter by tenant if provided
      users = await ctx.db
        .query("users")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId || ""))
        .collect();
    } else {
      // Get all users
      users = await ctx.db.query("users").collect();
    }
    
    // Filter to only admin users
    return users.filter((user) => user.role === "admin" && user.isActive);
  },
});

/**
 * Migrate a single admin user to clinic_user with isOwner=true
 * This is idempotent - safe to run multiple times
 */
export const migrateAdminUser = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ 
    success: boolean; 
    message: string;
    userId: string;
    email: string;
    oldRole: string;
    newRole: string;
    isOwner: boolean;
  }> => {
    // Get the user
    const user = await ctx.runQuery(api.users.getUser, { id: args.userId });
    
    if (!user) {
      throw new Error(`User with ID ${args.userId} not found`);
    }
    
    // Store old role for logging
    const oldRole = user.role;
    
    // Check if already migrated (idempotent check - must come before admin check)
    if (user.role === "clinic_user" && user.isOwner === true) {
      return {
        success: true,
        message: `User ${user.email} already migrated`,
        userId: user._id,
        email: user.email,
        oldRole: oldRole,
        newRole: "clinic_user",
        isOwner: true,
      };
    }
    
    // Verify user is an admin (only if not already migrated)
    if (user.role !== "admin") {
      throw new Error(`User ${user.email} is not an admin (current role: ${user.role}). Only admin users can be migrated using this function.`);
    }
    
    // Update user to clinic_user with isOwner=true
    await ctx.runMutation(api.users.migrateAdminUserMutation, {
      userId: args.userId,
      role: "clinic_user",
      isOwner: true,
    });
    
    return {
      success: true,
      message: `Successfully migrated admin user ${user.email} to clinic_user with isOwner=true`,
      userId: user._id,
      email: user.email,
      oldRole: oldRole,
      newRole: "clinic_user",
      isOwner: true,
    };
  },
});

/**
 * Internal mutation to update user role and isOwner flag
 * Used by migrateAdminUser action
 */
export const migrateAdminUserMutation = mutation({
  args: {
    userId: v.id("users"),
    role: v.literal("clinic_user"),
    isOwner: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.userId, {
      role: args.role,
      isOwner: args.isOwner,
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// Migration Functions - Task 4.1.3: Provider to Clinic User Migration
// ============================================================================

/**
 * Get all provider users (for migration purposes)
 * Optionally filtered by tenantId
 */
export const getProviderUsers = query({
  args: {
    tenantId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let users;
    
    if (args.tenantId !== undefined) {
      // Filter by tenant if provided
      users = await ctx.db
        .query("users")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId || ""))
        .collect();
    } else {
      // Get all users
      users = await ctx.db.query("users").collect();
    }
    
    // Filter to only provider users
    return users.filter((user) => user.role === "provider" && user.isActive);
  },
});

/**
 * Get all clinic_user users (for migration purposes)
 * Optionally filtered by tenantId
 */
export const getClinicUsers = query({
  args: {
    tenantId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let users;
    
    if (args.tenantId !== undefined) {
      // Filter by tenant if provided
      users = await ctx.db
        .query("users")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId || ""))
        .collect();
    } else {
      // Get all users
      users = await ctx.db.query("users").collect();
    }
    
    // Filter to only clinic_user users
    return users.filter((user) => user.role === "clinic_user" && user.isActive);
  },
});

/**
 * Migrate a single provider user to clinic_user with isOwner=false
 * This is idempotent - safe to run multiple times
 * 
 * Note: Provider-level permissions will be assigned in Task 4.1.4 when
 * default custom roles are created. This function only handles the role conversion.
 */
export const migrateProviderUser = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ 
    success: boolean; 
    message: string;
    userId: string;
    email: string;
    oldRole: string;
    newRole: string;
    isOwner: boolean;
  }> => {
    // Get the user
    const user = await ctx.runQuery(api.users.getUser, { id: args.userId });
    
    if (!user) {
      throw new Error(`User with ID ${args.userId} not found`);
    }
    
    // Store old role for logging
    const oldRole = user.role;
    
    // Check if already migrated (idempotent check - must come before provider check)
    if (user.role === "clinic_user" && user.isOwner === false) {
      return {
        success: true,
        message: `User ${user.email} already migrated`,
        userId: user._id,
        email: user.email,
        oldRole: oldRole,
        newRole: "clinic_user",
        isOwner: false,
      };
    }
    
    // Verify user is a provider (only if not already migrated)
    if (user.role !== "provider") {
      throw new Error(`User ${user.email} is not a provider (current role: ${user.role}). Only provider users can be migrated using this function.`);
    }
    
    // Update user to clinic_user with isOwner=false
    await ctx.runMutation(api.users.migrateProviderUserMutation, {
      userId: args.userId,
      role: "clinic_user",
      isOwner: false,
    });
    
    return {
      success: true,
      message: `Successfully migrated provider user ${user.email} to clinic_user with isOwner=false`,
      userId: user._id,
      email: user.email,
      oldRole: oldRole,
      newRole: "clinic_user",
      isOwner: false,
    };
  },
});

/**
 * Internal mutation to update user role and isOwner flag
 * Used by migrateProviderUser action
 */
export const migrateProviderUserMutation = mutation({
  args: {
    userId: v.id("users"),
    role: v.literal("clinic_user"),
    isOwner: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.userId, {
      role: args.role,
      isOwner: args.isOwner,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Assign a custom role to a user
 * Used during migration to assign default roles to migrated users
 */
export const assignCustomRoleToUser = mutation({
  args: {
    userId: v.id("users"),
    customRoleId: v.id("customRoles"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.userId, {
      customRoleId: args.customRoleId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Check if user's password has expired based on tenant's password rotation policy
 * @returns Object with expiration status and details
 */
export const checkPasswordExpiration = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ expired: boolean; expiresAt: number | null; daysRemaining: number | null; rotationPeriod: number | null; lastPasswordChange: number }> => {
    const user: any = await ctx.runQuery(api.users.getUser, { id: args.userId });
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // If user has no tenantId (e.g., superadmin), password rotation doesn't apply
    if (!user.tenantId) {
      return {
        expired: false,
        expiresAt: null,
        daysRemaining: null,
        rotationPeriod: null,
        lastPasswordChange: user.lastPasswordChange || user.createdAt || Date.now(),
      };
    }
    
    // Get tenant settings to check password rotation period
    const tenant: any = await ctx.runQuery(api.tenants.getTenant, { tenantId: user.tenantId });
    
    if (!tenant) {
      // If tenant not found, don't enforce password rotation
      return {
        expired: false,
        expiresAt: null,
        daysRemaining: null,
        rotationPeriod: null,
        lastPasswordChange: user.lastPasswordChange || user.createdAt || Date.now(),
      };
    }
    
    const rotationPeriodDays: number | undefined = tenant.settings.passwordRotationPeriod;
    
    // If rotation period is not configured, password rotation is disabled
    if (!rotationPeriodDays || rotationPeriodDays <= 0) {
      return {
        expired: false,
        expiresAt: null,
        daysRemaining: null,
        rotationPeriod: null,
        lastPasswordChange: user.lastPasswordChange || user.createdAt || Date.now(),
      };
    }
    
    // If user has never changed password, set expiration based on account creation
    // For existing users without lastPasswordChange, we'll use createdAt as fallback
    const lastPasswordChange: number = user.lastPasswordChange || user.createdAt;
    const rotationPeriodMs: number = rotationPeriodDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    const expiresAt: number = lastPasswordChange + rotationPeriodMs;
    const now: number = Date.now();
    const expired: boolean = now >= expiresAt;
    const daysRemaining = expired ? 0 : Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
    
    return {
      expired,
      expiresAt,
      daysRemaining,
      rotationPeriod: rotationPeriodDays,
      lastPasswordChange,
    };
  },
});

/**
 * Check if user account is locked due to failed login attempts
 * Returns lockout status and remaining lockout time if locked
 */
export const checkAccountLockout = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ isLocked: boolean; lockedUntil: number | null; failedAttempts: number }> => {
    const user: any = await ctx.runQuery(api.users.getUser, { id: args.userId });
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // If no lockout timestamp, account is not locked
    if (!user.accountLockedUntil) {
      return {
        isLocked: false,
        lockedUntil: null,
        failedAttempts: user.failedLoginAttempts || 0,
      };
    }
    
    const now: number = Date.now();
    
    // Check if lockout has expired
    if (now >= user.accountLockedUntil) {
      // Lockout expired - reset failed attempts and unlock
      await ctx.runMutation(api.users.resetFailedLoginAttempts, {
        userId: args.userId,
      });
      return {
        isLocked: false,
        lockedUntil: null,
        failedAttempts: 0,
      };
    }
    
    // Account is still locked
    return {
      isLocked: true,
      lockedUntil: user.accountLockedUntil,
      failedAttempts: user.failedLoginAttempts || 0,
    };
  },
});

/**
 * Increment failed login attempts and lock account if threshold reached
 */
export const incrementFailedLoginAttempts = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; locked: boolean; failedAttempts: number }> => {
    const user: any = await ctx.runQuery(api.users.getUser, { id: args.userId });
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Get tenant settings for lockout configuration
    let maxAttempts = 5; // Default: 5 attempts
    let lockoutDurationMinutes = 30; // Default: 30 minutes
    
    if (user.tenantId) {
      try {
        const tenant = await ctx.runQuery(api.tenants.getTenant, {
          tenantId: user.tenantId,
        });
        
        if (tenant?.settings) {
          // Use tenant-specific settings if configured
          if (tenant.settings.accountLockoutMaxAttempts !== undefined) {
            maxAttempts = tenant.settings.accountLockoutMaxAttempts;
          }
          if (tenant.settings.accountLockoutDuration !== undefined) {
            lockoutDurationMinutes = tenant.settings.accountLockoutDuration;
          }
        }
      } catch (error) {
        // If tenant not found, use defaults
        console.warn("Tenant not found, using default lockout settings");
      }
    }
    
    // If account lockout is disabled (maxAttempts is 0 or negative), don't track attempts
    if (maxAttempts <= 0) {
      return {
        success: true,
        locked: false,
        failedAttempts: 0,
      };
    }
    
    const currentAttempts: number = (user.failedLoginAttempts || 0) + 1;
    const now: number = Date.now();
    
    // Check if we should lock the account
    if (currentAttempts >= maxAttempts) {
      const lockedUntil = now + (lockoutDurationMinutes * 60 * 1000); // Convert minutes to milliseconds
      
      await ctx.runMutation(api.users.updateUserMutation, {
        id: args.userId,
        failedLoginAttempts: currentAttempts,
        accountLockedUntil: lockedUntil,
        lastFailedLoginAttempt: now,
        updatedAt: now,
      });
      
      // Log lockout event
      try {
        await ctx.runMutation(api.auditLogs.create, {
          tenantId: user.tenantId || "",
          action: "account_locked",
          resource: "user",
          resourceId: args.userId, // Convex ID will be converted to string
          userId: args.userId,
          details: {
            reason: "failed_login_attempts",
            failedAttempts: currentAttempts,
            maxAttempts: maxAttempts,
            lockedUntil: lockedUntil,
          },
          timestamp: now,
        });
      } catch (error) {
        // Log error but don't fail the lockout
        console.warn("Failed to log account lockout event:", error);
      }
      
      return {
        success: true,
        locked: true,
        failedAttempts: currentAttempts,
      };
    }
    
    // Increment attempts but don't lock yet
    await ctx.runMutation(api.users.updateUserMutation, {
      id: args.userId,
      failedLoginAttempts: currentAttempts,
      lastFailedLoginAttempt: now,
      updatedAt: now,
    });
    
    return {
      success: true,
      locked: false,
      failedAttempts: currentAttempts,
    };
  },
});

/**
 * Reset failed login attempts (called on successful login)
 */
export const resetFailedLoginAttempts = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    
    if (!user) {
      return;
    }
    
    // Only reset if there were failed attempts or account was locked
    if ((user.failedLoginAttempts && user.failedLoginAttempts > 0) || user.accountLockedUntil) {
      await ctx.db.patch(args.userId, {
        failedLoginAttempts: 0,
        accountLockedUntil: undefined,
        lastFailedLoginAttempt: undefined,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Unlock user account (admin/owner only)
 */
export const unlockAccount = action({
  args: {
    userId: v.id("users"),
    unlockedBy: v.id("users"), // User ID of admin/owner unlocking the account
  },
  handler: async (ctx, args) => {
    // Verify the user unlocking has permission (must be owner or superadmin)
    const unlockingUser = await ctx.runQuery(api.users.getUser, { id: args.unlockedBy });
    
    if (!unlockingUser) {
      throw new Error("Unlocking user not found");
    }
    
    // Check if user is owner or superadmin
    const isOwner = unlockingUser.isOwner === true;
    const isSuperAdmin = unlockingUser.role === "super_admin";
    
    if (!isOwner && !isSuperAdmin) {
      throw new Error("Only owners or superadmins can unlock accounts");
    }
    
    // Get the user to unlock
    const userToUnlock = await ctx.runQuery(api.users.getUser, { id: args.userId });
    
    if (!userToUnlock) {
      throw new Error("User to unlock not found");
    }
    
    // Verify tenant isolation (owners can only unlock users in their tenant)
    if (isOwner && !isSuperAdmin) {
      if (unlockingUser.tenantId !== userToUnlock.tenantId) {
        throw new Error("Cannot unlock user from different tenant");
      }
    }
    
    // Unlock the account
    await ctx.runMutation(api.users.resetFailedLoginAttempts, {
      userId: args.userId,
    });
    
    // Log unlock event
    try {
      await ctx.runMutation(api.auditLogs.create, {
        tenantId: userToUnlock.tenantId || "",
        action: "account_unlocked",
        resource: "user",
        resourceId: args.userId, // Convex ID will be converted to string
        userId: args.unlockedBy,
        details: {
          unlockedBy: unlockingUser.email,
          unlockedByRole: unlockingUser.role,
          targetUser: userToUnlock.email,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      // Log error but don't fail the unlock
      console.warn("Failed to log account unlock event:", error);
    }
    
    return {
      success: true,
      message: "Account unlocked successfully",
    };
  },
});

/**
 * Get password expiration status for a user (query version for client-side checks)
 */
export const getPasswordExpirationStatus = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    
    if (!user) {
      return null;
    }
    
    // If user has no tenantId (e.g., superadmin), password rotation doesn't apply
    if (!user.tenantId) {
      return {
        expired: false,
        expiresAt: null,
        daysRemaining: null,
        rotationPeriod: null,
      };
    }
    
    // Get tenant settings to check password rotation period
    if (!user.tenantId) {
      return {
        expired: false,
        expiresAt: null,
        daysRemaining: null,
        rotationPeriod: null,
      };
    }
    
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", user.tenantId!))
      .first();
    
    if (!tenant) {
      // If tenant not found, don't enforce password rotation
      return {
        expired: false,
        expiresAt: null,
        daysRemaining: null,
        rotationPeriod: null,
      };
    }
    
    const rotationPeriodDays = tenant.settings.passwordRotationPeriod;
    
    // If rotation period is not configured, password rotation is disabled
    if (!rotationPeriodDays || rotationPeriodDays <= 0) {
      return {
        expired: false,
        expiresAt: null,
        daysRemaining: null,
        rotationPeriod: null,
      };
    }
    
    // If user has never changed password, set expiration based on account creation
    // For existing users without lastPasswordChange, we'll use createdAt as fallback
    const lastPasswordChange = user.lastPasswordChange || user.createdAt;
    const rotationPeriodMs = rotationPeriodDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    const expiresAt = lastPasswordChange + rotationPeriodMs;
    const now = Date.now();
    const expired = now >= expiresAt;
    const daysRemaining = expired ? 0 : Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
    
    return {
      expired,
      expiresAt,
      daysRemaining,
      rotationPeriod: rotationPeriodDays,
      lastPasswordChange,
    };
  },
});
