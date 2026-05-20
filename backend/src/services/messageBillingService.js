import Account from '../models/Account.js';
import Template from '../models/Template.js';
import creditLedgerService from './creditLedgerService.js';
import { classifyOutboundMessage, creditsForCategory } from '../utils/messageCategory.js';
import logger from '../utils/logger.js';

/**
 * Debit Replysys credits after a billable outbound message is sent.
 * Idempotent per message _id. Skips internal accounts and zero-cost categories.
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
    const creditAmount = creditsForCategory(category);
    if (creditAmount <= 0) {
      return { skipped: true, reason: 'zero_cost_category', category };
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
      note: `Message usage (${category})`,
      metadata: {
        messageId,
        category,
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
      isDuplicate: Boolean(result?.isDuplicate),
      balanceAfter: result?.balanceAfter,
    };
  } catch (error) {
    logger.error('debitCreditsForOutboundMessage failed:', error.message);
    return { debited: false, error: error.message };
  }
}

export default { debitCreditsForOutboundMessage };
