import { eq, and, desc } from 'drizzle-orm'
import { db } from '@startkit/database'
import { notifications } from '../schema'

/**
 * Notification Service
 * 
 * Handles all database operations for Notifications using Drizzle ORM.
 */
export class NotificationService {
  /**
   * Get all notifications for a user
   */
  static async getUserNotifications(userId: string, organizationId: string) {
    return await db.select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.organizationId, organizationId)
        )
      )
      .orderBy(desc(notifications.createdAt))
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(id: string, organizationId: string) {
    return await db.update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.organizationId, organizationId)
        )
      )
      .returning()
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string, organizationId: string) {
    return await db.update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.organizationId, organizationId),
          eq(notifications.isRead, false)
        )
      )
      .returning()
  }

  /**
   * Create a notification
   */
  static async createNotification(data: any, organizationId: string) {
    const [newNotification] = await db.insert(notifications)
      .values({
        ...data,
        organizationId,
      })
      .returning()
    
    return newNotification
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(id: string, organizationId: string) {
    const [deleted] = await db.delete(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.organizationId, organizationId)
        )
      )
      .returning()
    
    return deleted || null
  }
}
