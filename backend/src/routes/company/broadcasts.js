/**
 * COMPANY: Broadcasts
 * Company-wide broadcasts (accountId: 2600000)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;
const COMPANY_ACCOUNT_ID = '2600000';

// GET broadcasts (company-only)
router.get('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    if (accountId !== COMPANY_ACCOUNT_ID) {
      return sendError(res, 'Access denied', 403);
    }

    const broadcasts = await db().collection('broadcasts').find({
      accountId: COMPANY_ACCOUNT_ID
    }).sort({ createdAt: -1 }).toArray();

    return sendSuccess(res, broadcasts, 'Company broadcasts');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// CREATE broadcast (company-only)
router.post('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { name, message, recipientCount } = req.body;

    if (accountId !== COMPANY_ACCOUNT_ID) {
      return sendError(res, 'Access denied', 403);
    }

    if (!name || !message) {
      return sendError(res, 'Name and message required', 400);
    }

    const newBroadcast = {
      accountId: COMPANY_ACCOUNT_ID,
      name,
      message,
      recipientCount: recipientCount || 0,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db().collection('broadcasts').insertOne(newBroadcast);
    return sendSuccess(res, { ...newBroadcast, _id: result.insertedId }, 'Broadcast created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
