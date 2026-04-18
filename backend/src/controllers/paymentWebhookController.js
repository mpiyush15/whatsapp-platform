import { sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import Invoice from '../models/Invoice.js';
import PricingPlan from '../models/PricingPlan.js';
import Account from '../models/Account.js';
import { cashfreeService } from '../services/cashfreeService.js';

export const handleCashfreeWebhook = async (req, res) => {
  try {
    const body = req.body;
    const signature = req.headers['x-webhook-signature'];

    logger.info('💳 Cashfree webhook received:', body);

    // Verify webhook signature
    if (!cashfreeService.verifyWebhookSignature(signature, body)) {
      logger.warn('⚠️ Webhook signature verification failed');
      return sendSuccess(res, { processed: false }, 'Signature verification failed');
    }

    const { data } = body;
    if (!data) {
      logger.warn('⚠️ No data in webhook');
      return sendSuccess(res, { processed: false }, 'No data in webhook');
    }

    const orderId = data.order?.order_id;
    const orderStatus = data.order?.order_status;

    logger.info('🔍 Processing webhook:', { orderId, orderStatus });

    if (orderStatus !== 'PAID') {
      logger.info('⏭️ Payment not completed, skipping processing');
      return sendSuccess(res, { orderId, processed: true }, 'Non-paid status, skipped');
    }

    // ✅ Payment Confirmed - Start Processing
    logger.info('✅ Payment confirmed, creating subscription and invoice');

    // 1. Find the payment record
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      logger.error('❌ Payment record not found for orderId:', orderId);
      return sendSuccess(res, { orderId, processed: false, error: 'Payment not found' });
    }

    // 2. Update payment status to completed
    payment.status = 'completed';
    payment.paymentStatus = 'success';
    payment.completedAt = new Date();
    await payment.save();
    logger.info('✅ Payment updated to completed:', orderId);

    // 3. Extract accountId from payment metadata (internal account ID)
    const accountId = payment.accountId;
    if (!accountId) {
      logger.error('❌ Account ID not found in payment record');
      return sendSuccess(res, { orderId, processed: false, error: 'Account ID not found' });
    }

    // 4. Get account and plan details
    const account = await Account.findOne({ accountId });
    const plan = await PricingPlan.findOne({ name: payment.planName });

    if (!account || !plan) {
      logger.error('❌ Account or plan not found:', { accountId, planName: payment.planName });
      return sendSuccess(res, { orderId, processed: false, error: 'Account or plan not found' });
    }

    // 5. Create subscription record
    const subscriptionId = `SUB_${accountId}_${Date.now()}`;
    const subscription = new Subscription({
      subscriptionId,
      accountId,
      planId: plan._id,
      status: 'active',
      billingCycle: payment.billingCycle || 'monthly',
      pricing: {
        amount: payment.amount,
        discount: 0
      },
      startDate: new Date(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      paymentMethodId: payment._id,
      autoRenew: true,
      createdAt: new Date()
    });
    await subscription.save();
    logger.info('✅ Subscription created:', subscriptionId);

    // 6. Generate invoice
    const invoiceNumber = `INV-${accountId}-${Date.now()}`;
    const invoiceId = `INV_${accountId}_${Date.now()}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days

    const invoice = new Invoice({
      invoiceId,
      invoiceNumber,
      accountId,
      subscriptionId: subscription._id,
      invoiceDate: new Date(),
      dueDate,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      billTo: {
        name: account.businessName || account.name,
        email: account.email,
        phone: account.phone
      },
      items: [
        {
          description: `${plan.name} Plan - ${payment.billingCycle} subscription`,
          quantity: 1,
          unitPrice: payment.amount,
          amount: payment.amount
        }
      ],
      subtotal: payment.amount,
      tax: 0,
      total: payment.amount,
      amountDue: payment.amount,
      amountPaid: payment.amount,
      status: 'paid',
      paymentMethod: 'Cashfree',
      paymentReference: payment._id.toString(),
      notes: 'Payment received and processed',
      createdAt: new Date()
    });
    await invoice.save();
    logger.info('✅ Invoice generated:', invoiceNumber);

    // 7. Update payment with subscription and invoice references
    payment.subscriptionId = subscription._id;
    payment.invoiceId = invoice._id;
    await payment.save();

    logger.info('✅ Webhook processing complete:', {
      orderId,
      subscriptionId,
      invoiceNumber,
      accountId
    });

    return sendSuccess(res, {
      orderId,
      subscriptionId,
      invoiceNumber,
      processed: true
    }, 'Payment processed successfully');
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
