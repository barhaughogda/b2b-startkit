import { eq, and, or, sql, desc } from 'drizzle-orm'
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
    return await db.select()
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
