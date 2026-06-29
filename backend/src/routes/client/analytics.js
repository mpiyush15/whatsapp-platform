/**
 * CLIENT: Analytics
 * Own usage analytics (tenant isolated)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET dashboard stats (tenant isolated)
router.get('/dashboard', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    // Get stats
    const totalMessages = await db().collection('messages').countDocuments({ accountId });
    const totalContacts = await db().collection('contacts').countDocuments({ accountId });
    const activeConversations = await db().collection('conversations').countDocuments({
      accountId,
      status: 'active'
    });

    // Get today's messages
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMessages = await db().collection('messages').countDocuments({
      accountId,
      createdAt: { $gte: today }
    });

    const stats = {
      totalMessages,
      totalContacts,
      activeConversations,
      todayMessages,
      accountId
    };

    return sendSuccess(res, stats, 'Dashboard stats');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// GET message stats over time (tenant isolated)
router.get('/messages', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { startDate, endDate } = req.query;

    const query = { accountId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Get daily message counts
    const stats = await db().collection('messages').aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    return sendSuccess(res, stats, 'Message stats');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
