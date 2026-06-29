/**
 * CLIENT: Broadcasts
 * Send broadcast messages to contacts (tenant isolated)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET all broadcasts (tenant isolated)
router.get('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    const broadcasts = await db().collection('broadcasts').find({
      accountId
    }).sort({ createdAt: -1 }).toArray();

    return sendSuccess(res, broadcasts, 'Your broadcasts');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// CREATE broadcast (tenant isolated)
router.post('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { title, message, recipientList = [] } = req.body;

    if (!title || !message) {
      return sendError(res, 'Title and message required', 400);
    }

    const newBroadcast = {
      accountId,
      title,
      message,
      recipientList,
      recipientCount: recipientList.length,
      status: 'draft',
      sentAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db().collection('broadcasts').insertOne(newBroadcast);
    return sendSuccess(res, { ...newBroadcast, _id: result.insertedId }, 'Broadcast created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// GET broadcast progress (tenant isolated)
router.get('/:broadcastId', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { broadcastId } = req.params;

    const broadcast = await db().collection('broadcasts').findOne({
      _id: new mongoose.Types.ObjectId(broadcastId),
      accountId
    });

    if (!broadcast) {
      return sendError(res, 'Broadcast not found', 404);
    }

    return sendSuccess(res, broadcast, 'Broadcast details');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
