import { sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import Account from '../models/Account.js';
import Subscription from '../models/Subscription.js';
import CreditPackSettings from '../models/CreditPackSettings.js';

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

export const getTriggerMonitor = async (req, res) => {
  try {
    const requesterRole = req.user?.role;
    const requesterType = req.account?.type || req.user?.type;
    const isInternalAdmin = requesterType === 'internal' || requesterRole === 'superadmin' || requesterRole === 'admin';

    if (!isInternalAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only internal admin can access trigger monitor',
      });
    }

    const settings = await CreditPackSettings.findOne().select('lowCreditWarningThreshold renewalReminderDays');
    const lowCreditWarningThreshold = Number(settings?.lowCreditWarningThreshold ?? 200);
    const reminderDays = Array.isArray(settings?.renewalReminderDays) && settings.renewalReminderDays.length > 0
      ? settings.renewalReminderDays.map((day) => Number(day)).filter((day) => Number.isFinite(day)).sort((a, b) => b - a)
      : [15, 7, 3, 1];

    const renewalWindowDays = reminderDays[0] || 15;
    const now = new Date();
    const renewalCutoff = new Date(now.getTime() + renewalWindowDays * 24 * 60 * 60 * 1000);

    const [lowCreditAccounts, renewalSubscriptions] = await Promise.all([
      Account.find({
        isInternal: { $ne: true },
        status: 'active',
        creditBalance: { $lte: lowCreditWarningThreshold },
      })
        .select('accountId name email creditBalance')
        .sort({ creditBalance: 1 })
        .limit(25),
      Subscription.find({
        status: 'active',
        renewalDate: { $gte: now, $lte: renewalCutoff },
      })
        .select('accountId planName renewalDate status')
        .sort({ renewalDate: 1 })
        .limit(50),
    ]);

    const renewalByStage = reminderDays.reduce((acc, day) => {
      acc[`D-${day}`] = 0;
      return acc;
    }, {});

    const renewalRows = renewalSubscriptions.map((subscription) => {
      const daysToRenewal = Math.ceil((new Date(subscription.renewalDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const stage = reminderDays.find((day) => daysToRenewal <= day) ?? null;
      if (stage !== null) {
        renewalByStage[`D-${stage}`] = Number(renewalByStage[`D-${stage}`] || 0) + 1;
      }

      return {
        accountId: subscription.accountId,
        planName: subscription.planName,
        renewalDate: subscription.renewalDate,
        daysToRenewal,
        stage: stage !== null ? `D-${stage}` : null,
      };
    });

    return sendSuccess(res, {
      generatedAt: new Date().toISOString(),
      thresholds: {
        lowCreditWarningThreshold,
        reminderDays,
      },
      lowCredit: {
        total: lowCreditAccounts.length,
        rows: lowCreditAccounts,
      },
      renewal: {
        total: renewalRows.length,
        byStage: renewalByStage,
        rows: renewalRows,
      },
      dispatch: {
        lowCredit: { sent: 0, failed: 0, pending: lowCreditAccounts.length },
        renewal: { sent: 0, failed: 0, pending: renewalRows.length },
      },
    }, 'Trigger monitor retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getTriggerMonitor');
  }
};

export default { 
  sendPaymentReminder, 
  getReminders,
  sendPaymentReminders,
  getPendingPayments,
  markReminderSent,
  getTriggerMonitor
};
