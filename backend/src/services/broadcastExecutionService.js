import Broadcast from '../models/Broadcast.js';
import Message from '../models/Message.js';
import Contact from '../models/Contact.js';
import whatsappService from './whatsappService.js';
import logger from '../utils/logger.js';

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
    
    const broadcast = await Broadcast.findOne({
      _id: broadcastId,
      accountId
    });

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
      broadcast.status = 'completed';
      broadcast.completedAt = new Date();
      await broadcast.save();
      return;
    }

    // Start execution
    broadcast.status = 'running';
    broadcast.stats.inProgress = recipients.length;
    broadcast.stats.pending = recipients.length;
    broadcast.startedAt = new Date();
    await broadcast.save();

    // Process messages with throttling
    const throttleRate = broadcast.throttleRate || 50;
    const messageDelayMs = 1000 / throttleRate;

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      try {
        // Send message (pass accountIdStr for consistent conversationId format)
        await this.sendBroadcastMessage(accountIdStr, phoneNumberId, broadcast, recipient);
        sent++;

        broadcast.stats.sent = sent;
        broadcast.stats.inProgress = recipients.length - i - 1;
        broadcast.stats.pending = recipients.length - sent;
        logger.info(`✅ [${i + 1}/${recipients.length}] Message sent to ${recipient}`);

      } catch (error) {
        failed++;
        const errorDetails = {
          phoneNumber: recipient,
          error: error.message,
          errorCode: error.code,
          timestamp: new Date()
        };
        broadcast.errorLog.push(errorDetails);

        broadcast.stats.failed = failed;
        broadcast.stats.inProgress = recipients.length - i - 1;
        broadcast.stats.pending = recipients.length - sent;
        
        logger.error(`❌ [${i + 1}/${recipients.length}] Failed to send to ${recipient}: ${error.message}`);
      }

      // Save progress every 10 messages
      if ((i + 1) % 10 === 0) {
        await broadcast.save();
      }

      // Throttling delay
      if (i < recipients.length - 1) {
        await this.sleep(messageDelayMs);
      }
    }

    // Mark as completed
    broadcast.status = 'completed';
    broadcast.completedAt = new Date();
    await broadcast.save();

    logger.info(`\n${'═'.repeat(60)}`);
    logger.info(`✅ BROADCAST EXECUTION COMPLETED`);
    logger.info(`${'═'.repeat(60)}`);
    logger.info(`Total Sent: ${sent}/${recipients.length}`);
    logger.info(`Total Failed: ${failed}/${recipients.length}`);
    logger.info(`Success Rate: ${((sent / recipients.length) * 100).toFixed(2)}%`);
    logger.info(`${'═'.repeat(60)}\n`);

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
          { broadcastId: broadcast._id.toString() }
        );
        messageId = result.messageId;

      } else if (broadcast.messageType === 'template') {
        const result = await whatsappService.sendTemplateMessage(
          accountId,
          phoneNumberId,
          recipientPhone,
          broadcast.content.templateName,
          broadcast.content.templateParams,
          { broadcastId: broadcast._id.toString() }
        );
        messageId = result.messageId;

      } else if (broadcast.messageType === 'media') {
        const result = await whatsappService.sendMediaMessage(
          accountId,
          phoneNumberId,
          recipientPhone,
          broadcast.content.mediaType,
          broadcast.content.mediaUrl,
          { broadcastId: broadcast._id.toString() }
        );
        messageId = result.messageId;
      }

      // ✅ FIX: Find or create conversation FIRST (required for message.conversationId)
      const Conversation = (await import('../models/Conversation.js')).default;
      const workspaceId = broadcast.workspaceId || accountId; // Use broadcast workspace or account
      
      const conversationDocId = `${accountId}_${phoneNumberId}_${recipientPhone}`;
      
      // ✅ CRITICAL FIX FOR CONCURRENT BROADCASTS:
      // Retry upsert with exponential backoff to handle E11000 duplicate key errors
      // This happens when multiple broadcast messages try to create the same conversation
      let conversation;
      let retries = 3;
      let lastError;
      
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          conversation = await Conversation.findOneAndUpdate(
            {
              accountId,
              phoneNumberId,
              userPhone: recipientPhone
            },
            {
              $setOnInsert: {
                accountId,
                workspaceId,
                phoneNumberId,
                userPhone: recipientPhone,
                conversationId: conversationDocId,
                startedAt: new Date()
              },
              $set: {
                lastMessageAt: new Date(),
                status: 'open'
              }
            },
            { 
              upsert: true, 
              new: true,
              runValidators: false
            }
          );
          break; // Success
        } catch (error) {
          lastError = error;
          if (error.code === 11000 && attempt < retries - 1) {
            // Duplicate key error - wait and retry
            await this.sleep(Math.pow(2, attempt) * 100); // Exponential backoff: 100ms, 200ms, 400ms
            continue;
          }
          
          // If it's the last attempt or not a duplicate key error, fallback to findOne
          if (error.code === 11000) {
            console.warn(`⚠️  Duplicate key on conversation upsert, attempting to find existing conversation for ${recipientPhone}`);
            conversation = await Conversation.findOne({
              accountId,
              phoneNumberId,
              userPhone: recipientPhone
            });
            
            if (conversation) {
              // Update lastMessageAt
              conversation.lastMessageAt = new Date();
              conversation.status = 'open';
              await conversation.save().catch(() => {}); // Silent fail, we have the object
              break;
            }
          }
          
          throw error;
        }
      }
      
      // Final check - if conversation is still null, throw the last error
      if (!conversation) {
        throw lastError || new Error('Failed to create/find conversation');
      }

      // ✅ CRITICAL FIX: Normalize messageType to frontend-compatible types
      // Frontend only accepts: text, image, video, audio, document, location
      let normalizedMessageType = broadcast.messageType;
      
      if (broadcast.messageType === 'template') {
        // Templates are text-based messages
        normalizedMessageType = 'text';
      } else if (broadcast.messageType === 'media') {
        // Detect media type from content
        if (broadcast.content?.mediaType === 'image') {
          normalizedMessageType = 'image';
        } else if (broadcast.content?.mediaType === 'video') {
          normalizedMessageType = 'video';
        } else if (broadcast.content?.mediaType === 'audio') {
          normalizedMessageType = 'audio';
        } else if (broadcast.content?.mediaType === 'document') {
          normalizedMessageType = 'document';
        } else {
          // Fallback: treat as text if type unclear
          normalizedMessageType = 'text';
        }
      }
      
      // Validate it's one of the 6 supported types
      const supportedTypes = ['text', 'image', 'video', 'audio', 'document', 'location'];
      if (!supportedTypes.includes(normalizedMessageType)) {
        normalizedMessageType = 'text'; // Safe fallback
      }

      // Log message to database WITH conversationId
      const message = new Message({
        accountId,
        phoneNumberId,
        conversationId: conversation._id,  // ✅ CRITICAL: Link to conversation
        waMessageId: messageId,
        recipientPhone,
        messageType: normalizedMessageType,  // ✅ NOW GUARANTEED TO BE FRONTEND-COMPATIBLE
        status: 'sent',
        direction: 'outbound',
        campaign: broadcast._id.toString(),
        content: broadcast.content
      });

      await message.save();

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
    const broadcast = await Broadcast.findOne({
      _id: broadcastId,
      accountId
    });

    if (!broadcast) {
      throw new NotFoundError('Broadcast not found');
    }

    // Resume execution from where it left off
    return this.executeBroadcast(accountId, broadcastId, phoneNumberId);
  }
}

export default new BroadcastExecutionService();
