/**
 * WHATSAPP MESSAGE ROUTES - PHASE 2
 * Send and receive messages
 * All routes use tenantAuth + clientOnly middleware
 */

import express from 'express';
import mongoose from 'mongoose';
import { tenantAuth, clientOnly } from '../middleware/tenantAuth.js';
import { sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import { handleControllerError } from '../utils/errorHandler.js';
import { MessageType, MessageStatus, ConversationStatus } from '../constants/enums.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/client/messages/conversation/:conversationId
 * Get all messages in a conversation
 * Uses tenant isolation automatically via middleware
 */
router.get(
  '/conversation/:conversationId',
  tenantAuth,
  clientOnly,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const accountId = req.user.accountId;
      const db = mongoose.connection.db;

      // Verify conversation belongs to this account
      const conversation = await db.collection('conversations').findOne({
        _id: mongoose.Types.ObjectId.isValid(conversationId) ? new mongoose.Types.ObjectId(conversationId) : conversationId,
        accountId
      });

      if (!conversation) {
        return sendValidationError(res, 'Conversation not found');
      }

      // Get all messages
      const messages = await db.collection('messages')
        .find({
          accountId,
          conversationId: conversation._id || conversationId
        })
        .sort({ timestamp: 1 })
        .toArray();

      return sendSuccess(
        res,
        { messages, conversationId, total: messages.length },
        'Messages retrieved'
      );
    } catch (error) {
      return handleControllerError(res, error, 'getConversationMessages');
    }
  }
);

/**
 * POST /api/client/messages/send
 * Send a text message
 * Body: { phoneNumber, message, conversationId? }
 */
router.post(
  '/send',
  tenantAuth,
  clientOnly,
  async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;
      const accountId = req.user.accountId;

      // Validation
      if (!phoneNumber) {
        return sendValidationError(res, 'Phone number required');
      }
      if (!message) {
        return sendValidationError(res, 'Message text required');
      }

      const db = mongoose.connection.db;

      // Save message
      const messageDoc = {
        accountId,
        phoneNumber,
        message,
        type: MessageType.TEXT,
        direction: 'outbound',
        status: MessageStatus.QUEUED,
        timestamp: new Date(),
        createdAt: new Date()
      };

      const result = await db.collection('messages').insertOne(messageDoc);

      logger.info(`Message queued from ${accountId} to ${phoneNumber}`);

      return sendSuccess(
        res,
        {
          messageId: result.insertedId,
          status: MessageStatus.QUEUED,
          phoneNumber,
          timestamp: new Date()
        },
        'Message sent'
      );
    } catch (error) {
      return handleControllerError(res, error, 'sendMessage');
    }
  }
);

/**
 * POST /api/client/messages/send-template
 * Send a template message
 * Body: { phoneNumber, templateName, variables }
 */
router.post(
  '/send-template',
  tenantAuth,
  clientOnly,
  async (req, res) => {
    try {
      const { phoneNumber, templateName, variables } = req.body;
      const accountId = req.user.accountId;

      // Validation
      if (!phoneNumber) {
        return sendValidationError(res, 'Phone number required');
      }
      if (!templateName) {
        return sendValidationError(res, 'Template name required');
      }

      const db = mongoose.connection.db;

      // Verify template exists and belongs to account
      const template = await db.collection('templates').findOne({
        accountId,
        name: templateName
      });

      if (!template) {
        return sendValidationError(res, 'Template not found');
      }

      // Save message
      const messageDoc = {
        accountId,
        phoneNumber,
        template: templateName,
        variables: variables || {},
        type: MessageType.TEMPLATE,
        direction: 'outbound',
        status: MessageStatus.QUEUED,
        timestamp: new Date(),
        createdAt: new Date()
      };

      const result = await db.collection('messages').insertOne(messageDoc);

      logger.info(`Template message queued from ${accountId}`);

      return sendSuccess(
        res,
        {
          messageId: result.insertedId,
          status: MessageStatus.QUEUED,
          template: templateName
        },
        'Template message sent'
      );
    } catch (error) {
      return handleControllerError(res, error, 'sendTemplateMessage');
    }
  }
);

/**
 * GET /api/client/conversations
 * List all conversations for this client
 */
router.get(
  '/',
  tenantAuth,
  clientOnly,
  async (req, res) => {
    try {
      const accountId = req.user.accountId;
      const db = mongoose.connection.db;

      const conversations = await db.collection('conversations')
        .find({ accountId })
        .sort({ updatedAt: -1 })
        .toArray();

      return sendSuccess(
        res,
        { conversations, total: conversations.length },
        'Conversations retrieved'
      );
    } catch (error) {
      return handleControllerError(res, error, 'getConversations');
    }
  }
);

/**
 * PUT /api/client/conversations/:conversationId/close
 * Close a conversation
 */
router.put(
  '/:conversationId/close',
  tenantAuth,
  clientOnly,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const accountId = req.user.accountId;
      const db = mongoose.connection.db;

      const result = await db.collection('conversations').updateOne(
        {
          _id: mongoose.Types.ObjectId.isValid(conversationId) ? new mongoose.Types.ObjectId(conversationId) : conversationId,
          accountId
        },
        {
          $set: {
            status: ConversationStatus.CLOSED,
            closedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        return sendValidationError(res, 'Conversation not found');
      }

      return sendSuccess(res, { conversationId }, 'Conversation closed');
    } catch (error) {
      return handleControllerError(res, error, 'closeConversation');
    }
  }
);

/**
 * PUT /api/client/conversations/:conversationId/mark-read
 * Mark all messages as read
 */
router.put(
  '/:conversationId/mark-read',
  tenantAuth,
  clientOnly,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const accountId = req.user.accountId;
      const db = mongoose.connection.db;

      await db.collection('messages').updateMany(
        {
          accountId,
          conversationId: mongoose.Types.ObjectId.isValid(conversationId) ? new mongoose.Types.ObjectId(conversationId) : conversationId,
          status: { $ne: MessageStatus.READ }
        },
        {
          $set: {
            status: MessageStatus.READ,
            updatedAt: new Date()
          }
        }
      );

      return sendSuccess(res, { conversationId }, 'Messages marked as read');
    } catch (error) {
      return handleControllerError(res, error, 'markAsRead');
    }
  }
);

export default router;
