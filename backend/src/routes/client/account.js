/**
 * CLIENT: Account Settings
 * Own account configuration (tenant isolated)
 */

import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET account settings (tenant isolated)
router.get('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    const account = await db().collection('accounts').findOne(
      { accountId },
      { projection: { password: 0 } }
    );

    if (!account) {
      return sendError(res, 'Account not found', 404);
    }

    // Dynamically override plan with active subscription if available
    const subscription = await db().collection('subscriptions').findOne({
      accountId,
      status: 'active'
    });
    
    if (subscription && subscription.planName) {
      account.plan = subscription.planName.toLowerCase();
    } else {
      const payment = await db().collection('payments').findOne({
        accountId,
        status: { $in: ['PAID', 'success', 'paid', 'completed'] }
      }, { sort: { createdAt: -1 } });
      if (payment && payment.planName) {
        account.plan = payment.planName.toLowerCase();
      }
    }

    return sendSuccess(res, account, 'Account settings');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// UPDATE account settings (tenant isolated)
router.put('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { companyName, timezone, language, phone } = req.body;

    const updateData = {};
    if (companyName) updateData.company = companyName;
    if (timezone) updateData.timezone = timezone;
    if (language) updateData.language = language;
    if (phone) updateData.phone = phone;
    updateData.updatedAt = new Date();

    const result = await db().collection('accounts').findOneAndUpdate(
      { accountId },
      { $set: updateData },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    if (!result.value) {
      return sendError(res, 'Account not found', 404);
    }

    return sendSuccess(res, result.value, 'Settings updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// UPDATE password (tenant isolated)
router.post('/change-password', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, 'Current and new password required', 400);
    }

    const account = await db().collection('accounts').findOne({ accountId });

    if (!account) {
      return sendError(res, 'Account not found', 404);
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, account.password);
    if (!passwordMatch) {
      return sendError(res, 'Current password incorrect', 401);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const result = await db().collection('accounts').findOneAndUpdate(
      { accountId },
      { $set: { password: hashedPassword, updatedAt: new Date() } },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    return sendSuccess(res, result.value, 'Password updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
