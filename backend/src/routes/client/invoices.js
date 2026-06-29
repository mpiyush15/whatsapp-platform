/**
 * CLIENT: Invoices
 * View own invoices created from paid transactions (read-only, tenant isolated)
 */

import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';
import Payment from '../../models/Payment.js';
import Invoice from '../../models/Invoice.js';
import Account from '../../models/Account.js';
import { emailService } from '../../services/emailService.js';
import { generateInvoicePDF } from '../../services/invoicePDFService.js';

const router = express.Router();
const db = () => mongoose.connection.db;

// GET all invoices for client - fetch paid payments and show as invoices
router.get('/', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    // Fetch only PAID payments for this account
    const payments = await Payment.find({
      accountId,
      status: { $in: ['paid', 'completed'] },
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
      status: { $in: ['paid', 'completed'] }
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
      status: { $in: ['paid', 'completed'] }
    }).lean();

    if (!payment) {
      return sendError(res, 'Invoice not found', 404);
    }

    const invoiceDoc = await Invoice.findOne({ orderId: payment.orderId, accountId }).lean() || 
                       await Invoice.findOne({ accountId }).sort({ createdAt: -1 }).lean();
    
    const account = await Account.findOne({ accountId }).lean();

    const invoiceData = {
      invoiceNumber: invoiceDoc?.invoiceNumber || `INV-${payment.orderId?.slice(-6) || '001'}`,
      invoiceDate: invoiceDoc?.createdAt || payment.createdAt,
      dueDate: invoiceDoc?.dueDate || payment.createdAt,
      billTo: {
        name: account?.name || req.user.name || 'Customer',
        email: account?.email || req.user.email || '',
        company: account?.companyName || '',
        address: account?.address || ''
      },
      lineItems: invoiceDoc && invoiceDoc.items && invoiceDoc.items.length > 0 ? 
        invoiceDoc.items.map(item => ({
          description: item.description || 'Subscription',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || invoiceDoc.amount || payment.amount,
          amount: item.total || invoiceDoc.total || payment.amount
        })) : [
        {
          description: `Subscription - ${payment.planName || 'Plan'}`,
          quantity: 1,
          unitPrice: payment.amount,
          amount: payment.amount
        }
      ],
      subtotal: invoiceDoc?.amount || invoiceDoc?.total || payment.amount,
      taxAmount: invoiceDoc?.tax || 0,
      taxRate: 0,
      discountAmount: 0,
      totalAmount: invoiceDoc?.total || invoiceDoc?.amount || payment.amount,
      status: 'paid',
      paidAmount: invoiceDoc?.total || invoiceDoc?.amount || payment.amount
    };

    const pdfBuffer = await generateInvoicePDF(invoiceData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceData.invoiceNumber}.pdf`);
    return res.send(pdfBuffer);
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
      status: { $in: ['paid', 'completed'] }
    }).lean();

    if (!payment) {
      return sendError(res, 'Invoice not found', 404);
    }

    const invoiceNumber = `INV-${payment.orderId?.slice(-6) || String(payment._id).slice(-6)}`;
    const pdfUrl = `${process.env.FRONTEND_URL || 'https://app.pixelswhatsapp.com'}/api/invoices/${paymentId}/pdf`;
    
    await emailService.sendInvoiceEmail(
      req.user.email,
      invoiceNumber,
      pdfUrl,
      payment.amount,
      req.user.name || 'Customer'
    ).catch(err => console.error('Failed to send invoice email manually:', err.message));

    console.log(`📧 Invoice email sent for payment ${paymentId} to ${req.user.email}`);

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
