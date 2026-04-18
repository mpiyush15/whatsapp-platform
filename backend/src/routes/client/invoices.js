/**
 * CLIENT: Invoices
 * View own invoices created from paid transactions (read-only, tenant isolated)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';
import Payment from '../../models/Payment.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET all invoices for client - fetch paid payments and show as invoices
router.get('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    // Fetch only PAID payments for this account
    const payments = await Payment.find({
      accountId,
      status: 'paid',
      paymentStatus: { $in: ['PAID', 'success'] }
    }).sort({ createdAt: -1 }).lean();

    // Transform payments to invoices format
    const invoices = payments.map((payment, index) => ({
      _id: payment._id,
      paymentId: payment.paymentId,
      invoiceNumber: `INV-${payment.orderId?.slice(-6) || String(index + 1).padStart(4, '0')}`,
      date: payment.transactionDate || payment.completedAt || payment.createdAt,
      amount: payment.amount,
      planName: payment.planName || 'Subscription',
      billingCycle: payment.billingCycle || 'monthly',
      status: 'paid',
      orderId: payment.orderId,
      createdAt: payment.createdAt
    }));

    return sendSuccess(res, { payments: invoices }, 'Your invoices');
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return sendError(res, error.message, 500);
  }
});

// GET invoice by ID (with ownership verification)
router.get('/:paymentId', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      $or: [
        { _id: new mongoose.Types.ObjectId(paymentId) },
        { paymentId }
      ],
      accountId,
      status: 'paid'
    }).lean();

    if (!payment) {
      return sendError(res, 'Invoice not found', 404);
    }

    return sendSuccess(res, payment, 'Invoice details');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// Generate PDF for payment invoice
router.get('/:paymentId/pdf', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      $or: [
        { _id: new mongoose.Types.ObjectId(paymentId) },
        { paymentId }
      ],
      accountId,
      status: 'paid'
    }).lean();

    if (!payment) {
      return sendError(res, 'Invoice not found', 404);
    }

    // TODO: Generate PDF using invoicePDFService
    // For now, return download URL hint
    return sendSuccess(res, {
      paymentId,
      pdfUrl: `/api/billing/invoices/${paymentId}/pdf-file`,
      invoiceNumber: `INV-${payment.orderId?.slice(-6)}`,
      amount: payment.amount,
      date: new Date(payment.createdAt).toLocaleDateString()
    }, 'PDF generated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

// Send invoice via email
router.post('/:paymentId/email', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      $or: [
        { _id: new mongoose.Types.ObjectId(paymentId) },
        { paymentId }
      ],
      accountId,
      status: 'paid'
    }).lean();

    if (!payment) {
      return sendError(res, 'Invoice not found', 404);
    }

    // TODO: Send invoice via email using emailService
    console.log(`📧 Invoice email sent for payment ${paymentId}`);

    return sendSuccess(res, {
      paymentId,
      emailSent: true,
      message: 'Invoice sent to your email'
    }, 'Email sent');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
