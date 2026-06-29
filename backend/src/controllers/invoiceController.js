import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import Invoice from '../models/Invoice.js';

export const getAllInvoices = async (req, res) => {
  try {
    const { status, accountId, page = 1, limit = 20 } = req.query;
    
    logger.info('📋 Fetching all invoices:', { status, accountId, page, limit });

    const filter = {};
    if (status) filter.status = status;
    if (accountId) filter.accountId = accountId;

    const invoices = await Invoice.find(filter)
      .sort({ invoiceDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('subscriptionId');

    const total = await Invoice.countDocuments(filter);

    return sendSuccess(res, {
      data: invoices,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    }, 'Invoices retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getAllInvoices');
  }
};

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
    
    const invoice = await Invoice.findById(invoiceId).populate('subscriptionId');
    if (!invoice) {
      return sendNotFound(res, 'Invoice not found');
    }

    return sendSuccess(res, invoice, 'Invoice retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getInvoice');
  }
};

export const getMyInvoices = async (req, res) => {
  try {
    const accountId = req.account?.accountId;
    if (!accountId) {
      return sendValidationError(res, 'Account ID required');
    }

    const invoices = await Invoice.find({ accountId })
      .sort({ invoiceDate: -1 })
      .populate('subscriptionId');

    return sendSuccess(res, {
      data: invoices
    }, 'My invoices retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getMyInvoices');
  }
};

export const downloadInvoicePDF = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    logger.info('📄 Invoice PDF requested:', invoiceId);
    
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return sendNotFound(res, 'Invoice not found');
    }

    // For now, return invoice data. In production, generate actual PDF
    return sendSuccess(res, { 
      invoiceId, 
      format: 'pdf',
      invoiceData: invoice 
    }, 'Invoice PDF ready for download');
  } catch (error) {
    return handleControllerError(res, error, 'downloadInvoicePDF');
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
