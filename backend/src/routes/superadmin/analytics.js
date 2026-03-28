/**
 * SUPERADMIN: Analytics Dashboard
 * MRR, ARR, churn, growth metrics
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';
import { AccountType } from '../../constants/enums.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET dashboard metrics (all customers, superadmin only)
router.get('/dashboard', async (req, res) => {
  try {
    // Count active customers
    const activeCustomers = await db().collection('accounts').countDocuments({
      type: AccountType.CLIENT,
      status: 'active'
    });

    // Count new customers (this month)
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const newCustomers = await db().collection('accounts').countDocuments({
      type: AccountType.CLIENT,
      createdAt: { $gte: firstDayOfMonth }
    });

    // Calculate MRR (Monthly Recurring Revenue)
    // For simplicity: sum all active subscriptions
    const subscriptions = await db().collection('subscriptions').find({
      status: 'active'
    }).toArray();

    const mrr = subscriptions.reduce((sum, sub) => sum + (sub.monthlyPrice || 0), 0);
    const arr = mrr * 12;

    const metrics = {
      activeCustomers,
      newCustomers,
      mrr,
      arr,
      churnRate: 0, // TODO: Calculate from historical data
      totalMessages: await db().collection('messages').countDocuments()
    };

    return sendSuccess(res, metrics, 'Analytics dashboard');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// GET revenue metrics (superadmin only)
router.get('/revenue', async (req, res) => {
  try {
    // Get payments grouped by month
    const revenueData = await db().collection('payments').aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          },
          totalRevenue: { $sum: '$amount' },
          paymentCount: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 12 }
    ]).toArray();

    return sendSuccess(res, revenueData, 'Revenue metrics');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// GET growth metrics (superadmin only)
router.get('/growth', async (req, res) => {
  try {
    // Customer growth over time
    const growthData = await db().collection('accounts').aggregate([
      { $match: { type: AccountType.CLIENT } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          },
          newCustomers: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]).toArray();

    return sendSuccess(res, growthData, 'Growth metrics');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
