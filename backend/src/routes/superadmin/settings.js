/**
 * SUPERADMIN: Platform Settings
 * System configuration, feature flags
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET all settings (superadmin only)
router.get('/', async (req, res) => {
  try {
    let settings = await db().collection('settings').findOne({ type: 'platform' });

    if (!settings) {
      settings = {
        type: 'platform',
        maintenanceMode: false,
        newSignupsEnabled: true,
        maxClientsPerAdmin: 1000,
        apiRateLimit: 1000,
        features: {
          whatsapp: true,
          chatbot: true,
          broadcast: true,
          templates: true
        }
      };
    }

    return sendSuccess(res, settings, 'Platform settings');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// UPDATE settings (superadmin only)
router.put('/', async (req, res) => {
  try {
    const updateData = req.body;
    updateData.updatedAt = new Date();

    const result = await db().collection('settings').findOneAndUpdate(
      { type: 'platform' },
      { $set: updateData },
      { upsert: true, returnDocument: 'after' }
    );

    return sendSuccess(res, result.value, 'Settings updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
