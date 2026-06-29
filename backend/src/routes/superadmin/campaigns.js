/**
 * SUPERADMIN: Email Campaigns
 * Send platform-wide campaigns to all customers
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET all campaigns (superadmin only)
router.get('/', async (req, res) => {
  try {
    const campaigns = await db().collection('campaigns').find({}).sort({ createdAt: -1 }).toArray();
    return sendSuccess(res, campaigns, 'Email campaigns');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// CREATE campaign (superadmin only)
router.post('/', async (req, res) => {
  try {
    const { subject, content, recipientType = 'all' } = req.body;

    if (!subject || !content) {
      return sendError(res, 'Subject and content required', 400);
    }

    // Get recipient count
    let recipientCount = 0;
    if (recipientType === 'all') {
      recipientCount = await db().collection('accounts').countDocuments({});
    }

    const newCampaign = {
      subject,
      content,
      recipientType,
      recipientCount,
      status: 'draft',
      sentAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db().collection('campaigns').insertOne(newCampaign);
    return sendSuccess(res, { ...newCampaign, _id: result.insertedId }, 'Campaign created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
