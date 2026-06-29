import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
export class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(accountId, { title, message, type = 'system', relatedId, relatedType, actionUrl, metadata = {} }) {
    try {
      const notification = new Notification({
        accountId,
        title,
        message,
        type,
        relatedId,
        relatedType,
        actionUrl,
        metadata,
        read: false
      });

      await notification.save();
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get all notifications for an account
   */
  async getNotifications(accountId, options = {}) {
    try {
      const { limit = 20, skip = 0, unreadOnly = false } = options;

      const query = { accountId };
      if (unreadOnly) {
        query.read = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({ accountId, read: false });

      return { notifications, total, unreadCount };
    } catch (error) {
      logger.error('Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, accountId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, accountId },
        { read: true },
        { new: true }
      );

      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for an account
   */
  async markAllAsRead(accountId) {
    try {
      const result = await Notification.updateMany(
        { accountId, read: false },
        { read: true }
      );

      return result;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete old notifications (older than 30 days)
   */
  async deleteOldNotifications(accountId, daysOld = 30) {
    try {
      const date = new Date();
      date.setDate(date.getDate() - daysOld);

      const result = await Notification.deleteMany({
        accountId,
        createdAt: { $lt: date }
      });

      return result;
    } catch (error) {
      logger.error('Error deleting old notifications:', error);
      throw error;
    }
  }

  /**
   * Send broadcast notification
   */
  async notifyBroadcastSent(accountId, broadcastName, stats) {
    return this.createNotification(accountId, {
      title: 'Broadcast Sent',
      message: `${broadcastName} sent to ${stats.sent || 0} contacts`,
      type: 'broadcast',
      metadata: stats
    });
  }

  /**
   * Send broadcast completion notification
   */
  async notifyBroadcastCompleted(accountId, broadcastName, stats) {
    return this.createNotification(accountId, {
      title: 'Broadcast Completed',
      message: `${broadcastName} completed. Delivered to ${stats.delivered || 0}/${stats.sent || 0} contacts`,
      type: 'broadcast',
      metadata: stats
    });
  }
}

const notificationService = new NotificationService();
export default notificationService;
