/**
 * COMPANY: Conversations
 * Company conversations (accountId: 2600000)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;
const COMPANY_ACCOUNT_ID = '2600000';

// GET all company conversations (company-only)
router.get('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    // Verify this is company account
    if (accountId !== COMPANY_ACCOUNT_ID) {
      return sendError(res, 'Access denied - Company account only', 403);
    }

    const conversations = await db().collection('conversations').find({
      accountId: COMPANY_ACCOUNT_ID
    }).sort({ lastMessageAt: -1 }).toArray();

    return sendSuccess(res, conversations, 'Company conversations');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
