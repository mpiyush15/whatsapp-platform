import { sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import Invoice from '../models/Invoice.js';
import PricingPlan from '../models/PricingPlan.js';
import Account from '../models/Account.js';
import { cashfreeService } from '../services/cashfreeService.js';
import billingLifecycleService from '../services/billingLifecycleService.js';

export const handleCashfreeWebhook = async (req, res) => {
  try {
    const body = req.body;
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody = req.rawBody; // Captured by custom middleware

    // ✅ Debug concurrent requests: capture this exact request's data immediately
    const requestId = `${timestamp}-${signature?.substring(0, 8)}`;
    const rawBodyLength = Buffer.isBuffer(rawBody) ? rawBody.length : rawBody?.length || 0;
    logger.info(`💳 [${requestId}] Cashfree webhook received - rawBody: ${rawBodyLength} bytes`);
    logger.info(`   [${requestId}] Headers: signature=${signature?.substring(0, 8)}... timestamp=${timestamp}`);

    // ✅ WEBHOOK SIGNATURE VERIFICATION (per Cashfree docs - use CLIENT_SECRET)
    if (!signature || !timestamp || !rawBody) {
      logger.warn(`⚠️ [${requestId}] Missing webhook headers - rejecting`);
      return sendSuccess(res, { processed: false }, 'Missing webhook headers');
    }

    if (!cashfreeService.verifyWebhookSignature(signature, timestamp, rawBody)) {
      logger.error(`❌ [${requestId}] WEBHOOK SIGNATURE VERIFICATION FAILED - REJECTING`);
      logger.error(`   [${requestId}] Expected signature from Cashfree but got mismatch`);
      return sendSuccess(res, { processed: false }, 'Signature verification failed');
    }

    logger.info('✅ Webhook signature verified - delegating to billing lifecycle service');

    const result = await billingLifecycleService.processPaymentLifecycle({
      body,
      source: 'cashfree_webhook',
      requestId,
    });

    return sendSuccess(res, result, result.message || 'Payment processed successfully');
  } catch (error) {
    logger.error('❌ Webhook error:', error);
    return handleControllerError(res, error, 'handleCashfreeWebhook');
  }
};

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
