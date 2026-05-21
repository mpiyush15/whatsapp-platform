import Account from '../models/Account.js';
import Subscription from '../models/Subscription.js';
import CreditPackSettings from '../models/CreditPackSettings.js';
import NotificationDispatch from '../models/NotificationDispatch.js';
import billingNotificationService from './billingNotificationService.js';
import platformWhatsAppService from './platformWhatsAppService.js';
import { emailService } from './emailService.js';
import { normalizePhone } from '../utils/normalizePhone.js';
import logger from '../utils/logger.js';

const PLAN_PRICES = {
  starter: { monthly: 999, quarterly: 2847, annual: 9590 },
  pro: { monthly: 2999, quarterly: 8547, annual: 28790 },
  enterprise: { monthly: 9999, quarterly: 28497, annual: 95990 },
  custom: { monthly: 0, quarterly: 0, annual: 0 },
};

function resolveAmountDue(account) {
  const planKey = (account.plan || 'starter').toLowerCase();
  const cycleKey = (account.billingCycle || 'monthly').toLowerCase();
  const prices = PLAN_PRICES[planKey] || PLAN_PRICES.starter;
  return prices[cycleKey] || prices.monthly;
}

function paymentLinkFor(account) {
  const base = (process.env.FRONTEND_URL || 'https://app.replysys.com').replace(/\/$/, '');
  return `${base}/checkout?plan=${(account.plan || 'starter').toLowerCase()}&billingCycle=${(account.billingCycle || 'monthly').toLowerCase()}`;
}

function recipientPhoneFor(account) {
  return normalizePhone(account.phone || account.whatsappNumber || '');
}

class PlatformBillingNotificationService {
  async sendPaymentReminderWhatsApp(account, { dispatchKeySuffix = '' } = {}) {
    const phone = recipientPhoneFor(account);
    if (!phone) {
      return { sent: false, skipped: true, reason: 'NO_PHONE' };
    }

    const dispatchKey = `notify:whatsapp:payment_reminder:${account.accountId}${dispatchKeySuffix}`;
    const { dispatch, canSend, alreadyFinalized } = await billingNotificationService.claimDispatch({
      accountId: account.accountId,
      channel: 'whatsapp',
      eventType: 'payment_reminder',
      dispatchKey,
      referenceType: 'account',
      referenceId: account.accountId,
    });

    if (alreadyFinalized || !canSend) {
      return { sent: false, duplicate: true };
    }

    try {
      const link = paymentLinkFor(account);
      const result = await platformWhatsAppService.sendPaymentReminder(
        phone,
        account.name,
        account.plan,
        account.billingCycle,
        link
      );

      if (!result.success) {
        throw new Error(result.error || 'PAYMENT_REMINDER_WHATSAPP_FAILED');
      }

      await billingNotificationService.markSent(dispatch._id);
      return { sent: true, channel: 'whatsapp' };
    } catch (error) {
      await billingNotificationService.markFailed(dispatch._id, error.message);
      return { sent: false, error: error.message };
    }
  }

  async sendPaymentReminderEmailAndWhatsApp(account) {
    const amountDue = resolveAmountDue(account);
    const link = paymentLinkFor(account);
    const results = { email: null, whatsapp: null };

    try {
      await emailService.sendPaymentReminderEmail(
        account.email,
        account.name,
        account.plan,
        amountDue,
        account.billingCycle,
        link
      );
      results.email = { sent: true };
    } catch (err) {
      results.email = { sent: false, error: err.message };
    }

    results.whatsapp = await this.sendPaymentReminderWhatsApp(account);
    return results;
  }

  async sendLowCreditWhatsApp(account, threshold) {
    const phone = recipientPhoneFor(account);
    if (!phone) {
      return { sent: false, skipped: true, reason: 'NO_PHONE' };
    }

    const dispatchKey = `notify:whatsapp:low_credit:${account.accountId}:${Math.floor(Date.now() / 86400000)}`;
    const existing = await NotificationDispatch.findOne({ dispatchKey, status: 'sent' }).lean();
    if (existing) {
      return { sent: false, duplicate: true };
    }

    const { dispatch, canSend } = await billingNotificationService.claimDispatch({
      accountId: account.accountId,
      channel: 'whatsapp',
      eventType: 'low_credit',
      dispatchKey,
      referenceType: 'account',
      referenceId: account.accountId,
      metadata: { threshold, balance: account.creditBalance },
    });

    if (!canSend) {
      return { sent: false, duplicate: true };
    }

    try {
      const result = await platformWhatsAppService.sendLowCredit(
        phone,
        account.name,
        account.creditBalance
      );

      if (!result.success) {
        throw new Error(result.error || 'LOW_CREDIT_WHATSAPP_FAILED');
      }

      await billingNotificationService.markSent(dispatch._id);
      return { sent: true };
    } catch (error) {
      await billingNotificationService.markFailed(dispatch._id, error.message);
      return { sent: false, error: error.message };
    }
  }

  async sendRenewalReminderWhatsApp(account, subscription, stageLabel) {
    const phone = recipientPhoneFor(account);
    if (!phone) {
      return { sent: false, skipped: true, reason: 'NO_PHONE' };
    }

    const renewalDateStr = subscription.renewalDate
      ? new Date(subscription.renewalDate).toLocaleDateString('en-IN')
      : '';

    const dispatchKey = `notify:whatsapp:renewal:${account.accountId}:${stageLabel}`;
    const { dispatch, canSend } = await billingNotificationService.claimDispatch({
      accountId: account.accountId,
      channel: 'whatsapp',
      eventType: 'renewal_reminder',
      dispatchKey,
      referenceType: 'subscription',
      referenceId: String(subscription._id),
      metadata: { stageLabel },
    });

    if (!canSend) {
      return { sent: false, duplicate: true };
    }

    try {
      const result = await platformWhatsAppService.sendRenewalReminder(
        phone,
        account.name,
        subscription.planName || account.plan,
        renewalDateStr
      );

      if (!result.success) {
        throw new Error(result.error || 'RENEWAL_WHATSAPP_FAILED');
      }

      await billingNotificationService.markSent(dispatch._id);
      return { sent: true };
    } catch (error) {
      await billingNotificationService.markFailed(dispatch._id, error.message);
      return { sent: false, error: error.message };
    }
  }

  /** Daily job: low credit + renewal windows */
  async runBillingReminderSweep() {
    const settings = await CreditPackSettings.findOne()
      .select('lowCreditWarningThreshold renewalReminderDays')
      .lean();
    const threshold = Number(settings?.lowCreditWarningThreshold ?? 200);
    const reminderDays = Array.isArray(settings?.renewalReminderDays)?.length
      ? settings.renewalReminderDays.map(Number).filter(Number.isFinite).sort((a, b) => b - a)
      : [15, 7, 3, 1];

    const now = new Date();
    const summary = { lowCredit: { sent: 0, skipped: 0 }, renewal: { sent: 0, skipped: 0 } };

    const lowCreditAccounts = await Account.find({
      isInternal: { $ne: true },
      status: 'active',
      creditBalance: { $lte: threshold },
      phone: { $exists: true, $ne: '' },
    })
      .select('accountId name email phone creditBalance plan billingCycle')
      .limit(50)
      .lean();

    for (const account of lowCreditAccounts) {
      const r = await this.sendLowCreditWhatsApp(account, threshold);
      if (r.sent) summary.lowCredit.sent += 1;
      else summary.lowCredit.skipped += 1;
    }

    const maxDay = reminderDays[0] || 15;
    const renewalCutoff = new Date(now.getTime() + maxDay * 86400000);

    const subs = await Subscription.find({
      status: 'active',
      renewalDate: { $gte: now, $lte: renewalCutoff },
    })
      .select('accountId planName renewalDate')
      .limit(100)
      .lean();

    for (const sub of subs) {
      const daysToRenewal = Math.ceil(
        (new Date(sub.renewalDate).getTime() - now.getTime()) / 86400000
      );
      const stage = reminderDays.find((d) => daysToRenewal <= d);
      if (stage == null) continue;

      const account = await Account.findOne({ accountId: sub.accountId, isInternal: { $ne: true } })
        .select('accountId name phone plan')
        .lean();
      if (!account?.phone) continue;

      const r = await this.sendRenewalReminderWhatsApp(account, sub, `D-${stage}`);
      if (r.sent) summary.renewal.sent += 1;
      else summary.renewal.skipped += 1;
    }

    logger.info('Platform billing reminder sweep complete', summary);
    return summary;
  }
}

export default new PlatformBillingNotificationService();
