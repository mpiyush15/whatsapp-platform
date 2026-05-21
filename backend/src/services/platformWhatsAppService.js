import whatsappService from './whatsappService.js';
import {
  getPlatformWhatsAppConfig,
  PLATFORM_TEMPLATE_KEYS,
} from '../config/platformWhatsApp.js';
import { normalizePhone } from '../utils/normalizePhone.js';
import logger from '../utils/logger.js';

/**
 * Send a template from the Replysys platform WABA (not the recipient's tenant WABA).
 */
class PlatformWhatsAppService {
  getConfig() {
    return getPlatformWhatsAppConfig();
  }

  resolveTemplateName(templateKey) {
    const cfg = this.getConfig();
    return cfg.templates[templateKey] || null;
  }

  async sendTemplate({
    templateKey,
    recipientPhone,
    params = [],
    metadata = {},
  }) {
    const cfg = this.getConfig();
    const templateName = cfg.templates[templateKey];

    if (!cfg.isConfigured) {
      logger.warn('Platform WhatsApp not configured — skip send', { templateKey });
      return {
        success: false,
        skipped: true,
        reason: 'PLATFORM_NOT_CONFIGURED',
      };
    }

    if (!templateName) {
      return {
        success: false,
        skipped: true,
        reason: 'TEMPLATE_NOT_CONFIGURED',
        templateKey,
      };
    }

    const phone = normalizePhone(recipientPhone);
    if (!phone) {
      return { success: false, skipped: true, reason: 'INVALID_RECIPIENT_PHONE' };
    }

    try {
      const result = await whatsappService.sendTemplateMessage(
        cfg.accountId,
        cfg.phoneNumberId,
        phone,
        templateName,
        params.map((p) => String(p)),
        {
          source: 'platform',
          platformEvent: templateKey,
          skipBillingDebit: true,
          ...metadata,
        }
      );

      return {
        success: Boolean(result?.success),
        messageId: result?.messageId,
        error: result?.error,
      };
    } catch (error) {
      logger.error('Platform WhatsApp send failed', {
        templateKey,
        templateName,
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  async sendLoginOtp(phone, code) {
    return this.sendTemplate({
      templateKey: PLATFORM_TEMPLATE_KEYS.LOGIN_OTP,
      recipientPhone: phone,
      params: [code],
      metadata: { eventType: 'login_otp' },
    });
  }

  async sendSignupOtp(phone, code) {
    return this.sendTemplate({
      templateKey: PLATFORM_TEMPLATE_KEYS.SIGNUP_OTP,
      recipientPhone: phone,
      params: [code],
      metadata: { eventType: 'signup_otp' },
    });
  }

  async sendWelcome(phone, name, planName) {
    return this.sendTemplate({
      templateKey: PLATFORM_TEMPLATE_KEYS.WELCOME,
      recipientPhone: phone,
      params: [name || 'there', planName || 'Plan'],
      metadata: { eventType: 'welcome' },
    });
  }

  async sendPaymentReminder(phone, name, plan, billingCycle, paymentLink) {
    return this.sendTemplate({
      templateKey: PLATFORM_TEMPLATE_KEYS.PAYMENT_REMINDER,
      recipientPhone: phone,
      params: [
        name || 'Customer',
        plan || 'Starter',
        billingCycle || 'monthly',
        paymentLink || '',
      ],
      metadata: { eventType: 'payment_reminder' },
    });
  }

  async sendLowCredit(phone, name, balance) {
    return this.sendTemplate({
      templateKey: PLATFORM_TEMPLATE_KEYS.LOW_CREDIT,
      recipientPhone: phone,
      params: [name || 'Customer', String(balance ?? 0)],
      metadata: { eventType: 'low_credit' },
    });
  }

  async sendRenewalReminder(phone, name, planName, renewalDateStr) {
    return this.sendTemplate({
      templateKey: PLATFORM_TEMPLATE_KEYS.RENEWAL_REMINDER,
      recipientPhone: phone,
      params: [name || 'Customer', planName || 'Plan', renewalDateStr || ''],
      metadata: { eventType: 'renewal_reminder' },
    });
  }
}

export default new PlatformWhatsAppService();
