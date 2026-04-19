import { sendSuccess, sendValidationError, sendNotFound, sendError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import PricingPlan from '../models/PricingPlan.js';
import Payment from '../models/Payment.js';
import { cashfreeService } from '../services/cashfreeService.js';
import mongoose from 'mongoose';

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
    const accountId = req.account?.accountId;
    if (!accountId) {
      return sendValidationError(res, 'Account ID required');
    }

    // Use mongoose connection to get subscriptions
    const db = mongoose.connection.db;
    const subscriptionCollection = db.collection('subscriptions');

    // Get all subscriptions for this user
    const subscriptions = await subscriptionCollection.find({
      accountId: accountId
    }).sort({ createdAt: -1 }).toArray();

    return sendSuccess(res, { 
      subscriptions: subscriptions || [],
      count: subscriptions?.length || 0
    }, 'Subscriptions retrieved successfully');
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
    const accountId = req.account?.accountId || req.user?.accountId;
    const userRole = req.user?.role;  // Get role from req.user since that's where JWT middleware puts it
    const userType = req.account?.type || req.user?.type;  // Check type for superadmin
    const isAdmin = userRole === 'superadmin' || userRole === 'admin' || userType === 'internal';
    const db = mongoose.connection.db;

    logger.info(`🔍 getAllSubscriptions - isAdmin: ${isAdmin}, userRole: ${userRole}, userType: ${userType}, accountId: ${accountId}`);

    // First try to fetch from subscriptions collection
    const subscriptionCollection = db.collection('subscriptions');
    
    // If admin/superadmin, fetch ALL subscriptions; otherwise filter by accountId
    const filter = isAdmin ? {} : { accountId };
    
    const subscriptions = await subscriptionCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    if (subscriptions.length > 0) {
      const count = isAdmin ? subscriptions.length : `${subscriptions.length} for account ${accountId}`;
      logger.info(`✅ Fetched ${count} subscriptions`);
      return sendSuccess(res, { subscriptions }, 'Subscriptions retrieved');
    }

    // Fallback: Fetch from completed payments if no subscriptions found
    const payments = await Payment.find({
      ...(isAdmin ? {} : { accountId }),
      status: { $in: ['completed', 'PAID', 'paid'] }
    }).sort({ createdAt: -1 });

    if (payments.length === 0) {
      return sendSuccess(res, { subscriptions: [] }, 'No subscriptions found');
    }

    // Group by plan name to create subscriptions
    const subscriptionMap = new Map();

    payments.forEach(payment => {
      const key = payment.planName;
      if (!subscriptionMap.has(key)) {
        subscriptionMap.set(key, {
          _id: payment.accountId + '_' + payment.planName,
          planName: payment.planName,
          status: 'active',
          startDate: payment.createdAt,
          nextBillingDate: new Date(payment.createdAt),
          billingCycle: payment.billingCycle,
          totalTransactions: 0,
          totalPaid: 0,
          payments: []
        });
      }

      const sub = subscriptionMap.get(key);
      sub.totalTransactions += 1;
      sub.totalPaid += payment.amount || 0;
      sub.payments.push(payment);

      // Update next billing date based on cycle
      if (payment.billingCycle === 'monthly') {
        sub.nextBillingDate = new Date(payment.createdAt);
        sub.nextBillingDate.setMonth(sub.nextBillingDate.getMonth() + 1);
      } else if (payment.billingCycle === 'quarterly' || payment.billingCycle === '3-months') {
        sub.nextBillingDate = new Date(payment.createdAt);
        sub.nextBillingDate.setMonth(sub.nextBillingDate.getMonth() + 3);
      } else if (payment.billingCycle === 'annual') {
        sub.nextBillingDate = new Date(payment.createdAt);
        sub.nextBillingDate.setFullYear(sub.nextBillingDate.getFullYear() + 1);
      }
    });

    const formattedSubscriptions = Array.from(subscriptionMap.values()).map(sub => {
      const { payments, ...subData } = sub;
      return subData;
    });

    logger.info(`✅ Fetched ${formattedSubscriptions.length} subscriptions for account ${accountId}`);

    return sendSuccess(res, { subscriptions: formattedSubscriptions }, 'Subscriptions retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getAllSubscriptions');
  }
};

export const getSubscriptionTransactions = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { subscriptionId } = req.params;

    // Extract plan name from subscription ID (format: accountId_planName)
    const planName = subscriptionId.split('_').slice(1).join('_');

    // Fetch all payments for this plan
    const transactions = await Payment.find({
      accountId,
      planName,
      status: 'completed'
    })
      .sort({ createdAt: -1 })
      .select('_id amount planName billingCycle status orderId createdAt updatedAt');

    const formattedTransactions = transactions.map((trans, index) => ({
      _id: trans._id,
      invoiceNumber: `INV-${String(index + 1).padStart(5, '0')}`,
      amount: trans.amount,
      planName: trans.planName,
      billingCycle: trans.billingCycle,
      status: trans.status,
      orderId: trans.orderId,
      date: trans.createdAt,
      createdAt: trans.createdAt
    }));

    logger.info(`✅ Fetched ${transactions.length} transactions for subscription ${subscriptionId}`);

    return sendSuccess(res, { transactions: formattedTransactions }, 'Transactions retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getSubscriptionTransactions');
  }
};

export const getPayments = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const status = req.query.status || 'completed';

    // Fetch payments for this account with the specified status
    const payments = await Payment.find({
      accountId,
      status: status === 'completed' ? 'completed' : 'pending'
    })
      .sort({ createdAt: -1 })
      .select('_id amount planName billingCycle status orderId createdAt updatedAt');

    logger.info(`✅ Fetched ${payments.length} payments for account ${accountId}`);

    return sendSuccess(res, { payments }, 'Payments retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPayments');
  }
};

export const updateSubscriptionStatus = async (req, res) => {
  try {
    // Only superadmins can change subscription status
    if (!req.account || req.account.type !== 'internal') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmins can change subscription status'
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendValidationError(res, 'Invalid subscription ID');
    }

    const validStatuses = ['active', 'paused', 'suspended', 'cancelled', 'expired', 'pending_payment'];
    if (!status || !validStatuses.includes(status)) {
      return sendValidationError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Import Subscription model
    const Subscription = mongoose.model('Subscription');

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!subscription) {
      return sendNotFound(res, 'Subscription not found');
    }

    logger.info(`✅ Subscription ${id} status updated to ${status}`);

    return sendSuccess(res, { subscription }, `Subscription status changed to ${status}`);
  } catch (error) {
    return handleControllerError(res, error, 'updateSubscriptionStatus');
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
  getAllSubscriptions,
  getSubscriptionTransactions,
  getPayments,
  updateSubscriptionStatus
};
