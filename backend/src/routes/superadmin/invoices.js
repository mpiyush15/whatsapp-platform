/**
 * SUPERADMIN: Invoices Management
 * View all invoices, generate reports
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET all invoices (superadmin only)
router.get('/', async (req, res) => {
  try {
    const invoices = await db().collection('invoices').find({}).sort({ createdAt: -1 }).toArray();
    return sendSuccess(res, invoices, 'All invoices');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// GET invoices for customer (superadmin only)
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const invoices = await db().collection('invoices').find({
      accountId: customerId
    }).sort({ createdAt: -1 }).toArray();

    return sendSuccess(res, invoices, `Invoices for customer ${customerId}`);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
