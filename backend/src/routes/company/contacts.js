/**
 * COMPANY: Contacts
 * Company contacts (accountId: 2600000)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;
const COMPANY_ACCOUNT_ID = '2600000';

// GET contacts (company-only)
router.get('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    if (accountId !== COMPANY_ACCOUNT_ID) {
      return sendError(res, 'Access denied', 403);
    }

    const contacts = await db().collection('contacts').find({
      accountId: COMPANY_ACCOUNT_ID
    }).sort({ createdAt: -1 }).toArray();

    return sendSuccess(res, contacts, 'Company contacts');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
