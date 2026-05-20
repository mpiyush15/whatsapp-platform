import Contact from '../models/Contact.js';
import whatsappService from './whatsappService.js';
import logger from '../utils/logger.js';
import broadcastRepository from '../repositories/broadcastRepository.js';
import { dispatchWebhookEvent } from './webhookDispatcherService.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
export class BroadcastExecutionService {
  constructor() {
    this.THROTTLE_RATES = {
      newPhone: 1,
      youngPhone: 5,
      establishedPhone: 50
    };
  }

  /**
   * Get throttle rate based on phone number age
   */
  async getThrottleRate(phoneConfig) {
    if (!phoneConfig.createdAt) return this.THROTTLE_RATES.establishedPhone;

    const ageInDays = (Date.now() - new Date(phoneConfig.createdAt)) / (1000 * 60 * 60 * 24);

    if (ageInDays < 1) return this.THROTTLE_RATES.newPhone;
    if (ageInDays < 7) return this.THROTTLE_RATES.youngPhone;
    return this.THROTTLE_RATES.establishedPhone;
  }

  /**
   * Execute broadcast with throttling
   */
  async executeBroadcast(accountId, broadcastId, phoneNumberId) {
    // ⚠️ CRITICAL: Ensure accountId is string for conversationId consistency
    const accountIdStr = accountId.toString ? accountId.toString() : accountId;
    
    const broadcast = await broadcastRepository.findById(broadcastId, accountId);

    if (!broadcast) {
      throw new NotFoundError('Broadcast not found');
    }

    if (broadcast.status !== 'running' && broadcast.status !== 'draft') {
      throw new Error(`Cannot execute broadcast with status: ${broadcast.status}`);
    }

    logger.info(`\n${'═'.repeat(60)}`);
    logger.info(`📢 STARTING BROADCAST EXECUTION`);
    logger.info(`${'═'.repeat(60)}`);
    logger.info(`Broadcast ID: ${broadcastId}`);
    logger.info(`Account ID: ${accountIdStr}`);
    logger.info(`Phone Number ID: ${phoneNumberId}`);
    logger.info(`Message Type: ${broadcast.messageType}`);

    // Get all recipients
    const recipients = await this.buildRecipientList(accountId, broadcast.recipients);

    logger.info(`Recipients Count: ${recipients.length}\n`);

    if (recipients.length === 0) {
      logger.info('⚠️  No recipients found, marking as completed\n');
      await broadcastRepository.updateStatus(broadcastId, 'completed', {
        completedAt: new Date(),
        'stats.inProgress': 0,
        'stats.pending': 0,
      });
      return;
    }

    // Build a Set of phones already sent (crash recovery: skip duplicates on resume)
    const alreadySent = new Set(broadcast.sentPhones || []);
    if (alreadySent.size > 0) {
      logger.info(`⏭️  Skipping ${alreadySent.size} already-sent recipients (resume mode)`);
    }

    // Resume-safe counters: carry forward previous persisted stats when available.
    // `sent` should never be lower than count of `sentPhones`.
    let sent = Math.max(Number(broadcast.stats?.sent || 0), alreadySent.size);
    let failed = Number(broadcast.stats?.failed || 0);
    const initialPending = Math.max(recipients.length - sent - failed, 0);

    // Start execution — mark running via repository
    await broadcastRepository.updateStatus(broadcastId, 'running', {
      startedAt: new Date(),
      'stats.inProgress': initialPending,
      'stats.pending': initialPending,
      'stats.sent': sent,
      'stats.failed': failed,
    });

    // Process messages with throttling
    const throttleRate = broadcast.throttleRate || 50;
    const messageDelayMs = 1000 / throttleRate;

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      // ✅ Crash recovery: skip phones already delivered on a previous run
      if (alreadySent.has(recipient)) {
        logger.info(`⏭️  [${i + 1}/${recipients.length}] Already sent to ${recipient} — skipping`);
        continue;
      }

      try {
        // Send message (pass accountIdStr for consistent conversationId format)
        await this.sendBroadcastMessage(accountIdStr, phoneNumberId, broadcast, recipient);
        sent++;
        alreadySent.add(recipient);

        // Persist the phone so a crash after this point won't re-send
        await broadcastRepository.markPhoneSent(broadcastId, recipient);

        logger.info(`✅ [${i + 1}/${recipients.length}] Message sent to ${recipient}`);

      } catch (error) {
        failed++;

        // Persist error log via repository
        await broadcastRepository.pushErrorLog(broadcastId, {
          phoneNumber: recipient,
          error: error.message,
          errorCode: error.code
        });

        logger.error(`❌ [${i + 1}/${recipients.length}] Failed to send to ${recipient}: ${error.message}`);
      }

      // Save progress stats every 10 messages
      if ((i + 1) % 10 === 0) {
        await broadcastRepository.saveProgress(broadcastId, {
          sent,
          failed,
          pending: Math.max(recipients.length - sent - failed, 0),
          inProgress: Math.max(recipients.length - i - 1, 0)
        });
      }

      // Throttling delay
      if (i < recipients.length - 1) {
        await this.sleep(messageDelayMs);
      }
    }

    // Final progress checkpoint so stats are exact even for batches < 10.
    await broadcastRepository.saveProgress(broadcastId, {
      sent,
      failed,
      pending: Math.max(recipients.length - sent - failed, 0),
      inProgress: 0,
    });

    // Mark as completed via repository
    await broadcastRepository.updateStatus(broadcastId, 'completed', {
      completedAt: new Date(),
      'stats.pending': 0,
      'stats.inProgress': 0,
    });

    logger.info(`\n${'═'.repeat(60)}`);
    logger.info(`✅ BROADCAST EXECUTION COMPLETED`);
    logger.info(`${'═'.repeat(60)}`);
    logger.info(`Total Sent: ${sent}/${recipients.length}`);
    logger.info(`Total Failed: ${failed}/${recipients.length}`);
    logger.info(`Success Rate: ${((sent / recipients.length) * 100).toFixed(2)}%`);
    logger.info(`${'═'.repeat(60)}\n`);

    dispatchWebhookEvent({
      accountId,
      projectId: broadcast?.projectId || null,
      eventType: 'broadcast.completed',
      payload: {
        broadcastId: String(broadcast?._id || broadcastId),
        totalRecipients: recipients.length,
        sent,
        failed,
      },
      source: 'broadcast-execution',
    }).catch((err) => logger.error('broadcast.completed webhook dispatch failed', err));

    return {
      broadcastId: broadcast._id,
      totalSent: sent,
      totalFailed: failed,
      status: 'completed'
    };
  }

  /**
   * Send individual broadcast message
   */
  async sendBroadcastMessage(accountId, phoneNumberId, broadcast, recipientPhone) {
    try {
      let messageId;
      
      // Validate phoneNumberId
      if (!phoneNumberId) {
        throw createAppError('Phone number ID is required for broadcast execution');
      }

      // Send based on message type
      if (broadcast.messageType === 'text') {
        const result = await whatsappService.sendTextMessage(
          accountId,
          phoneNumberId,
          recipientPhone,
          broadcast.content.text,
          {
            broadcastId: broadcast._id.toString(),
            projectId: broadcast.projectId || null,
          }
        );
        messageId = result.messageId;

      } else if (broadcast.messageType === 'template') {
        const result = await whatsappService.sendTemplateMessage(
          accountId,
          phoneNumberId,
          recipientPhone,
          broadcast.content.templateName,
          broadcast.content.templateParams,
          {
            broadcastId: broadcast._id.toString(),
            projectId: broadcast.projectId || null,
          }
        );
        messageId = result.messageId;

      } else if (broadcast.messageType === 'media') {
        const result = await whatsappService.sendMediaMessage(
          accountId,
          phoneNumberId,
          recipientPhone,
          broadcast.content.mediaType,
          broadcast.content.mediaUrl,
          {
            broadcastId: broadcast._id.toString(),
            projectId: broadcast.projectId || null,
          }
        );
        messageId = result.messageId;
      }

      // Message record, conversation link, Meta billing category, and credit debit
      // are handled inside whatsappService — avoid duplicate DB rows.
      return { success: true, messageId };

    } catch (error) {
      logger.error(`❌ [BROADCAST ERROR] Failed to send to ${recipientPhone}:`);
      logger.error(`   Error: ${error.message}`);
      logger.error(`   Type: ${error.response?.status || error.code || 'Unknown'}`);
      if (error.response?.data?.error) {
        logger.error(`   API Details: ${JSON.stringify(error.response.data.error)}`);
      }
      if (error.code === 11000) {
        logger.error(`   Issue: Duplicate key on MongoDB - likely concurrent write conflict`);
      }
      throw error;
    }
  }

  /**
   * Build recipient list
   */
  async buildRecipientList(accountId, recipients) {
    const phoneNumbers = [];

    if (recipients.phoneNumbers) {
      // Filter out null/undefined phone numbers
      const validPhones = recipients.phoneNumbers.filter(p => p && typeof p === 'string' && p.trim());
      phoneNumbers.push(...validPhones);
    }

    if (recipients.contactIds && recipients.contactIds.length > 0) {
      const contacts = await Contact.find({
        _id: { $in: recipients.contactIds },
        accountId
      }).select('phone whatsappNumber');

      // Get phone numbers - prefer whatsappNumber, fallback to phone
      const contactPhones = contacts
        .map(c => c.whatsappNumber || c.phone)
        .filter(p => p && typeof p === 'string' && p.trim());

      phoneNumbers.push(...contactPhones);
    }

    // Filter out any null/undefined values before returning
    const cleanedNumbers = phoneNumbers.filter(p => p && typeof p === 'string' && p.trim());
    return [...new Set(cleanedNumbers)];
  }

  /**
   * Sleep utility for throttling
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Resume interrupted broadcast
   */
  async resumeBroadcast(accountId, broadcastId, phoneNumberId) {
    const broadcast = await broadcastRepository.findById(broadcastId, accountId);

    if (!broadcast) {
      throw new NotFoundError('Broadcast not found');
    }

    // Resume execution from where it left off
    return this.executeBroadcast(accountId, broadcastId, phoneNumberId);
  }
}

export default new BroadcastExecutionService();
