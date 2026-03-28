/**
 * COMPANY: Messages
 * Send messages for ReplySQL company (accountId: 2600000)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;
const COMPANY_ACCOUNT_ID = '2600000';

// GET messages for company conversation (company-only)
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    // Verify this is company account
    if (accountId !== COMPANY_ACCOUNT_ID) {
      return sendError(res, 'Access denied - Company account only', 403);
    }

    const conversation = await db().collection('conversations').findOne({
      _id: new mongoose.Types.ObjectId(conversationId),
      accountId: COMPANY_ACCOUNT_ID
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found', 404);
    }

    const messages = await db().collection('messages').find({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      accountId: COMPANY_ACCOUNT_ID
    }).sort({ createdAt: -1 }).toArray();

    return sendSuccess(res, { conversation, messages }, 'Company messages');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// POST send company message (company-only)
router.post('/send', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { phoneNumberId, recipientPhone, message } = req.body;

    // Verify this is company account
    if (accountId !== COMPANY_ACCOUNT_ID) {
      return sendError(res, 'Access denied - Company account only', 403);
    }

    if (!phoneNumberId || !recipientPhone || !message) {
      return sendError(res, 'phoneNumberId, recipientPhone, and message required', 400);
    }

    // Verify phone belongs to company
    const phone = await db().collection('phones').findOne({
      _id: new mongoose.Types.ObjectId(phoneNumberId),
      accountId: COMPANY_ACCOUNT_ID
    });

    if (!phone) {
      return sendError(res, 'Phone not found', 404);
    }

    const newMessage = {
      accountId: COMPANY_ACCOUNT_ID,
      phoneNumberId: new mongoose.Types.ObjectId(phoneNumberId),
      recipientPhone,
      message,
      direction: 'outbound',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db().collection('messages').insertOne(newMessage);

    return sendSuccess(res, { ...newMessage, _id: result.insertedId }, 'Company message sent', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
