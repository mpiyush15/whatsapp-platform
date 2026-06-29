/**
 * SUPERADMIN: Payments Management
 * View all payments, handle disputes, refunds
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET all payments (superadmin only)
router.get('/', async (req, res) => {
  try {
    const payments = await db().collection('payments').find({}).sort({ createdAt: -1 }).toArray();
    return sendSuccess(res, payments, 'All payments');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// GET payment by ID
router.get('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await db().collection('payments').findOne({
      _id: new mongoose.Types.ObjectId(paymentId)
    });

    if (!payment) {
      return sendError(res, 'Payment not found', 404);
    }

    return sendSuccess(res, payment);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// Issue refund
router.post('/:paymentId/refund', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    if (!amount) {
      return sendError(res, 'Refund amount required', 400);
    }

    const payment = await db().collection('payments').findOne({
      _id: new mongoose.Types.ObjectId(paymentId)
    });

    if (!payment) {
      return sendError(res, 'Payment not found', 404);
    }

    // Create refund record
    const refund = {
      paymentId: new mongoose.Types.ObjectId(paymentId),
      accountId: payment.accountId,
      amount,
      reason: reason || '',
      status: 'pending',
      createdAt: new Date()
    };

    await db().collection('refunds').insertOne(refund);

    // Update payment status
    const updated = await db().collection('payments').findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(paymentId) },
      { $set: { status: 'refunded', updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    return sendSuccess(res, updated.value, 'Refund issued', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
