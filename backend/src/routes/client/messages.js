/**
 * CLIENT: Messages
 * Send and manage WhatsApp messages (tenant isolated)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET messages for conversation (tenant isolated)
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const accountId = req.user.accountId; // From JWT - tenant filter

    // Verify conversation belongs to this account
    const conversation = await db().collection('conversations').findOne({
      _id: new mongoose.Types.ObjectId(conversationId),
      accountId
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found', 404);
    }

    // Get messages for this conversation
    const messages = await db().collection('messages').find({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      accountId
    }).sort({ createdAt: -1 }).toArray();

    return sendSuccess(res, { conversation, messages }, 'Conversation messages');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// POST send message (tenant isolated)
router.post('/send', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { phoneNumberId, recipientPhone, message, template } = req.body;

    if (!phoneNumberId || !recipientPhone || !message) {
      return sendError(res, 'phoneNumberId, recipientPhone, and message required', 400);
    }

    // Verify phone belongs to account
    const phone = await db().collection('phones').findOne({
      _id: new mongoose.Types.ObjectId(phoneNumberId),
      accountId
    });

    if (!phone) {
      return sendError(res, 'Phone not found', 404);
    }

    // Create message record
    const newMessage = {
      accountId,
      phoneNumberId: new mongoose.Types.ObjectId(phoneNumberId),
      recipientPhone,
      message,
      template: template || null,
      direction: 'outbound',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db().collection('messages').insertOne(newMessage);

    // TODO: Queue for WhatsApp API sending

    return sendSuccess(res, { ...newMessage, _id: result.insertedId }, 'Message sent', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// POST reply to conversation (tenant isolated)
router.post('/:conversationId/reply', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { conversationId } = req.params;
    const { message } = req.body;

    if (!message) {
      return sendError(res, 'Message required', 400);
    }

    // Verify conversation belongs to account
    const conversation = await db().collection('conversations').findOne({
      _id: new mongoose.Types.ObjectId(conversationId),
      accountId
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found', 404);
    }

    // Create reply message
    const newMessage = {
      accountId,
      conversationId: new mongoose.Types.ObjectId(conversationId),
      message,
      direction: 'outbound',
      status: 'sent',
      createdAt: new Date()
    };

    const result = await db().collection('messages').insertOne(newMessage);

    // Update conversation last message timestamp
    await db().collection('conversations').updateOne(
      { _id: new mongoose.Types.ObjectId(conversationId) },
      { $set: { lastMessageAt: new Date() } }
    );

    return sendSuccess(res, { ...newMessage, _id: result.insertedId }, 'Reply sent', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
