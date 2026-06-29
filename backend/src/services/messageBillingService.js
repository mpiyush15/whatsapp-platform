import Account from '../models/Account.js';
import Template from '../models/Template.js';
import CreditPackSettings from '../models/CreditPackSettings.js';
import creditLedgerService from './creditLedgerService.js';
import planLimitService from './planLimitService.js';
import { classifyOutboundMessage } from '../utils/messageCategory.js';
import logger from '../utils/logger.js';

async function creditsForCategoryFromSettings(category) {
  const settings = await CreditPackSettings.findOne({ isActive: true }).select('creditRates').lean();
  const rates = settings?.creditRates || {};
  const fallback = {
    marketing: Number(process.env.CREDIT_COST_MARKETING || 1),
    utility: Number(process.env.CREDIT_COST_UTILITY || 1),
    authentication: Number(process.env.CREDIT_COST_AUTHENTICATION || 1),
    service: Number(process.env.CREDIT_COST_SERVICE || 0),
  };
  return Number(rates[category] ?? fallback[category] ?? fallback.utility);
}

/**
 * Debit Replysys credits after a billable outbound message is sent.
 * Included plan messages (within monthly quota) are free.
 * Beyond quota, each billable message debits credits.
 */
export async function debitCreditsForOutboundMessage({
  accountId,
  message,
  skipIfInternal = true,
}) {
  if (!accountId || !message?._id) return { skipped: true, reason: 'missing_input' };

  try {
    if (skipIfInternal) {
      const account = await Account.findOne({ accountId }).select('isInternal creditBalance').lean();
      if (account?.isInternal) {
        return { skipped: true, reason: 'internal_account' };
      }
    }

    const billing = await planLimitService.getMessageBillingMode(
      accountId,
      message.projectId || null
    );
    if (billing.mode === 'included') {
      return { skipped: true, reason: 'included_in_plan_quota', billingMode: 'included' };
    }

    let templateCategoryByName = new Map();
    if (message.messageType === 'template' && message.content?.templateName) {
      const template = await Template.findOne({
        accountId,
        name: message.content.templateName,
      })
        .select('category')
        .lean();
      if (template) {
        templateCategoryByName = new Map([[template.name, template.category || 'utility']]);
      }
    }

    const category = classifyOutboundMessage(message, templateCategoryByName);
    const creditAmount = await creditsForCategoryFromSettings(category);
    if (creditAmount <= 0) {
      return { skipped: true, reason: 'zero_cost_category', category, billingMode: 'credits' };
    }

    const messageId = String(message._id);
    const result = await creditLedgerService.postLedgerEntry({
      accountId,
      entryType: 'usage_debit',
      amount: creditAmount,
      source: 'usage',
      referenceType: 'usage',
      referenceId: messageId,
      idempotencyKey: `usage:message:${messageId}`,
      note: `Message usage (${category}) — over plan quota`,
      metadata: {
        messageId,
        category,
        billingMode: 'credits',
        campaign: message.campaign || null,
        messageType: message.messageType,
        projectId: message.projectId || null,
        phoneNumberId: message.phoneNumberId,
      },
    });

    return {
      debited: true,
      category,
      creditAmount,
      billingMode: 'credits',
      isDuplicate: Boolean(result?.isDuplicate),
      balanceAfter: result?.balanceAfter,
    };
  } catch (error) {
    if (error.message === 'INSUFFICIENT_CREDITS') {
      logger.warn('Message sent but credit debit failed — insufficient balance', { accountId });
      return { debited: false, error: 'INSUFFICIENT_CREDITS' };
    }
    logger.error('debitCreditsForOutboundMessage failed:', error.message);
    return { debited: false, error: error.message };
  }
}

export default { debitCreditsForOutboundMessage };
