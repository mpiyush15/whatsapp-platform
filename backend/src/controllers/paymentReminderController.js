import { sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';

export const sendPaymentReminder = async (req, res) => {
  try {
    const { accountId, email } = req.body;

    if (!accountId || !email) {
      return sendValidationError(res, 'Account ID and email required');
    }

    logger.info('📧 Payment reminder sent to:', email);

    return sendSuccess(res, {
      reminderId: `remind_${Date.now()}`,
      status: 'sent'
    }, 'Reminder sent');
  } catch (error) {
    return handleControllerError(res, error, 'sendPaymentReminder');
  }
};

export const getReminders = async (req, res) => {
  try {
    return sendSuccess(res, { reminders: [] }, 'Reminders retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getReminders');
  }
};

export const sendPaymentReminders = async (req, res) => {
  try {
    return sendSuccess(res, { sent: 0 }, 'Payment reminders sent');
  } catch (error) {
    return handleControllerError(res, error, 'sendPaymentReminders');
  }
};

export const getPendingPayments = async (req, res) => {
  try {
    return sendSuccess(res, { pendingPayments: [] }, 'Pending payments retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPendingPayments');
  }
};

export const markReminderSent = async (req, res) => {
  try {
    const { reminderId } = req.params;
    return sendSuccess(res, { reminderId, marked: true }, 'Reminder marked as sent');
  } catch (error) {
    return handleControllerError(res, error, 'markReminderSent');
  }
};

export default { 
  sendPaymentReminder, 
  getReminders,
  sendPaymentReminders,
  getPendingPayments,
  markReminderSent
};
