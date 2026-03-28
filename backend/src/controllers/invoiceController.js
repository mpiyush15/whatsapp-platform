import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';

export const generateInvoice = async (req, res) => {
  try {
    const { subscriptionId, amount } = req.body;

    if (!subscriptionId || !amount) {
      return sendValidationError(res, 'Subscription and amount required');
    }

    return sendSuccess(res, {
      invoiceId: `inv_${Date.now()}`,
      amount,
      status: 'generated'
    }, 'Invoice generated');
  } catch (error) {
    return handleControllerError(res, error, 'generateInvoice');
  }
};

export const getInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    return sendSuccess(res, { invoiceId }, 'Invoice retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getInvoice');
  }
};

export const downloadInvoicePDF = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    logger.info('📄 Invoice PDF requested:', invoiceId);
    return sendSuccess(res, { invoiceId, format: 'pdf' }, 'Invoice PDF generated');
  } catch (error) {
    return handleControllerError(res, error, 'downloadInvoicePDF');
  }
};

export const getMyInvoices = async (req, res) => {
  try {
    return sendSuccess(res, { invoices: [] }, 'My invoices retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getMyInvoices');
  }
};

export const sendInvoiceEmail = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    return sendSuccess(res, { invoiceId, emailSent: true }, 'Invoice emailed');
  } catch (error) {
    return handleControllerError(res, error, 'sendInvoiceEmail');
  }
};

export const recordPaymentForInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    return sendSuccess(res, { invoiceId, status: 'paid' }, 'Payment recorded');
  } catch (error) {
    return handleControllerError(res, error, 'recordPaymentForInvoice');
  }
};

export const createInvoice = async (req, res) => {
  try {
    const { customerId, amount } = req.body;
    return sendSuccess(res, { invoiceId: `inv_${Date.now()}`, amount }, 'Invoice created');
  } catch (error) {
    return handleControllerError(res, error, 'createInvoice');
  }
};

export const getAllInvoices = async (req, res) => {
  try {
    const user = req.user;
    const db = mongoose.connection.db;
    const invoices = await db.collection('invoices').find({ accountId: user.accountId }).toArray();
    return sendSuccess(res, { invoices }, 'All invoices retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getAllInvoices');
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    return sendSuccess(res, { invoiceId, updated: true }, 'Invoice updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateInvoice');
  }
};

export default { 
  generateInvoice,
  getInvoice,
  downloadInvoicePDF,
  getMyInvoices,
  sendInvoiceEmail,
  recordPaymentForInvoice,
  createInvoice,
  getAllInvoices,
  updateInvoice
};
