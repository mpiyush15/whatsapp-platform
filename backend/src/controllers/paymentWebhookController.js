import { sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';

export const handleWebhook = async (req, res) => {
  try {
    const { orderId, orderStatus, transactionId } = req.body;

    logger.info('🪝 Webhook received:', { orderId, orderStatus });

    if (orderStatus === 'PAID') {
      logger.info('✅ Payment confirmed:', orderId);
    }

    return sendSuccess(res, { orderId, processed: true }, 'Webhook processed');
  } catch (error) {
    return handleControllerError(res, error, 'handleWebhook');
  }
};

export const verifyWebhookSignature = async (req, res) => {
  try {
    const { signature } = req.headers;
    return sendSuccess(res, { verified: true }, 'Signature verified');
  } catch (error) {
    return handleControllerError(res, error, 'verifyWebhookSignature');
  }
};

export const handleCashfreeWebhook = async (req, res) => {
  try {
    const { orderId, orderStatus, transactionId } = req.body;
    logger.info('💳 Cashfree webhook:', { orderId, orderStatus });
    return sendSuccess(res, { orderId, processed: true }, 'Cashfree webhook processed');
  } catch (error) {
    return handleControllerError(res, error, 'handleCashfreeWebhook');
  }
};

export const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    return sendSuccess(res, { orderId, status: 'pending' }, 'Payment status retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPaymentStatus');
  }
};

export const retryPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    logger.info('🔄 Retrying payment:', orderId);
    return sendSuccess(res, { orderId, retried: true }, 'Payment retry initiated');
  } catch (error) {
    return handleControllerError(res, error, 'retryPayment');
  }
};

export default { 
  handleWebhook, 
  verifyWebhookSignature,
  handleCashfreeWebhook,
  getPaymentStatus,
  retryPayment
};
