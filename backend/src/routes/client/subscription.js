/**
 * CLIENT: Subscription
 * View own subscription (read-only, tenant isolated)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET current subscription (tenant isolated, read-only)
router.get('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    const subscription = await db().collection('subscriptions').findOne({
      accountId
    });

    if (!subscription) {
      return sendError(res, 'Subscription not found', 404);
    }

    // Get plan details
    const plan = await db().collection('plans').findOne({
      _id: new mongoose.Types.ObjectId(subscription.planId)
    });

    return sendSuccess(res, { ...subscription, plan }, 'Subscription details');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// GET subscription usage (tenant isolated)
router.get('/usage', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    // Count messages this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const messagesUsed = await db().collection('messages').countDocuments({
      accountId,
      createdAt: { $gte: firstDayOfMonth }
    });

    const contactsUsed = await db().collection('contacts').countDocuments({
      accountId
    });

    // Get plan limits
    const subscription = await db().collection('subscriptions').findOne({ accountId });
    const plan = await db().collection('plans').findOne({
      _id: new mongoose.Types.ObjectId(subscription?.planId)
    });

    const usage = {
      messagesUsed,
      messagesLimit: plan?.maxMessages || null,
      contactsUsed,
      contactsLimit: plan?.maxContacts || null,
      storageUsed: 0, // TODO: Calculate
      storageLimit: 10000 // 10GB
    };

    return sendSuccess(res, usage, 'Usage stats');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
