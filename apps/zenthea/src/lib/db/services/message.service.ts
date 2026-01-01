import { eq, and, or, sql, desc, count } from 'drizzle-orm'
import { db } from '@startkit/database'
import { messages, messageAssignments } from '../schema'
import { users } from '@startkit/database/schema'

/**
 * Message Service
 * 
 * Handles all database operations for Messages using Drizzle ORM.
 */
export class MessageService {
  /**
   * Get all conversations for a user
   */
  static async getConversations(userId: string, organizationId: string) {
    // We group by threadId and get the unread count.
    const threadGroups = await db.select({
      threadId: messages.threadId,
      unreadCount: sql<number>`count(*) filter (where ${messages.isRead} = false and ${messages.toUserId} = ${userId})`,
    })
    .from(messages)
    .where(
      and(
        eq(messages.organizationId, organizationId),
        or(
          eq(messages.fromUserId, userId),
          eq(messages.toUserId, userId)
        )
      )
    )
    .groupBy(messages.threadId)

    // Resolve last message details and other user for each thread group
    const detailedConversations = await Promise.all(threadGroups.map(async (group) => {
      const [lastMsg] = await db.select({
        id: messages.id,
        content: messages.content,
        fromUserId: messages.fromUserId,
        toUserId: messages.toUserId,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        priority: messages.priority,
        fromUserName: sql<string>`(SELECT name FROM users WHERE id = ${messages.fromUserId})`,
        toUserName: sql<string>`(SELECT name FROM users WHERE id = ${messages.toUserId})`,
      })
      .from(messages)
      .where(
        and(
          eq(messages.threadId, group.threadId!),
          eq(messages.organizationId, organizationId)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(1)

      if (!lastMsg) return null;

      const otherUserId = lastMsg.fromUserId === userId ? lastMsg.toUserId : lastMsg.fromUserId
      
      const [otherUser] = otherUserId ? await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, otherUserId))
      .limit(1) : [null]

      return {
        threadId: group.threadId,
        unreadCount: Number(group.unreadCount),
        lastMessage: lastMsg,
        otherUser: otherUser ? {
          ...otherUser,
          firstName: otherUser.name?.split(' ')[0] || '',
          lastName: otherUser.name?.split(' ').slice(1).join(' ') || '',
          role: 'patient', // Simplified: assume other user is a patient for now
        } : null
      }
    }))

    return detailedConversations.filter((c): c is NonNullable<typeof c> => c !== null)
  }

  /**
   * Get all messages for a user (sent or received)
   */
  static async getUserMessages(userId: string, organizationId: string) {
    return await db.select({
      id: messages.id,
      fromUserId: messages.fromUserId,
      toUserId: messages.toUserId,
      subject: messages.subject,
      content: messages.content,
      messageType: messages.messageType,
      priority: messages.priority,
      status: messages.status,
      isRead: messages.isRead,
      createdAt: messages.createdAt,
      fromUserName: sql<string>`(SELECT name FROM users WHERE id = ${messages.fromUserId})`,
      toUserName: sql<string>`(SELECT name FROM users WHERE id = ${messages.toUserId})`,
    })
    .from(messages)
    .where(
      and(
        eq(messages.organizationId, organizationId),
        or(
          eq(messages.fromUserId, userId),
          eq(messages.toUserId, userId)
        )
      )
    )
    .orderBy(desc(messages.createdAt))
  }

  /**
   * Get a conversation thread
   */
  static async getThread(threadId: string, organizationId: string) {
    return await db.select({
      id: messages.id,
      fromUserId: messages.fromUserId,
      toUserId: messages.toUserId,
      subject: messages.subject,
      content: messages.content,
      messageType: messages.messageType,
      priority: messages.priority,
      status: messages.status,
      isRead: messages.isRead,
      createdAt: messages.createdAt,
      fromUserName: sql<string>`(SELECT name FROM users WHERE id = ${messages.fromUserId})`,
      toUserName: sql<string>`(SELECT name FROM users WHERE id = ${messages.toUserId})`,
    })
    .from(messages)
    .where(
      and(
        eq(messages.threadId, threadId),
        eq(messages.organizationId, organizationId)
      )
    )
    .orderBy(messages.createdAt)
  }

  /**
   * Send a new message
   */
  static async sendMessage(data: any, organizationId: string, fromUserId: string) {
    const { assignments, ...messageData } = data

    return await db.transaction(async (tx) => {
      const [newMessage] = await tx.insert(messages)
        .values({
          ...messageData,
          organizationId,
          fromUserId,
          threadId: messageData.threadId || crypto.randomUUID(),
        })
        .returning()

      if (assignments && Array.isArray(assignments)) {
        for (const assignment of assignments) {
          await tx.insert(messageAssignments).values({
            organizationId,
            messageId: newMessage.id,
            assignedBy: fromUserId,
            assignedTo: assignment.assignedTo,
            status: 'pending',
          })
        }
      }

      return newMessage
    })
  }

  /**
   * Mark message as read
   */
  static async markAsRead(id: string, organizationId: string) {
    return await db.update(messages)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(messages.id, id),
          eq(messages.organizationId, organizationId)
        )
      )
      .returning()
  }

  /**
   * Search messages for a user
   */
  static async searchMessages(userId: string, organizationId: string, searchTerm: string, limit: number = 50) {
    return await db.select({
      id: messages.id,
      fromUserId: messages.fromUserId,
      toUserId: messages.toUserId,
      subject: messages.subject,
      content: messages.content,
      messageType: messages.messageType,
      priority: messages.priority,
      status: messages.status,
      isRead: messages.isRead,
      createdAt: messages.createdAt,
      fromUserName: sql<string>`(SELECT name FROM users WHERE id = ${messages.fromUserId})`,
      toUserName: sql<string>`(SELECT name FROM users WHERE id = ${messages.toUserId})`,
    })
    .from(messages)
    .where(
      and(
        eq(messages.organizationId, organizationId),
        or(
          eq(messages.fromUserId, userId),
          eq(messages.toUserId, userId)
        ),
        sql`${messages.content} ILIKE ${'%' + searchTerm + '%'}`
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(limit)
  }

  /**
   * Archive a thread for a user
   */
  static async archiveThread(threadId: string, userId: string, organizationId: string) {
    return await db.update(messages)
      .set({
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(messages.threadId, threadId),
          eq(messages.organizationId, organizationId),
          or(
            eq(messages.fromUserId, userId),
            eq(messages.toUserId, userId)
          )
        )
      )
      .returning()
  }

  /**
   * Delete a message (soft delete recommended)
   */
  static async deleteMessage(id: string, organizationId: string) {
    return await db.update(messages)
      .set({
        status: 'deleted',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(messages.id, id),
          eq(messages.organizationId, organizationId)
        )
      )
      .returning()
  }
}
