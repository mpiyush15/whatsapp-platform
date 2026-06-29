/**
 * CLIENT: Conversations
 * Manage own conversations (tenant isolated)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET all conversations (tenant isolated)
router.get('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    const conversations = await db().collection('conversations').find({
      accountId
    }).sort({ lastMessageAt: -1 }).toArray();

    return sendSuccess(res, conversations, 'Your conversations');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// GET conversation by ID (with tenant verification)
router.get('/:conversationId', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { conversationId } = req.params;

    const conversation = await db().collection('conversations').findOne({
      _id: new mongoose.Types.ObjectId(conversationId),
      accountId
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found', 404);
    }

    // Get recent messages
    const messages = await db().collection('messages').find({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      accountId
    }).sort({ createdAt: -1 }).limit(50).toArray();

    return sendSuccess(res, { ...conversation, messages });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// UPDATE conversation status (tenant isolated)
router.put('/:conversationId/status', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { conversationId } = req.params;
    const { status } = req.body;

    if (!status) {
      return sendError(res, 'Status required', 400);
    }

    const result = await db().collection('conversations').findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(conversationId), accountId },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return sendError(res, 'Conversation not found', 404);
    }

    return sendSuccess(res, result.value, 'Conversation updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
