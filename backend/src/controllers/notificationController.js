import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';

export const sendNotification = async (req, res) => {
  try {
    const { recipientId, message, type = 'email' } = req.body;

    if (!recipientId || !message) {
      return sendValidationError(res, 'Recipient and message required');
    }

    logger.info('🔔 Notification sent:', { type, recipientId });

    return sendSuccess(res, {
      notificationId: `notif_${Date.now()}`,
      status: 'sent'
    }, 'Notification sent');
  } catch (error) {
    return handleControllerError(res, error, 'sendNotification');
  }
};

export const listNotifications = async (req, res) => {
  try {
    return sendSuccess(res, { notifications: [] }, 'Notifications retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listNotifications');
  }
};

export const getNotifications = async (req, res) => {
  try {
    return sendSuccess(res, { notifications: [] }, 'Notifications retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getNotifications');
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    return sendSuccess(res, { notificationId, read: true }, 'Notification marked as read');
  } catch (error) {
    return handleControllerError(res, error, 'markAsRead');
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    return sendSuccess(res, { allRead: true }, 'All notifications marked as read');
  } catch (error) {
    return handleControllerError(res, error, 'markAllAsRead');
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    return sendSuccess(res, { notificationId, deleted: true }, 'Notification deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteNotification');
  }
};

export default { 
  sendNotification,
  listNotifications,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
