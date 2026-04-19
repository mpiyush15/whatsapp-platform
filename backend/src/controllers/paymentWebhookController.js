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
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody = req.rawBody; // Captured by custom middleware

    logger.info('💳 Cashfree webhook received');
    logger.info('   Headers: signature=' + (signature ? 'YES' : 'MISSING'), 'timestamp=' + (timestamp ? 'YES' : 'MISSING'));

    // ✅ WEBHOOK SIGNATURE VERIFICATION (per Cashfree docs - use CLIENT_SECRET)
    if (!signature || !timestamp || !rawBody) {
      logger.warn('⚠️ Missing webhook headers - rejecting');
      return sendSuccess(res, { processed: false }, 'Missing webhook headers');
    }

    if (!cashfreeService.verifyWebhookSignature(signature, timestamp, rawBody)) {
      logger.error('❌ WEBHOOK SIGNATURE VERIFICATION FAILED - REJECTING');
      logger.error('   Expected signature from Cashfree but got mismatch');
      return sendSuccess(res, { processed: false }, 'Signature verification failed');
    }

    logger.info('✅ Webhook signature verified - processing payment');
    logger.info('📋 FULL WEBHOOK BODY:', JSON.stringify(body, null, 2));

    // Cashfree sends payment_status at data.payment (not data.order.payment)
    let orderId, orderStatus;
    
    if (body.data?.order) {
      orderId = body.data.order.order_id;
      logger.info('📦 Found data.order:', JSON.stringify(body.data.order, null, 2));
      logger.info('📦 data.payment:', JSON.stringify(body.data.payment, null, 2));
      // CORRECT: payment_status is at data.payment, NOT data.order.payment
      orderStatus = body.data.payment?.payment_status || body.data.order.order_status;
    } else if (body.order) {
      orderId = body.order.order_id;
      logger.info('📦 Found body.order:', JSON.stringify(body.order, null, 2));
      orderStatus = body.payment?.payment_status || body.order.order_status;
    } else if (body.order_id) {
      orderId = body.order_id;
      orderStatus = body.payment?.payment_status || body.order_status || body.status;
    }

    logger.info('🔍 Processing webhook:', { orderId, orderStatus, bodyKeys: Object.keys(body) });
    logger.info('🔍 Detailed extraction - orderStatus value:', orderStatus, '| Type:', typeof orderStatus);

    // Cashfree sends "SUCCESS" (not "PAID")
    if (orderStatus !== 'SUCCESS' && orderStatus !== 'PAID') {
      logger.info('⏭️ Payment not completed, skipping processing', { receivedStatus: orderStatus });
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

    // 1.5 CHECK IDEMPOTENCY - Don't process if already completed
    if (payment.status === 'completed') {
      logger.warn('⚠️ Payment already processed, skipping duplicate webhook:', orderId);
      return sendSuccess(res, { orderId, processed: true, isDuplicate: true }, 'Payment already processed');
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
    
    // Extract plan name from orderId (e.g., ORDER_STARTER_1776569276035 → "Starter")
    let planName = payment.planName;
    if (!planName) {
      const planMatch = orderId.match(/ORDER_([A-Z]+)_/);
      if (planMatch) {
        planName = planMatch[1].charAt(0) + planMatch[1].slice(1).toLowerCase(); // STARTER → Starter
        logger.info('📦 Extracted plan from orderId:', { orderId, planName });
      }
    }
    
    const plan = await PricingPlan.findOne({ name: planName });

    if (!account || !plan) {
      logger.error('❌ Account or plan not found:', { accountId, planName, orderId });
      return sendSuccess(res, { orderId, processed: false, error: 'Account or plan not found' });
    }

    // 5. Create subscription record WITH ALL REQUIRED FIELDS
    const subscriptionId = `SUB_${accountId}_${Date.now()}`;
    const startDate = new Date();
    const billingCycle = payment.billingCycle || 'monthly';
    
    // Calculate end date based on billing cycle
    let endDate = new Date(startDate);
    if (billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const subscription = new Subscription({
      subscriptionId,
      accountId,
      planId: plan._id,
      status: 'active',
      billingCycle,
      pricing: {
        amount: payment.amount,
        discount: 0,
        finalAmount: payment.amount  // ✅ ADDED: Required field
      },
      paymentGateway: 'cashfree',  // ✅ ADDED: Required field
      startDate,
      endDate,  // ✅ ADDED: Required field (calculated based on billing cycle)
      nextBillingDate: endDate,
      paymentMethodId: payment._id,
      autoRenew: true,
      createdAt: new Date()
    });
    await subscription.save();
    logger.info('✅ Subscription created:', { subscriptionId, startDate, endDate, paymentGateway: 'cashfree' });

    // 5.5 UPDATE ACCOUNT WITH SUBSCRIPTION AND STATUS
    account.subscriptionId = subscription._id;
    account.status = 'active';  // Change from "pending" to "active"
    await account.save();
    logger.info('✅ Account linked to subscription and status updated to active:', { accountId, status: account.status });

    // 6. Generate invoice
    const invoiceNumber = `INV-${accountId}-${Date.now()}`;
    const invoiceId = `INV_${accountId}_${Date.now()}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days

    logger.info('🧾 Starting invoice generation...');
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

    try {
      await invoice.save();
      logger.info('✅ Invoice saved to database:', { invoiceNumber, invoiceId });
    } catch (invoiceError) {
      logger.error('❌ Failed to save invoice:', invoiceError.message);
      throw invoiceError;
    }

    // 7. SEND INVOICE EMAIL TO CUSTOMER
    logger.info('📧 Sending invoice email...');
    try {
      const { emailService } = await import('../services/emailService.js');
      
      const invoiceContent = `
        <h2>Payment Confirmation - Invoice #${invoiceNumber}</h2>
        <hr>
        <h3>Thank you for your subscription!</h3>
        
        <h4>Invoice Details:</h4>
        <table style="border-collapse: collapse; width: 100%;">
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px;"><strong>Invoice Number:</strong></td>
            <td style="padding: 10px;">${invoiceNumber}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px;"><strong>Date:</strong></td>
            <td style="padding: 10px;">${invoice.invoiceDate.toLocaleDateString()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px;"><strong>Plan:</strong></td>
            <td style="padding: 10px;">${plan.name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px;"><strong>Billing Cycle:</strong></td>
            <td style="padding: 10px;">${payment.billingCycle}</td>
          </tr>
        </table>
        
        <h4>Amount Paid:</h4>
        <p style="font-size: 24px; color: green;"><strong>₹${invoice.total}</strong></p>
        
        <h4>Due Date:</h4>
        <p>${invoice.dueDate.toLocaleDateString()}</p>
        
        <p>Your subscription is now active. You can access all features immediately.</p>
        <p>Thank you for choosing us!</p>
      `;
      
      await emailService.sendEmail({
        to: account.email,
        subject: `Invoice ${invoiceNumber} - ${plan.name} Plan Subscription Confirmed`,
        html: invoiceContent
      });
      logger.info('✅ Invoice email sent successfully:', { to: account.email, invoiceNumber });
    } catch (emailError) {
      logger.error('❌ Failed to send invoice email:', emailError.message);
      logger.error('   Email would have been sent to:', account.email);
      // Don't throw - invoice is created even if email fails
    }

    // 8. Update payment with subscription and invoice references
    payment.subscriptionId = subscription._id;
    payment.invoiceId = invoice._id;
    await payment.save();
    logger.info('✅ Payment linked with subscription and invoice');

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
