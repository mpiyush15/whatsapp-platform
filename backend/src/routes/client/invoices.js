/**
 * CLIENT: Invoices
 * View own invoices (read-only, tenant isolated)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET all invoices for client (tenant isolated, read-only)
router.get('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    const invoices = await db().collection('invoices').find({
      accountId
    }).sort({ createdAt: -1 }).toArray();

    return sendSuccess(res, invoices, 'Your invoices');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// GET invoice by ID (with ownership verification)
router.get('/:invoiceId', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { invoiceId } = req.params;

    const invoice = await db().collection('invoices').findOne({
      _id: new mongoose.Types.ObjectId(invoiceId),
      accountId
    });

    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    return sendSuccess(res, invoice, 'Invoice details');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
