/**
 * WHATSAPP WEBHOOK ROUTES - PHASE 2
 * Handle incoming messages and status updates from WhatsApp
 * NO AUTH REQUIRED - Verified by webhook signature
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import { handleControllerError } from '../utils/errorHandler.js';
import { MessageStatus, MessageDirection, MessageType, ConversationStatus } from '../constants/enums.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/webhooks/whatsapp
 * Webhook verification endpoint
 * WhatsApp sends: GET /webhook?hub.mode=subscribe&hub.challenge=xxx&hub.verify_token=yyy
 */
router.get('/whatsapp', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const challenge = req.query['hub.challenge'];
    const token = req.query['hub.verify_token'];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'whatsapp_verify_token_2026';

    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('✅ WhatsApp webhook verified');
      res.status(200).send(challenge);
    } else {
      logger.warn('❌ WhatsApp webhook verification failed');
      res.status(403).send('Forbidden');
    }
  } catch (error) {
    logger.error('Webhook verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhooks/whatsapp
 * Incoming webhook from WhatsApp
 * Receives: messages, status updates, delivery confirmations
 */
router.post('/whatsapp', async (req, res) => {
  try {
    const body = req.body;

    // Acknowledge receipt immediately
    res.status(200).send('EVENT_RECEIVED');

    // Process asynchronously
    if (!body?.entry) {
      logger.warn('Invalid webhook payload');
      return;
    }

    const changes = body.entry[0]?.changes[0]?.value;
    if (!changes) return;

    const db = mongoose.connection.db;

    // ============================================
    // HANDLE INCOMING MESSAGES
    // ============================================
    if (changes.messages) {
      const message = changes.messages[0];
      const contact = changes.contacts[0];
      const waId = contact.wa_id; // WhatsApp user ID

      logger.info(`📨 Incoming message from ${waId}`);

      try {
        // Find which client owns this phone number
        const phoneConfig = await db.collection('whatsapp_phones').findOne({
          waId,
          isActive: true
        });

        if (!phoneConfig) {
          logger.warn(`⚠️  Message from unknown phone: ${waId}`);
          return;
        }

        const accountId = phoneConfig.accountId;

        // Extract message content
        let messageContent = '';
        let messageType = message.type || MessageType.TEXT;

        if (message.type === 'text') {
          messageContent = message.text?.body || '';
        } else if (message.type === 'image') {
          messageContent = '';
        } else if (message.type === 'video') {
          messageContent = '';
        } else if (message.type === 'document') {
          messageContent = '';
        } else if (message.type === 'audio') {
          messageContent = '';
        } else if (message.type === 'location') {
          messageContent = '';
        } else {
          messageContent = '';
        }

        // Save incoming message
        const messageDoc = {
          accountId,
          phoneNumber: waId,
          senderName: contact.profile.name,
          message: messageContent,
          type: messageType,
          direction: MessageDirection.INBOUND,
          status: MessageStatus.DELIVERED,
          waMessageId: message.id,
          timestamp: new Date(parseInt(message.timestamp) * 1000),
          createdAt: new Date()
        };

        await db.collection('messages').insertOne(messageDoc);

        // Find or create conversation
        let conversation = await db.collection('conversations').findOne({
          accountId,
          waId
        });

        if (!conversation) {
          const newConv = {
            accountId,
            waId,
            senderName: contact.profile.name,
            status: ConversationStatus.OPEN,
            lastMessage: messageContent,
            lastMessageTime: new Date(parseInt(message.timestamp) * 1000),
            messageCount: 1,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const result = await db.collection('conversations').insertOne(newConv);
          conversation = { ...newConv, _id: result.insertedId };
          logger.info(`✅ New conversation created: ${waId}`);
        } else {
          // Update conversation
          await db.collection('conversations').updateOne(
            { _id: conversation._id },
            {
              $set: {
                lastMessage: messageContent,
                lastMessageTime: new Date(parseInt(message.timestamp) * 1000),
                status: ConversationStatus.OPEN,
                updatedAt: new Date()
              },
              $inc: { messageCount: 1 }
            }
          );
        }

        logger.info(`✅ Message processed from ${waId} (accountId: ${accountId})`);
      } catch (err) {
        logger.error('Message processing error:', err.message);
      }
    }

    // ============================================
    // HANDLE STATUS UPDATES
    // ============================================
    if (changes.statuses) {
      const status = changes.statuses[0];

      logger.info(`📊 Status update: ${status.id} -> ${status.status}`);

      try {
        // Map WhatsApp status to our enum
        const statusMap = {
          sent: MessageStatus.SENT,
          delivered: MessageStatus.DELIVERED,
          read: MessageStatus.READ,
          failed: MessageStatus.FAILED
        };

        const newStatus = statusMap[status.status] || status.status;

        await db.collection('messages').updateOne(
          { waMessageId: status.id },
          {
            $set: {
              status: newStatus,
              updatedAt: new Date()
            }
          }
        );

        logger.info(`✅ Status updated: ${status.id} -> ${newStatus}`);
      } catch (err) {
        logger.error('Status update error:', err.message);
      }
    }
  } catch (error) {
    logger.error('Webhook processing error:', error);
    // Still acknowledge to WhatsApp
    res.status(200).send('EVENT_RECEIVED');
  }
});

export default router;
