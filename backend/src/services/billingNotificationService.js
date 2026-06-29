import NotificationDispatch from '../models/NotificationDispatch.js';
import notificationService from './notificationService.js';
import { emailService } from './emailService.js';
import platformWhatsAppService from './platformWhatsAppService.js';
import logger from '../utils/logger.js';
import { normalizePhone } from '../utils/normalizePhone.js';

class BillingNotificationService {
  async claimDispatch({ accountId, channel, eventType, dispatchKey, referenceType, referenceId, metadata = {} }) {
    const previousDoc = await NotificationDispatch.findOneAndUpdate(
      { dispatchKey },
      {
        $setOnInsert: {
          accountId,
          channel,
          eventType,
          dispatchKey,
          status: 'processing',
          referenceType,
          referenceId,
          metadata,
        },
        $set: {
          updatedAt: new Date(),
        }
      },
      {
        upsert: true,
        new: false, // returns null if inserted, or the old document if updated
      }
    );

    const existed = Boolean(previousDoc);
    const doc = existed ? previousDoc : await NotificationDispatch.findOne({ dispatchKey });

    return {
      dispatch: doc,
      existed,
      canSend: !existed,
      alreadyFinalized: existed && ['sent', 'skipped'].includes(previousDoc?.status),
    };
  }

  async markSent(dispatchId, extra = {}) {
    return NotificationDispatch.findByIdAndUpdate(
      dispatchId,
      {
        $set: {
          status: 'sent',
          sentAt: new Date(),
          lastError: null,
          ...extra,
        }
      },
      { new: true }
    );
  }

  async markSkipped(dispatchId, reason = 'SKIPPED') {
    return NotificationDispatch.findByIdAndUpdate(
      dispatchId,
      {
        $set: {
          status: 'skipped',
          sentAt: new Date(),
          lastError: reason,
        }
      },
      { new: true }
    );
  }

  async markFailed(dispatchId, errorMessage) {
    return NotificationDispatch.findByIdAndUpdate(
      dispatchId,
      {
        $set: {
          status: 'failed',
          lastError: errorMessage || 'UNKNOWN_ERROR',
        }
      },
      { new: true }
    );
  }

  async sendInAppSubscriptionActivated({ accountId, invoiceId, invoiceNumber, planName, billingCycle, renewalDate, orderId }) {
    const dispatchKey = `notify:in_app:subscription_activated:${orderId}`;
    const { dispatch, canSend, alreadyFinalized } = await this.claimDispatch({
      accountId,
      channel: 'in_app',
      eventType: 'subscription_activated',
      dispatchKey,
      referenceType: 'order',
      referenceId: String(orderId),
      metadata: { invoiceId, invoiceNumber, planName, billingCycle },
    });

    if (alreadyFinalized) {
      return { channel: 'in_app', eventType: 'subscription_activated', duplicate: true, status: 'sent' };
    }

    if (!canSend) {
      return { channel: 'in_app', eventType: 'subscription_activated', duplicate: true, status: 'processing' };
    }

    try {
      const notification = await notificationService.createNotification(accountId, {
        title: 'Subscription Activated',
        message: `Your ${planName} plan is active (${billingCycle}). Renewal: ${renewalDate.toLocaleDateString()}`,
        type: 'system',
        relatedId: String(invoiceId),
        relatedType: 'invoice',
        actionUrl: '/billing',
        metadata: {
          invoiceNumber,
          orderId,
          source: 'billing_lifecycle',
        }
      });

      await this.markSent(dispatch._id, {
        metadata: {
          ...(dispatch.metadata || {}),
          notificationId: String(notification._id),
        }
      });

      return { channel: 'in_app', eventType: 'subscription_activated', sent: true };
    } catch (error) {
      await this.markFailed(dispatch._id, error.message);
      return { channel: 'in_app', eventType: 'subscription_activated', sent: false, error: error.message };
    }
  }

  async sendInvoiceEmail({ account, invoice, orderId }) {
    const dispatchKey = `notify:email:invoice_generated:${orderId}`;
    const { dispatch, canSend, alreadyFinalized } = await this.claimDispatch({
      accountId: account.accountId,
      channel: 'email',
      eventType: 'invoice_generated',
      dispatchKey,
      referenceType: 'invoice',
      referenceId: String(invoice._id),
      metadata: { invoiceNumber: invoice.invoiceNumber, email: account.email },
    });

    if (alreadyFinalized) {
      return { channel: 'email', eventType: 'invoice_generated', duplicate: true, status: 'sent' };
    }

    if (!canSend) {
      return { channel: 'email', eventType: 'invoice_generated', duplicate: true, status: 'processing' };
    }

    try {
      if (!account.email) {
        await this.markSkipped(dispatch._id, 'ACCOUNT_EMAIL_MISSING');
        return { channel: 'email', eventType: 'invoice_generated', skipped: true, reason: 'ACCOUNT_EMAIL_MISSING' };
      }

      const emailResult = await emailService.sendInvoiceEmail(
        account.email,
        invoice.invoiceNumber,
        `${process.env.FRONTEND_URL || 'https://app.pixelswhatsapp.com'}/api/invoices/${invoice._id}/pdf`,
        invoice.total,
        account.company || account.name || 'Customer'
      );

      if (!emailResult?.success) {
        throw new Error(emailResult?.error || 'INVOICE_EMAIL_SEND_FAILED');
      }

      await this.markSent(dispatch._id);
      return { channel: 'email', eventType: 'invoice_generated', sent: true };
    } catch (error) {
      await this.markFailed(dispatch._id, error.message);
      return { channel: 'email', eventType: 'invoice_generated', sent: false, error: error.message };
    }
  }

  async sendSubscriptionActivatedEmail({ account, planName, billingCycle, renewalDate, orderId }) {
    const dispatchKey = `notify:email:subscription_activated:${orderId}`;
    const { dispatch, canSend, alreadyFinalized } = await this.claimDispatch({
      accountId: account.accountId,
      channel: 'email',
      eventType: 'subscription_activated',
      dispatchKey,
      referenceType: 'order',
      referenceId: String(orderId),
      metadata: { planName, billingCycle, email: account.email },
    });

    if (alreadyFinalized) {
      return { channel: 'email', eventType: 'subscription_activated', duplicate: true, status: 'sent' };
    }

    if (!canSend) {
      return { channel: 'email', eventType: 'subscription_activated', duplicate: true, status: 'processing' };
    }

    try {
      if (!account.email) {
        await this.markSkipped(dispatch._id, 'ACCOUNT_EMAIL_MISSING');
        return { channel: 'email', eventType: 'subscription_activated', skipped: true, reason: 'ACCOUNT_EMAIL_MISSING' };
      }

      // Need to find the payment amount from the DB if possible, or pass it
      // but sendPaymentConfirmationEmail signature is: (email, name, plan, planAmount, transactionId)
      // Since we don't have planAmount or transactionId easily here, we'll fetch the payment
      const payment = await import('../models/Payment.js').then(m => m.default.findOne({ orderId }));
      const planAmount = payment ? payment.amount : 0;
      const transactionId = payment ? (payment.cfPaymentId || payment.paymentId || orderId) : orderId;

      const emailResult = await emailService.sendPaymentConfirmationEmail(
        account.email,
        account.name || 'Customer',
        planName,
        planAmount,
        transactionId
      );

      if (!emailResult?.success) {
        throw new Error(emailResult?.error || 'SUBSCRIPTION_EMAIL_SEND_FAILED');
      }

      await this.markSent(dispatch._id);
      return { channel: 'email', eventType: 'subscription_activated', sent: true };
    } catch (error) {
      await this.markFailed(dispatch._id, error.message);
      return { channel: 'email', eventType: 'subscription_activated', sent: false, error: error.message };
    }
  }

  async sendOnboardingWhatsApp({ account, orderId, planName }) {
    const dispatchKey = `notify:whatsapp:onboarding_whatsapp:${orderId}`;
    const { dispatch, canSend, alreadyFinalized } = await this.claimDispatch({
      accountId: account.accountId,
      channel: 'whatsapp',
      eventType: 'onboarding_whatsapp',
      dispatchKey,
      referenceType: 'order',
      referenceId: String(orderId),
      metadata: { planName },
    });

    if (alreadyFinalized) {
      return { channel: 'whatsapp', eventType: 'onboarding_whatsapp', duplicate: true, status: 'sent' };
    }

    if (!canSend) {
      return { channel: 'whatsapp', eventType: 'onboarding_whatsapp', duplicate: true, status: 'processing' };
    }

    try {
      const recipientPhone = normalizePhone(account.phone || account.whatsappNumber || '');
      const cfg = platformWhatsAppService.getConfig();

      if (!cfg.isConfigured || !recipientPhone) {
        await this.markSkipped(dispatch._id, 'WHATSAPP_ONBOARDING_NOT_ELIGIBLE');
        return { channel: 'whatsapp', eventType: 'onboarding_whatsapp', skipped: true, reason: 'WHATSAPP_ONBOARDING_NOT_ELIGIBLE' };
      }

      const result = await platformWhatsAppService.sendWelcome(
        recipientPhone,
        account.name || 'Customer',
        planName || 'Plan'
      );

      if (!result?.success) {
        throw new Error(result?.error || 'WHATSAPP_TEMPLATE_SEND_FAILED');
      }

      await this.markSent(dispatch._id);
      return { channel: 'whatsapp', eventType: 'onboarding_whatsapp', sent: true };
    } catch (error) {
      await this.markFailed(dispatch._id, error.message);
      return { channel: 'whatsapp', eventType: 'onboarding_whatsapp', sent: false, error: error.message };
    }
  }

  async dispatchPostPaymentNotifications({ account, invoice, planName, billingCycle, renewalDate, orderId }) {
    const results = [];

    results.push(await this.sendInAppSubscriptionActivated({
      accountId: account.accountId,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      planName,
      billingCycle,
      renewalDate,
      orderId,
    }));

    results.push(await this.sendSubscriptionActivatedEmail({
      account,
      planName,
      billingCycle,
      renewalDate,
      orderId,
    }));

    results.push(await this.sendInvoiceEmail({
      account,
      invoice,
      orderId,
    }));

    results.push(await this.sendOnboardingWhatsApp({
      account,
      orderId,
      planName,
    }));

    const sentCount = results.filter(r => r.sent).length;
    const skippedCount = results.filter(r => r.skipped).length;
    const failed = results.filter(r => r.sent === false && !r.skipped);

    if (failed.length > 0) {
      logger.warn('⚠️ Post-payment notifications partially failed', {
        orderId,
        failed,
      });
    }

    return {
      sentCount,
      skippedCount,
      failedCount: failed.length,
      results,
    };
  }
}

export default new BillingNotificationService();
