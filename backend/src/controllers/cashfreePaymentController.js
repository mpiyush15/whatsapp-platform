import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';

export const initiatePayment = async (req, res) => {
  try {
    const { amount, orderId, email } = req.body;

    if (!amount || !orderId || !email) {
      return sendValidationError(res, 'Amount, order ID, and email required');
    }

    logger.info('💳 Cashfree payment initiated:', { orderId, amount });

    return sendSuccess(res, {
      paymentId: `pay_${Date.now()}`,
      orderId,
      amount,
      status: 'initiated'
    }, 'Payment initiated');
  } catch (error) {
    return handleControllerError(res, error, 'initiatePayment');
  }
};

export const handleCallback = async (req, res) => {
  try {
    const { orderId, transactionId, orderStatus } = req.body;

    logger.info('📦 Cashfree callback received:', { orderId, orderStatus });

    return sendSuccess(res, { orderId }, 'Callback processed');
  } catch (error) {
    return handleControllerError(res, error, 'handleCallback');
  }
};

export const createPaymentOrder = async (req, res) => {
  try {
    const { planId, billingCycle } = req.body;
    return sendSuccess(res, { orderId: `ord_${Date.now()}` }, 'Order created');
  } catch (error) {
    return handleControllerError(res, error, 'createPaymentOrder');
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId } = req.body;
    return sendSuccess(res, { orderId, verified: true }, 'Payment verified');
  } catch (error) {
    return handleControllerError(res, error, 'verifyPayment');
  }
};

export const handlePaymentWebhook = async (req, res) => {
  try {
    const { orderId, orderStatus } = req.body;
    logger.info('🪝 Webhook received:', { orderId, orderStatus });
    return sendSuccess(res, { orderId, processed: true }, 'Webhook processed');
  } catch (error) {
    return handleControllerError(res, error, 'handlePaymentWebhook');
  }
};

export const getInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    return sendSuccess(res, { orderId, invoiceUrl: '/invoice.pdf' }, 'Invoice retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getInvoice');
  }
};

export default { 
  initiatePayment, 
  handleCallback,
  createPaymentOrder,
  verifyPayment,
  handlePaymentWebhook,
  getInvoice
};
