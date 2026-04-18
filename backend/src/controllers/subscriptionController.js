import { sendSuccess, sendValidationError, sendNotFound, sendError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import PricingPlan from '../models/PricingPlan.js';
import Payment from '../models/Payment.js';
import { cashfreeService } from '../services/cashfreeService.js';

export const createSubscription = async (req, res) => {
  try {
    const { planId, billingCycle } = req.body;

    if (!planId) {
      return sendValidationError(res, 'Plan ID required');
    }

    return sendSuccess(res, {
      subscriptionId: `sub_${Date.now()}`,
      status: 'active'
    }, 'Subscription created');
  } catch (error) {
    return handleControllerError(res, error, 'createSubscription');
  }
};

export const getSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    return sendSuccess(res, { subscriptionId }, 'Subscription retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getSubscription');
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    return sendSuccess(res, { subscriptionId, status: 'cancelled' }, 'Subscription cancelled');
  } catch (error) {
    return handleControllerError(res, error, 'cancelSubscription');
  }
};

export const createOrder = async (req, res) => {
  try {
    const { plan, billingCycle = 'monthly' } = req.body;
    const accountId = req.account.accountId;
    const email = req.account.email;

    if (!plan || !accountId) {
      return sendValidationError(res, 'Plan name and authenticated account required');
    }

    if (!['monthly', 'quarterly', 'annual'].includes(billingCycle)) {
      return sendValidationError(res, 'Invalid billing cycle');
    }

    // Get pricing plan
    const pricingPlan = await PricingPlan.findOne({
      name: { $regex: new RegExp(plan, 'i') }
    });

    if (!pricingPlan) {
      return sendNotFound(res, `Plan '${plan}' not found`);
    }

    // Calculate amount based on billing cycle
    let amount = pricingPlan.monthlyPrice;
    if (billingCycle === 'quarterly') {
      amount = pricingPlan.monthlyPrice * 3;
    } else if (billingCycle === 'annual') {
      amount = pricingPlan.yearlyPrice;
    }

    // Generate order ID
    const orderId = `ORDER_${plan.toUpperCase()}_${Date.now()}`;

    logger.info('📝 Creating payment order:', {
      accountId,
      plan,
      billingCycle,
      amount,
      orderId
    });

    // Create Cashfree order with internal accountId in metadata
    const orderResult = await cashfreeService.createOrder({
      orderId,
      amount: Math.round(amount), // Cashfree expects integer
      email: email || `user_${accountId}@pixels.local`,
      customerId: accountId, // Cashfree customer ID
      accountId: accountId, // ✅ Internal account ID stored in metadata
      description: `${plan} Plan - ${billingCycle} Billing`
    });

    if (!orderResult.success) {
      logger.error('❌ Cashfree order creation failed:', orderResult.error);
      return sendError(res, orderResult.error || 'Failed to create payment order', 500);
    }

    // Create Payment record in DB (placeholder, will be updated by webhook)
    const payment = await Payment.create({
      paymentId: `PAY_${orderId}`,
      accountId,
      orderId,
      amount: Math.round(amount),
      currency: 'INR',
      paymentGateway: 'cashfree',
      status: 'pending',
      planId: pricingPlan._id,
      billingCycle,
      pricingSnapshot: {
        planName: pricingPlan.name,
        monthlyPrice: pricingPlan.monthlyPrice,
        yearlyPrice: pricingPlan.yearlyPrice,
        selectedBillingCycle: billingCycle,
        calculatedAmount: Math.round(amount),
        currency: 'INR',
        capturedAt: new Date()
      },
      initiatedAt: new Date(),
      gatewayOrderId: orderResult.cfOrderId,
      paymentSessionId: orderResult.paymentSessionId
    });

    logger.info('✅ Order created:', {
      orderId,
      paymentSessionId: orderResult.paymentSessionId,
      paymentId: payment._id
    });

    return sendSuccess(res, {
      orderId: orderResult.orderId,
      paymentSessionId: orderResult.paymentSessionId,
      redirectUrl: orderResult.redirectUrl,
      amount: Math.round(amount),
      plan,
      billingCycle
    }, 'Order created successfully');
  } catch (error) {
    logger.error('❌ createOrder error:', error);
    return handleControllerError(res, error, 'createOrder');
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId } = req.body;
    return sendSuccess(res, { orderId, paymentId, status: 'verified' }, 'Payment verified');
  } catch (error) {
    return handleControllerError(res, error, 'verifyPayment');
  }
};

export const getPendingTransactions = async (req, res) => {
  try {
    return sendSuccess(res, { pendingTransactions: [] }, 'Pending transactions retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPendingTransactions');
  }
};

export const getAllPendingTransactions = async (req, res) => {
  try {
    return sendSuccess(res, { pendingTransactions: [] }, 'All pending transactions retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getAllPendingTransactions');
  }
};

export const getMySubscription = async (req, res) => {
  try {
    return sendSuccess(res, { subscription: null }, 'My subscription retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getMySubscription');
  }
};

export const changePlan = async (req, res) => {
  try {
    const { newPlanId } = req.body;
    return sendSuccess(res, { status: 'changed' }, 'Plan changed');
  } catch (error) {
    return handleControllerError(res, error, 'changePlan');
  }
};

export const pauseSubscription = async (req, res) => {
  try {
    return sendSuccess(res, { status: 'paused' }, 'Subscription paused');
  } catch (error) {
    return handleControllerError(res, error, 'pauseSubscription');
  }
};

export const resumeSubscription = async (req, res) => {
  try {
    return sendSuccess(res, { status: 'resumed' }, 'Subscription resumed');
  } catch (error) {
    return handleControllerError(res, error, 'resumeSubscription');
  }
};

export const getAllSubscriptions = async (req, res) => {
  try {
    return sendSuccess(res, { subscriptions: [] }, 'All subscriptions retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getAllSubscriptions');
  }
};

export default { 
  createSubscription,
  getSubscription,
  cancelSubscription,
  createOrder,
  verifyPayment,
  getPendingTransactions,
  getAllPendingTransactions,
  getMySubscription,
  changePlan,
  pauseSubscription,
  resumeSubscription,
  getAllSubscriptions
};
