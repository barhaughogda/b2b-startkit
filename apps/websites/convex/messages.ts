import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Create a new message
export const createMessage = mutation({
  args: {
    tenantId: v.string(),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    subject: v.optional(v.string()),
    content: v.string(),
    messageType: v.union(
      v.literal("appointment"),
      v.literal("general"),
      v.literal("urgent"),
      v.literal("system")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("urgent")
    ),
    threadId: v.optional(v.string()),
    parentMessageId: v.optional(v.id("messages")),
    attachments: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),
      size: v.number(),
      url: v.string()
    })))
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.tenantId?.trim()) {
      throw new Error("Tenant ID is required");
    }
    if (!args.content?.trim()) {
      throw new Error("Message content is required");
    }

    // Validate that both users exist and belong to the same tenant
    const fromUser = await ctx.db.get(args.fromUserId);
    const toUser = await ctx.db.get(args.toUserId);

    if (!fromUser) {
      throw new Error("Sender user not found");
    }
    if (!toUser) {
      throw new Error("Recipient user not found");
    }
    if (fromUser.tenantId !== args.tenantId || toUser.tenantId !== args.tenantId) {
      throw new Error("Users must belong to the same tenant");
    }

    // Generate thread ID if not provided
    const threadId = args.threadId || `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create the message
    const messageId = await ctx.db.insert("messages", {
      tenantId: args.tenantId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      subject: args.subject,
      content: args.content.trim(),
      messageType: args.messageType,
      priority: args.priority,
      status: "sent",
      isRead: false,
      attachments: args.attachments || [],
      threadId,
      parentMessageId: args.parentMessageId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Log the message creation
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      userId: args.fromUserId,
      action: "message_created",
      resource: "messages",
      resourceId: messageId,
      details: {
        toUserId: args.toUserId,
        messageType: args.messageType,
        priority: args.priority,
        hasAttachments: (args.attachments?.length || 0) > 0
      },
      timestamp: Date.now()
    });

    return messageId;
  }
});

// Get messages for a user (inbox)
export const getMessages = query({
  args: {
    tenantId: v.string(),
    userId: v.id("users"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("all"),
      v.literal("unread"),
      v.literal("read")
    )),
    messageType: v.optional(v.union(
      v.literal("all"),
      v.literal("appointment"),
      v.literal("general"),
      v.literal("urgent"),
      v.literal("system")
    ))
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const offset = args.offset || 0;

    // Build query based on filters
    let query = ctx.db
      .query("messages")
      .withIndex("by_tenant_to", (q) => q.eq("tenantId", args.tenantId).eq("toUserId", args.userId));

    // Apply status filter
    if (args.status === "unread") {
      query = query.filter((q) => q.eq(q.field("isRead"), false));
    } else if (args.status === "read") {
      query = query.filter((q) => q.eq(q.field("isRead"), true));
    }

    // Apply message type filter
    if (args.messageType && args.messageType !== "all") {
      query = query.filter((q) => q.eq(q.field("messageType"), args.messageType));
    }

    // Get messages with pagination
    const messages = await query
      .order("desc")
      .paginate({ cursor: null, numItems: limit });

    // Get user details for each message
    const messagesWithUsers = await Promise.all(
      messages.page.map(async (message) => {
        const fromUser = message.fromUserId ? await ctx.db.get(message.fromUserId) : null;
        const toUser = message.toUserId ? await ctx.db.get(message.toUserId) : null;
        
        return {
          ...message,
          fromUser: fromUser ? {
            id: fromUser._id,
            firstName: fromUser.firstName,
            lastName: fromUser.lastName,
            email: fromUser.email,
            role: fromUser.role
          } : null,
          toUser: toUser ? {
            id: toUser._id,
            firstName: toUser.firstName,
            lastName: toUser.lastName,
            email: toUser.email,
            role: toUser.role
          } : null
        };
      })
    );

    return {
      messages: messagesWithUsers,
      pagination: {
        hasMore: messages.isDone === false,
        nextCursor: messages.continueCursor
      }
    };
  }
});

// Get conversation thread
export const getConversation = query({
  args: {
    tenantId: v.string(),
    threadId: v.string(),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    // Get all messages in the thread
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .order("asc")
      .collect();

    // Filter messages where user is either sender or recipient
    const userMessages = messages.filter(
      (message) => message.fromUserId === args.userId || message.toUserId === args.userId
    );

    // Get user details for each message
    const messagesWithUsers = await Promise.all(
      userMessages.map(async (message) => {
        const fromUser = message.fromUserId ? await ctx.db.get(message.fromUserId) : null;
        const toUser = message.toUserId ? await ctx.db.get(message.toUserId) : null;
        
        return {
          ...message,
          fromUser: fromUser ? {
            id: fromUser._id,
            firstName: fromUser.firstName,
            lastName: fromUser.lastName,
            email: fromUser.email,
            role: fromUser.role
          } : null,
          toUser: toUser ? {
            id: toUser._id,
            firstName: toUser.firstName,
            lastName: toUser.lastName,
            email: toUser.email,
            role: toUser.role
          } : null
        };
      })
    );

    return messagesWithUsers;
  }
});

// Get conversations for a user
export const getConversations = query({
  args: {
    tenantId: v.string(),
    userId: v.id("users"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    // Get all messages where user is involved
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_tenant_from", (q) => q.eq("tenantId", args.tenantId).eq("fromUserId", args.userId))
      .collect();

    const receivedMessages = await ctx.db
      .query("messages")
      .withIndex("by_tenant_to", (q) => q.eq("tenantId", args.tenantId).eq("toUserId", args.userId))
      .collect();

    // Combine and group by thread
    const allUserMessages = [...allMessages, ...receivedMessages];
    const threadMap = new Map();

    for (const message of allUserMessages) {
      if (!message.threadId) continue;
      
      if (!threadMap.has(message.threadId)) {
        threadMap.set(message.threadId, {
          threadId: message.threadId,
          lastMessage: message,
          unreadCount: 0,
          participants: new Set()
        });
      }

      const thread = threadMap.get(message.threadId);
      if (message.fromUserId) {
        thread.participants.add(message.fromUserId);
      }
      if (message.toUserId) {
        thread.participants.add(message.toUserId);
      }

      // Update last message if this is more recent
      if (message.createdAt && thread.lastMessage.createdAt && message.createdAt > thread.lastMessage.createdAt) {
        thread.lastMessage = message;
      }

      // Count unread messages
      if (message.toUserId === args.userId && !message.isRead) {
        thread.unreadCount++;
      }
    }

    // Convert to array and get user details
    const conversations = await Promise.all(
      Array.from(threadMap.values()).map(async (thread) => {
        const otherUserId = Array.from(thread.participants).find(id => id !== args.userId);
        const otherUser = otherUserId ? await ctx.db.get(otherUserId as Id<"users">) : null;

        return {
          threadId: thread.threadId,
          lastMessage: {
            ...thread.lastMessage,
            fromUser: thread.lastMessage.fromUserId === args.userId ? null : otherUser ? {
              id: otherUser._id,
              firstName: otherUser.firstName,
              lastName: otherUser.lastName,
              email: otherUser.email,
              role: otherUser.role
            } : null
          },
          unreadCount: thread.unreadCount,
          otherUser: otherUser ? {
            id: otherUser._id,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            email: otherUser.email,
            role: otherUser.role
          } : null
        };
      })
    );

    // Sort by last message time and limit (handle optional createdAt)
    return conversations
      .sort((a, b) => (b.lastMessage.createdAt ?? 0) - (a.lastMessage.createdAt ?? 0))
      .slice(0, limit);
  }
});

// Mark message as read
export const markAsRead = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    tenantId: v.string()
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }
    if (message.tenantId !== args.tenantId) {
      throw new Error("Message does not belong to the specified tenant");
    }
    if (message.toUserId !== args.userId) {
      throw new Error("User is not the recipient of this message");
    }

    await ctx.db.patch(args.messageId, {
      isRead: true,
      readAt: Date.now(),
      status: "read",
      updatedAt: Date.now()
    });

    // Log the read action
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      userId: args.userId,
      action: "message_read",
      resource: "messages",
      resourceId: args.messageId,
      timestamp: Date.now()
    });

    return true;
  }
});

// Mark all messages in a thread as read
export const markThreadAsRead = mutation({
  args: {
    threadId: v.string(),
    userId: v.id("users"),
    tenantId: v.string()
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .filter((q) => 
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.eq(q.field("toUserId"), args.userId),
          q.eq(q.field("isRead"), false)
        )
      )
      .collect();

    const now = Date.now();
    for (const message of messages) {
      await ctx.db.patch(message._id, {
        isRead: true,
        readAt: now,
        status: "read",
        updatedAt: now
      });
    }

    // Log the bulk read action
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      userId: args.userId,
      action: "thread_marked_read",
      resource: "messages",
      resourceId: args.threadId,
      details: { messageCount: messages.length },
      timestamp: now
    });

    return messages.length;
  }
});

// Get unread message count
export const getUnreadCount = query({
  args: {
    tenantId: v.string(),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_tenant_to", (q) => q.eq("tenantId", args.tenantId).eq("toUserId", args.userId))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    return unreadMessages.length;
  }
});

// Get urgent messages for a user (for dashboard widget)
export const getUrgentMessages = query({
  args: {
    tenantId: v.string(),
    userId: v.id("users"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    
    // Get urgent messages (either messageType is "urgent" or priority is "urgent")
    const urgentMessages = await ctx.db
      .query("messages")
      .withIndex("by_tenant_to", (q) => q.eq("tenantId", args.tenantId).eq("toUserId", args.userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("messageType"), "urgent"),
          q.eq(q.field("priority"), "urgent")
        )
      )
      .order("desc")
      .take(limit);

    // Get user details for each message
    const messagesWithUsers = await Promise.all(
      urgentMessages.map(async (message) => {
        const fromUser = message.fromUserId ? await ctx.db.get(message.fromUserId) : null;
        
        // Map priority to match Message interface
        let priority: "low" | "medium" | "high" | "urgent" = "medium";
        if (message.priority === "urgent" || message.messageType === "urgent") {
          priority = "urgent";
        } else if (message.priority === "high") {
          priority = "high";
        } else if (message.priority === "low") {
          priority = "low";
        }

        return {
          id: message._id.toString(),
          from: fromUser 
            ? `${fromUser.firstName || ""} ${fromUser.lastName || ""}`.trim() || fromUser.email || "Unknown"
            : "System",
          subject: message.subject || "No subject",
          preview: message.content || message.body || "",
          timestamp: message._creationTime,
          unread: !message.isRead,
          priority,
        };
      })
    );

    return messagesWithUsers;
  }
});

// Delete a message (soft delete by updating status)
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    tenantId: v.string()
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }
    if (message.tenantId !== args.tenantId) {
      throw new Error("Message does not belong to the specified tenant");
    }
    if (message.fromUserId !== args.userId) {
      throw new Error("Only the sender can delete a message");
    }

    await ctx.db.patch(args.messageId, {
      isDeleted: true,
      updatedAt: Date.now()
    });

    // Log the deletion
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      userId: args.userId,
      action: "message_deleted",
      resource: "messages",
      resourceId: args.messageId,
      timestamp: Date.now()
    });

    return true;
  }
});

// Get message statistics
export const getMessageStats = query({
  args: {
    tenantId: v.string(),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_tenant_from", (q) => q.eq("tenantId", args.tenantId).eq("fromUserId", args.userId))
      .collect();

    const receivedMessages = await ctx.db
      .query("messages")
      .withIndex("by_tenant_to", (q) => q.eq("tenantId", args.tenantId).eq("toUserId", args.userId))
      .collect();

    const unreadCount = receivedMessages.filter(m => !m.isRead).length;
    const urgentCount = receivedMessages.filter(m => m.priority === "urgent" && !m.isRead).length;

    const allTimestamps = [
      ...allMessages.map(m => m.createdAt).filter((ts): ts is number => ts !== undefined),
      ...receivedMessages.map(m => m.createdAt).filter((ts): ts is number => ts !== undefined)
    ];
    
    return {
      totalSent: allMessages.length,
      totalReceived: receivedMessages.length,
      unreadCount,
      urgentCount,
      lastActivity: allTimestamps.length > 0 ? Math.max(...allTimestamps) : 0
    };
  }
});

// Archive a conversation thread
export const archiveThread = mutation({
  args: {
    threadId: v.string(),
    userId: v.id("users"),
    tenantId: v.string()
  },
  handler: async (ctx, args) => {
    // Get all messages in the thread
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .filter((q) => 
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.or(
            q.eq(q.field("fromUserId"), args.userId),
            q.eq(q.field("toUserId"), args.userId)
          )
        )
      )
      .collect();

    if (messages.length === 0) {
      throw new Error("Thread not found or user not authorized");
    }

    // Mark all messages as archived by updating their status
    const now = Date.now();
    for (const message of messages) {
      await ctx.db.patch(message._id, {
        isArchived: true,
        status: "archived",
        updatedAt: now
      });
    }

    // Log the archive action
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      userId: args.userId,
      action: "thread_archived",
      resource: "messages",
      resourceId: args.threadId,
      details: { messageCount: messages.length },
      timestamp: now
    });

    return messages.length;
  }
});

// Unarchive a conversation thread
export const unarchiveThread = mutation({
  args: {
    threadId: v.string(),
    userId: v.id("users"),
    tenantId: v.string()
  },
  handler: async (ctx, args) => {
    // Get all archived messages in the thread
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .filter((q) => 
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.eq(q.field("status"), "archived"),
          q.or(
            q.eq(q.field("fromUserId"), args.userId),
            q.eq(q.field("toUserId"), args.userId)
          )
        )
      )
      .collect();

    if (messages.length === 0) {
      throw new Error("No archived messages found in thread");
    }

    // Restore messages to their previous status
    const now = Date.now();
    for (const message of messages) {
      await ctx.db.patch(message._id, {
        isArchived: false,
        status: message.isRead ? "read" : "sent",
        updatedAt: now
      });
    }

    // Log the unarchive action
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      userId: args.userId,
      action: "thread_unarchived",
      resource: "messages",
      resourceId: args.threadId,
      details: { messageCount: messages.length },
      timestamp: now
    });

    return messages.length;
  }
});

// Get archived conversations
export const getArchivedConversations = query({
  args: {
    tenantId: v.string(),
    userId: v.id("users"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    // Get all archived messages where user is involved
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_tenant_from", (q) => q.eq("tenantId", args.tenantId).eq("fromUserId", args.userId))
      .filter((q) => q.eq(q.field("status"), "archived"))
      .collect();

    const receivedMessages = await ctx.db
      .query("messages")
      .withIndex("by_tenant_to", (q) => q.eq("tenantId", args.tenantId).eq("toUserId", args.userId))
      .filter((q) => q.eq(q.field("status"), "archived"))
      .collect();

    // Combine and group by thread
    const allUserMessages = [...allMessages, ...receivedMessages];
    const threadMap = new Map();

    for (const message of allUserMessages) {
      if (!message.threadId) continue;
      
      if (!threadMap.has(message.threadId)) {
        threadMap.set(message.threadId, {
          threadId: message.threadId,
          lastMessage: message,
          unreadCount: 0,
          participants: new Set()
        });
      }

      const thread = threadMap.get(message.threadId);
      if (message.fromUserId) {
        thread.participants.add(message.fromUserId);
      }
      if (message.toUserId) {
        thread.participants.add(message.toUserId);
      }

      // Update last message if this is more recent
      if (message.createdAt && thread.lastMessage.createdAt && message.createdAt > thread.lastMessage.createdAt) {
        thread.lastMessage = message;
      }
    }

    // Convert to array and get user details
    const conversations = await Promise.all(
      Array.from(threadMap.values()).map(async (thread) => {
        const otherUserId = Array.from(thread.participants).find(id => id !== args.userId);
        const otherUser = otherUserId ? await ctx.db.get(otherUserId as Id<"users">) : null;

        return {
          threadId: thread.threadId,
          lastMessage: {
            ...thread.lastMessage,
            fromUser: thread.lastMessage.fromUserId === args.userId ? null : otherUser ? {
              id: otherUser._id,
              firstName: otherUser.firstName,
              lastName: otherUser.lastName,
              email: otherUser.email,
              role: otherUser.role
            } : null
          },
          unreadCount: 0, // Archived conversations don't have unread messages
          otherUser: otherUser ? {
            id: otherUser._id,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            email: otherUser.email,
            role: otherUser.role
          } : null
        };
      })
    );

    // Sort by last message time and limit (handle optional createdAt)
    return conversations
      .sort((a, b) => (b.lastMessage.createdAt ?? 0) - (a.lastMessage.createdAt ?? 0))
      .slice(0, limit);
  }
});

// Search messages within a thread
export const searchThreadMessages = query({
  args: {
    tenantId: v.string(),
    threadId: v.string(),
    userId: v.id("users"),
    searchTerm: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const searchLower = args.searchTerm.toLowerCase();

    // Get all messages in the thread
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .filter((q) => 
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.or(
            q.eq(q.field("fromUserId"), args.userId),
            q.eq(q.field("toUserId"), args.userId)
          ),
          q.or(
            q.eq(q.field("status"), "sent"),
            q.eq(q.field("status"), "delivered"),
            q.eq(q.field("status"), "read")
          )
        )
      )
      .collect();

    // Filter messages that match the search term
    const matchingMessages = messages.filter(message => 
      (message.content && message.content.toLowerCase().includes(searchLower)) ||
      (message.subject && message.subject.toLowerCase().includes(searchLower))
    );

    // Get user details for matching messages
    const messagesWithUsers = await Promise.all(
      matchingMessages.map(async (message) => {
        const fromUser = message.fromUserId ? await ctx.db.get(message.fromUserId) : null;
        const toUser = message.toUserId ? await ctx.db.get(message.toUserId) : null;
        
        return {
          ...message,
          fromUser: fromUser ? {
            id: fromUser._id,
            firstName: fromUser.firstName,
            lastName: fromUser.lastName,
            email: fromUser.email,
            role: fromUser.role
          } : null,
          toUser: toUser ? {
            id: toUser._id,
            firstName: toUser.firstName,
            lastName: toUser.lastName,
            email: toUser.email,
            role: toUser.role
          } : null
        };
      })
    );

    // Sort by creation time and limit (handle optional createdAt)
    return messagesWithUsers
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, limit);
  }
});

// Update a message
export const updateMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    tenantId: v.string(),
    updates: v.object({
      createdAt: v.optional(v.number()),
      isRead: v.optional(v.boolean()),
      readAt: v.optional(v.number()),
      status: v.optional(v.union(
        v.literal("sent"),
        v.literal("delivered"),
        v.literal("read"),
        v.literal("deleted"),
        v.literal("archived")
      ))
    })
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }
    
    // Verify tenant authorization
    if (message.tenantId !== args.tenantId) {
      throw new Error("Message does not belong to the specified tenant");
    }
    
    // Verify user is either sender or recipient
    const isSender = message.fromUserId === args.userId;
    const isRecipient = message.toUserId === args.userId;
    
    if (!isSender && !isRecipient) {
      throw new Error("User is not authorized to update this message");
    }
    
    // Prevent unauthorized createdAt manipulation
    // Only the sender can update createdAt (for migration purposes)
    // Regular users should not be able to modify timestamps
    if (args.updates.createdAt !== undefined && !isSender) {
      throw new Error("Only the sender can update message creation timestamp");
    }
    
    // Prevent unauthorized isRead manipulation
    // Only the recipient can mark messages as read (semantically correct)
    if (args.updates.isRead !== undefined && !isRecipient) {
      throw new Error("Only the recipient can update read status");
    }
    
    // Build update object, excluding unauthorized fields
    const updateData: any = {
      updatedAt: Date.now()
    };
    
    // Only include authorized updates
    if (args.updates.isRead !== undefined) {
      updateData.isRead = args.updates.isRead;
      // If marking as read, set readAt (use provided value or current time)
      if (args.updates.isRead) {
        // Use explicitly provided readAt, or default to current time if not provided
        updateData.readAt = args.updates.readAt !== undefined ? args.updates.readAt : Date.now();
        if (!args.updates.status) {
          updateData.status = "read";
        }
      } else {
        // If marking as unread, clear readAt
        updateData.readAt = undefined;
      }
    } else if (args.updates.readAt !== undefined) {
      // Allow explicit readAt updates (for seed scripts with historical data)
      // Only if isRead is also being set or is already true
      updateData.readAt = args.updates.readAt;
    }
    
    if (args.updates.status !== undefined) {
      updateData.status = args.updates.status;
    }
    
    // Only allow createdAt update if user is sender (for migration purposes)
    if (args.updates.createdAt !== undefined && isSender) {
      updateData.createdAt = args.updates.createdAt;
    }

    await ctx.db.patch(args.messageId, updateData);

    // Log the update action
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      userId: args.userId,
      action: "message_updated",
      resource: "messages",
      resourceId: args.messageId,
      details: {
        updatedFields: Object.keys(args.updates),
        isRead: args.updates.isRead,
        status: args.updates.status
      },
      timestamp: Date.now()
    });

    return true;
  }
});

// Get conversation participants
export const getThreadParticipants = query({
  args: {
    tenantId: v.string(),
    threadId: v.string(),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    // Get all messages in the thread to find participants
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .filter((q) => 
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.or(
            q.eq(q.field("fromUserId"), args.userId),
            q.eq(q.field("toUserId"), args.userId)
          )
        )
      )
      .collect();

    if (messages.length === 0) {
      throw new Error("Thread not found or user not authorized");
    }

    // Get unique participant IDs
    const participantIds = new Set();
    for (const message of messages) {
      participantIds.add(message.fromUserId);
      participantIds.add(message.toUserId);
    }

    // Get user details for all participants
    const participants = await Promise.all(
      Array.from(participantIds).map(async (id) => {
        const user = await ctx.db.get(id as Id<"users">);
        return user ? {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        } : null;
      })
    );

    return participants.filter(p => p !== null);
  }
});
