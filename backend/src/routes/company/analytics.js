/**
 * COMPANY: Analytics
 * Company analytics (accountId: 2600000)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;
const COMPANY_ACCOUNT_ID = '2600000';

// GET company stats (company-only)
router.get('/dashboard', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    // Verify this is company account
    if (accountId !== COMPANY_ACCOUNT_ID) {
      return sendError(res, 'Access denied - Company account only', 403);
    }

    const stats = {
      totalMessages: await db().collection('messages').countDocuments({
        accountId: COMPANY_ACCOUNT_ID
      }),
      totalConversations: await db().collection('conversations').countDocuments({
        accountId: COMPANY_ACCOUNT_ID
      }),
      totalContacts: await db().collection('contacts').countDocuments({
        accountId: COMPANY_ACCOUNT_ID
      }),
      activePhones: await db().collection('phones').countDocuments({
        accountId: COMPANY_ACCOUNT_ID,
        status: 'active'
      })
    };

    return sendSuccess(res, stats, 'Company analytics dashboard');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
