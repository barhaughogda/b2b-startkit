import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { verifySupportAccess, SupportAccessResult } from "../utils/authorization";
import { verifyUserAuthentication } from "../utils/authorization";

/**
 * Convex action to verify superadmin support access for API routes
 * This action can be called from Next.js API routes to verify support access requests
 * 
 * @param userEmail - Email of the authenticated superadmin
 * @param targetUserId - Optional ID of the user account being accessed
 * @param targetTenantId - ID of the tenant being accessed
 * @param ipAddress - Optional IP address for audit logging
 * @param userAgent - Optional user agent for audit logging
 * @returns Support access result with authorization status and request details
 */
export const verifySupportAccessAction = mutation({
  args: {
    userEmail: v.string(),
    targetUserId: v.optional(v.id("users")),
    targetTenantId: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SupportAccessResult> => {
    return await verifySupportAccess(
      ctx,
      args.userEmail,
      args.targetUserId,
      args.targetTenantId,
      args.ipAddress,
      args.userAgent
    );
  },
});

/**
 * Create a support access request for superadmin to access user/tenant data
 * 
 * @param userEmail - Email of the authenticated superadmin
 * @param targetUserId - Optional ID of the user account to access (for tenant-level access, omit this)
 * @param targetTenantId - ID of the tenant to access
 * @param purpose - Reason for the access request
 * @param ipAddress - Optional IP address for audit logging
 * @param userAgent - Optional user agent for audit logging
 * @returns The created support access request ID
 */
export const requestSupportAccess = mutation({
  args: {
    userEmail: v.string(),
    targetUserId: v.optional(v.id("users")),
    targetTenantId: v.string(),
    purpose: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated and is a superadmin
    const authResult = await verifyUserAuthentication(ctx, args.userEmail);
    if (!authResult.authorized || !authResult.userId) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db.get(authResult.userId);
    if (!user || user.role !== "super_admin") {
      throw new Error("Only superadmins can request support access");
    }

    // Validate tenant exists
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_tenant_id", (q) => q.eq("id", args.targetTenantId))
      .first();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // If targetUserId is provided, validate user exists and get their email for notification
    let targetUserEmail: string | undefined;
    if (args.targetUserId) {
      const targetUser = await ctx.db.get(args.targetUserId);
      if (!targetUser) {
        throw new Error("Target user not found");
      }
      targetUserEmail = targetUser.email;
      // Note: We don't validate tenantId match here since users table doesn't have tenantId field
      // This validation should be done at the application level
    }

    // Create the support access request
    const now = Date.now();
    const requestId = await ctx.db.insert("supportAccessRequests", {
      superadminId: user._id,
      targetUserId: args.targetUserId,
      targetTenantId: args.targetTenantId,
      purpose: args.purpose,
      status: "pending",
      auditTrail: [
        {
          action: "requested",
          timestamp: now,
          userId: user._id,
          details: {
            purpose: args.purpose,
            targetTenantId: args.targetTenantId,
            targetUserId: args.targetUserId,
          },
          ipAddress: args.ipAddress,
          userAgent: args.userAgent,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    // Return request data including notification information
    return {
      requestId,
      targetUserId: args.targetUserId,
      targetTenantId: args.targetTenantId,
      targetUserEmail,
      purpose: args.purpose,
      superadminEmail: user.email,
      superadminName: user.name || user.email,
    };
  },
});

/**
 * Get all support access requests for a superadmin
 * 
 * @param userEmail - Email of the authenticated superadmin
 * @param status - Optional status filter
 * @returns List of support access requests
 */
export const getSupportAccessRequests = query({
  args: {
    userEmail: v.string(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("denied"),
      v.literal("expired")
    )),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated and is a superadmin
    const authResult = await verifyUserAuthentication(ctx, args.userEmail);
    if (!authResult.authorized || !authResult.userId) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db.get(authResult.userId);
    if (!user || user.role !== "super_admin") {
      throw new Error("Only superadmins can view support access requests");
    }

    // Query support access requests
    let requests;
    if (args.status) {
      requests = await ctx.db
        .query("supportAccessRequests")
        .withIndex("by_superadmin_status", (q) =>
          q.eq("superadminId", user._id).eq("status", args.status!)
        )
        .collect();
    } else {
      requests = await ctx.db
        .query("supportAccessRequests")
        .withIndex("by_superadmin", (q) => q.eq("superadminId", user._id))
        .collect();
    }

    // Sort by created date (newest first)
    requests.sort((a, b) => b.createdAt - a.createdAt);

    return requests;
  },
});

/**
 * Get a support access request by ID
 * Used by users to view pending requests they need to approve
 * 
 * @param requestId - ID of the support access request
 * @param userEmail - Email of the authenticated user (must be target user or superadmin)
 * @returns The support access request or null if not found
 */
export const getSupportAccessRequestById = query({
  args: {
    requestId: v.id("supportAccessRequests"),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const authResult = await verifyUserAuthentication(ctx, args.userEmail);
    if (!authResult.authorized || !authResult.userId) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db.get(authResult.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get the request
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return null;
    }

    // Check if user has permission to view this request
    // User can view if:
    // 1. They are the superadmin who created the request, OR
    // 2. They are the target user (if targetUserId is set), OR
    // 3. They are a superadmin (for viewing any request)
    const isSuperadmin = user.role === "super_admin";
    const isRequestCreator = request.superadminId === user._id;
    const isTargetUser = request.targetUserId === user._id;

    if (!isSuperadmin && !isRequestCreator && !isTargetUser) {
      throw new Error("You do not have permission to view this request");
    }

    return request;
  },
});

/**
 * Approve a support access request with digital signature
 * 
 * @param requestId - ID of the support access request to approve
 * @param userEmail - Email of the user approving the request (must be target user)
 * @param digitalSignature - Digital signature data
 * @param ipAddress - Optional IP address for audit logging
 * @param userAgent - Optional user agent for audit logging
 * @returns Success status
 */
export const approveSupportAccess = mutation({
  args: {
    requestId: v.id("supportAccessRequests"),
    userEmail: v.string(),
    digitalSignature: v.object({
      signatureData: v.string(), // Base64 encoded signature image/data
      signedAt: v.number(), // Timestamp when signature was provided
      ipAddress: v.optional(v.string()), // IP address at time of signature
      userAgent: v.optional(v.string()), // User agent at time of signature
      consentText: v.string(), // The consent text that was agreed to
    }),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const authResult = await verifyUserAuthentication(ctx, args.userEmail);
    if (!authResult.authorized || !authResult.userId) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db.get(authResult.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get the request
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Support access request not found");
    }

    // Check if request is pending
    if (request.status !== "pending") {
      throw new Error(
        `Cannot approve request with status: ${request.status}. Only pending requests can be approved.`
      );
    }

    // Check if user is the target user (if targetUserId is set)
    // For tenant-level access (no targetUserId), any user in the tenant can approve
    // For user-level access, only the target user can approve
    if (request.targetUserId && request.targetUserId !== user._id) {
      throw new Error(
        "Only the target user can approve this support access request"
      );
    }

    // Validate signature timestamp is reasonable (not in the future, not too old)
    const now = Date.now();
    const signatureAge = now - args.digitalSignature.signedAt;
    const maxSignatureAge = 5 * 60 * 1000; // 5 minutes (signature should be recent)
    if (signatureAge < 0 || signatureAge > maxSignatureAge) {
      throw new Error(
        "Invalid signature timestamp. Please sign again to approve the request."
      );
    }

    // Calculate expiration timestamp (1 hour from now)
    const expirationTimestamp = now + 60 * 60 * 1000; // 1 hour in milliseconds

    // Get superadmin user for notification
    const superadmin = await ctx.db.get(request.superadminId);
    if (!superadmin) {
      throw new Error("Superadmin not found");
    }

    // Get target user email and name if targetUserId is set
    let targetUserEmail: string | undefined;
    let targetUserName: string | undefined;
    if (request.targetUserId) {
      const targetUser = await ctx.db.get(request.targetUserId);
      targetUserEmail = targetUser?.email;
      targetUserName = targetUser?.name;
    } else {
      // For tenant-level access, use the approving user's info
      targetUserEmail = user.email;
      targetUserName = user.name;
    }

    // Update the request with approval
    await ctx.db.patch(args.requestId, {
      status: "approved",
      digitalSignature: args.digitalSignature,
      expirationTimestamp,
      approvedBy: user._id,
      updatedAt: now,
      auditTrail: [
        ...request.auditTrail,
        {
          action: "approved",
          timestamp: now,
          userId: user._id,
          details: {
            signatureProvided: true,
            expirationTimestamp,
          },
          ipAddress: args.ipAddress || args.digitalSignature.ipAddress,
          userAgent: args.userAgent || args.digitalSignature.userAgent,
        },
      ],
    });

    // Return data needed for notification
    return {
      success: true,
      expirationTimestamp,
      requestId: args.requestId,
      superadminEmail: superadmin.email,
      superadminName: superadmin.name || superadmin.email,
      targetUserEmail: targetUserEmail,
      targetUserName: targetUserName,
      targetTenantId: request.targetTenantId,
      purpose: request.purpose,
    };
  },
});

