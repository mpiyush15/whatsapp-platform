import { sendSuccess, sendValidationError, sendNotFound, sendError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import PricingPlan from '../models/PricingPlan.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Account from '../models/Account.js';
import Contact from '../models/Contact.js';
import Message from '../models/Message.js';
import PhoneNumber from '../models/PhoneNumber.js';
import Subscription from '../models/Subscription.js';
import CreditPack from '../models/CreditPack.js';
import CreditPackSettings from '../models/CreditPackSettings.js';
import { cashfreeService } from '../services/cashfreeService.js';
import paymentPersistenceService from '../services/paymentPersistenceService.js';
import creditLedgerService from '../services/creditLedgerService.js';
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

    const planKey = String(plan).trim();
    let pricingPlan = await PricingPlan.findOne({
      planId: { $regex: new RegExp(`^${planKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      isActive: true,
    });

    if (!pricingPlan) {
      pricingPlan = await PricingPlan.findOne({
        name: { $regex: new RegExp(`^${planKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        isActive: true,
      });
    }

    if (!pricingPlan) {
      pricingPlan = await PricingPlan.findOne({
        name: { $regex: new RegExp(planKey, 'i') },
        isActive: true,
      });
    }

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

    // Create payment record with atomic upsert to avoid order-level race conditions.
    const payment = await paymentPersistenceService.createOrGetPendingPayment({
      accountId,
      orderId,
      amount: Math.round(amount),
      currency: 'INR',
      gateway: 'cashfree',
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
      paymentSessionId: orderResult.paymentSessionId,
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

    const account = await Account.findOne({ accountId }).select('creditBalance');

    return sendSuccess(res, { 
      subscriptions: subscriptions || [],
      count: subscriptions?.length || 0,
      currentCredits: Number(account?.creditBalance || 0),
    }, 'Subscriptions retrieved successfully');
  } catch (error) {
    return handleControllerError(res, error, 'getMySubscription');
  }
};

export const changePlan = async (req, res) => {
  try {
    const accountId = req.account?.accountId || req.user?.accountId;
    const {
      newPlanId,
      newPlanName,
      billingCycle = 'monthly',
      effectiveDate = 'renewal', // renewal | immediate
      applyChange = false,
    } = req.body || {};

    if (!accountId) {
      return sendValidationError(res, 'Account ID required');
    }

    if (!newPlanId && !newPlanName) {
      return sendValidationError(res, 'newPlanId or newPlanName is required');
    }

    const normalizedCycle = String(billingCycle).toLowerCase();
    if (!['monthly', 'quarterly', 'annual', 'yearly'].includes(normalizedCycle)) {
      return sendValidationError(res, 'Invalid billing cycle');
    }

    if (!['renewal', 'immediate'].includes(String(effectiveDate))) {
      return sendValidationError(res, 'effectiveDate must be renewal or immediate');
    }

    const currentSubscription = await Subscription.findOne({ accountId, status: 'active' }).sort({ createdAt: -1 });
    if (!currentSubscription) {
      return sendNotFound(res, 'Active subscription not found');
    }

    let targetPlan = null;
    if (newPlanId) {
      targetPlan = await PricingPlan.findOne({
        $or: [
          { planId: String(newPlanId) },
          { _id: mongoose.Types.ObjectId.isValid(String(newPlanId)) ? new mongoose.Types.ObjectId(String(newPlanId)) : null },
        ],
        isActive: true,
      });
    }

    if (!targetPlan && newPlanName) {
      targetPlan = await PricingPlan.findOne({
        name: { $regex: new RegExp(`^${String(newPlanName)}$`, 'i') },
        isActive: true,
      });
    }

    if (!targetPlan) {
      return sendNotFound(res, 'Target plan not found');
    }

    const resolveAmount = (plan, cycle) => {
      if (cycle === 'quarterly') return Number(plan.monthlyPrice || 0) * 3;
      if (cycle === 'annual' || cycle === 'yearly') return Number(plan.yearlyPrice || 0);
      return Number(plan.monthlyPrice || 0);
    };

    const resolveCycleDays = (cycle) => {
      if (cycle === 'quarterly') return 90;
      if (cycle === 'annual' || cycle === 'yearly') return 365;
      return 30;
    };

    const currentAmount = Number(currentSubscription.amount || 0);
    const targetAmount = resolveAmount(targetPlan, normalizedCycle);

    const now = new Date();
    const renewalDate = currentSubscription.renewalDate ? new Date(currentSubscription.renewalDate) : now;
    const millisRemaining = Math.max(renewalDate.getTime() - now.getTime(), 0);
    const daysRemaining = Math.ceil(millisRemaining / (24 * 60 * 60 * 1000));
    const currentCycleDays = resolveCycleDays(String(currentSubscription.billingCycle || 'monthly'));

    const unusedCredit = Number(((currentAmount / Math.max(currentCycleDays, 1)) * daysRemaining).toFixed(2));
    const proratedCharge = Number(Math.max(targetAmount - unusedCredit, 0).toFixed(2));

    const preview = {
      accountId,
      currentPlan: {
        planName: currentSubscription.planName,
        billingCycle: currentSubscription.billingCycle,
        amount: currentAmount,
        renewalDate: currentSubscription.renewalDate,
      },
      targetPlan: {
        planId: targetPlan.planId,
        planName: targetPlan.name,
        billingCycle: normalizedCycle,
        amount: targetAmount,
      },
      proration: {
        daysRemaining,
        unusedCredit,
        proratedCharge,
      },
      effectiveDate: effectiveDate === 'immediate' ? now : renewalDate,
    };

    if (!applyChange) {
      return sendSuccess(res, {
        mode: 'preview',
        preview,
      }, 'Plan change preview generated');
    }

    const normalizedStoredCycle = normalizedCycle === 'annual' ? 'yearly' : normalizedCycle;
    const nextRenewal = new Date(now);
    if (normalizedStoredCycle === 'quarterly') nextRenewal.setDate(nextRenewal.getDate() + 90);
    else if (normalizedStoredCycle === 'yearly') nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
    else nextRenewal.setMonth(nextRenewal.getMonth() + 1);

    if (effectiveDate === 'immediate') {
      currentSubscription.planName = targetPlan.name;
      currentSubscription.billingCycle = normalizedStoredCycle;
      currentSubscription.amount = targetAmount;
      currentSubscription.currency = targetPlan.currency || currentSubscription.currency || 'INR';
      currentSubscription.features = {
        phoneNumbers: targetPlan?.limits?.phoneNumbers ?? currentSubscription?.features?.phoneNumbers,
        messagesPerDay: targetPlan?.limits?.messages ?? currentSubscription?.features?.messagesPerDay,
        contacts: targetPlan?.limits?.contacts ?? currentSubscription?.features?.contacts,
      };
      currentSubscription.startDate = now;
      currentSubscription.renewalDate = nextRenewal;
      currentSubscription.endDate = nextRenewal;
      currentSubscription.updatedAt = now;
      await currentSubscription.save();

      return sendSuccess(res, {
        mode: 'applied',
        preview,
        subscription: {
          planName: currentSubscription.planName,
          billingCycle: currentSubscription.billingCycle,
          amount: currentSubscription.amount,
          renewalDate: currentSubscription.renewalDate,
          status: currentSubscription.status,
        },
      }, 'Plan changed successfully');
    }

    return sendSuccess(res, {
      mode: 'scheduled',
      preview,
      schedule: {
        effectiveDate: renewalDate,
        note: 'Plan will change at current renewal date',
      },
    }, 'Plan change scheduled for renewal');
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
      status: { $in: ['completed', 'success', 'PAID', 'paid'] }
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
      status: { $in: ['completed', 'success'] }
    })
      .sort({ createdAt: -1 })
      .select('_id amount planName billingCycle status orderId invoiceId createdAt updatedAt');

    const invoiceIds = transactions
      .map(trans => trans.invoiceId)
      .filter(Boolean);

    const invoices = invoiceIds.length > 0
      ? await Invoice.find({ _id: { $in: invoiceIds } }).select('_id invoiceNumber')
      : [];

    const invoiceMap = new Map(invoices.map(invoice => [String(invoice._id), invoice.invoiceNumber]));

    const formattedTransactions = transactions.map((trans, index) => ({
      _id: trans._id,
      invoiceNumber: trans.invoiceId
        ? invoiceMap.get(String(trans.invoiceId)) || `INV-${String(index + 1).padStart(5, '0')}`
        : `INV-${String(index + 1).padStart(5, '0')}`,
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
      status: status === 'completed'
        ? { $in: ['completed', 'success'] }
        : 'pending'
    })
      .sort({ createdAt: -1 })
      .select('_id amount planName billingCycle status orderId invoiceId createdAt updatedAt');

    const invoiceIds = payments
      .map(payment => payment.invoiceId)
      .filter(Boolean);

    const invoices = invoiceIds.length > 0
      ? await Invoice.find({ _id: { $in: invoiceIds } }).select('_id invoiceNumber')
      : [];

    const invoiceMap = new Map(invoices.map(invoice => [String(invoice._id), invoice.invoiceNumber]));

    const normalizedPayments = payments.map(payment => ({
      ...payment.toObject(),
      invoiceNumber: payment.invoiceId ? (invoiceMap.get(String(payment.invoiceId)) || null) : null,
    }));

    logger.info(`✅ Fetched ${payments.length} payments for account ${accountId}`);

    return sendSuccess(res, { payments: normalizedPayments }, 'Payments retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPayments');
  }
};

export const getCredits = async (req, res) => {
  try {
    const accountId = req.account?.accountId;
    if (!accountId) {
      return sendValidationError(res, 'Account ID required');
    }

    const { limit = 50, offset = 0 } = req.query;
    const credits = await creditLedgerService.getAccountCredits({
      accountId,
      limit: Number(limit),
      offset: Number(offset),
    });

    return sendSuccess(res, credits, 'Credits retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getCredits');
  }
};

export const getUsageStats = async (req, res) => {
  try {
    const accountId = req.account?.accountId || req.user?.accountId;
    if (!accountId) {
      return sendValidationError(res, 'Account ID required');
    }

    const [account, subscription] = await Promise.all([
      Account.findOne({ accountId }).select('limits isInternal'),
      Subscription.findOne({ accountId, status: 'active' }).select('features'),
    ]);

    const isInternal = account?.isInternal === true;
    const limits = {
      messagesPerDay: isInternal
        ? null
        : Number(subscription?.features?.messagesPerDay ?? account?.limits?.messagesPerDay ?? 0) || 0,
      contacts: isInternal
        ? null
        : Number(subscription?.features?.contacts ?? account?.limits?.contacts ?? 0) || 0,
      phoneNumbers: isInternal
        ? null
        : Number(subscription?.features?.phoneNumbers ?? account?.limits?.phoneNumbers ?? 0) || 0,
    };

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [messagesUsed, contactsUsed, phoneNumbersUsed] = await Promise.all([
      Message.countDocuments({ accountId, createdAt: { $gte: since24h } }),
      Contact.countDocuments({ accountId }),
      PhoneNumber.countDocuments({ accountId }),
    ]);

    const buildMetric = (resource, used, limit) => {
      if (limit === null) {
        return {
          resource,
          used,
          limit: null,
          usagePercentage: 0,
          remaining: null,
          exceeded: false,
          nearLimit: false,
        };
      }

      const normalizedLimit = Number(limit || 0);
      const usagePercentage = normalizedLimit > 0
        ? Math.min(999, Math.round((used / normalizedLimit) * 100))
        : 0;

      return {
        resource,
        used,
        limit: normalizedLimit,
        usagePercentage,
        remaining: Math.max(0, normalizedLimit - used),
        exceeded: normalizedLimit > 0 ? used >= normalizedLimit : false,
        nearLimit: normalizedLimit > 0 ? usagePercentage >= 80 : false,
      };
    };

    return sendSuccess(res, {
      isInternal,
      metrics: {
        messagesPerDay: buildMetric('messagesPerDay', messagesUsed, limits.messagesPerDay),
        contacts: buildMetric('contacts', contactsUsed, limits.contacts),
        phoneNumbers: buildMetric('phoneNumbers', phoneNumbersUsed, limits.phoneNumbers),
      },
      cta: {
        upgrade: '/dashboard/features/billing',
        topup: '/dashboard/features/billing',
      }
    }, 'Usage stats retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getUsageStats');
  }
};

/**
 * GET /subscriptions/triggers
 * Returns low-credit and renewal reminder trigger states for client UI
 */
export const getBillingTriggers = async (req, res) => {
  try {
    const accountId = req.account?.accountId || req.user?.accountId;
    if (!accountId) {
      return sendValidationError(res, 'Account ID required');
    }

    const [account, subscription, settings] = await Promise.all([
      Account.findOne({ accountId }).select('creditBalance isInternal status'),
      Subscription.findOne({ accountId, status: 'active' }).sort({ renewalDate: 1 }).select('renewalDate planName status'),
      CreditPackSettings.findOne().select('minimumCreditAmount lowCreditWarningThreshold renewalReminderDays'),
    ]);

    const lowCreditWarningThreshold = Number(settings?.lowCreditWarningThreshold ?? 200);
    const reminderDays = Array.isArray(settings?.renewalReminderDays) && settings.renewalReminderDays.length > 0
      ? settings.renewalReminderDays.map((day) => Number(day)).filter((day) => Number.isFinite(day)).sort((a, b) => b - a)
      : [15, 7, 3, 1];

    const currentBalance = Number(account?.creditBalance || 0);
    const isInternal = account?.isInternal === true;
    const lowCredit = {
      threshold: lowCreditWarningThreshold,
      currentBalance,
      isLow: !isInternal && currentBalance <= lowCreditWarningThreshold,
      severity: currentBalance <= 0 ? 'critical' : currentBalance <= Math.floor(lowCreditWarningThreshold * 0.5) ? 'high' : 'warning',
      cta: '/dashboard/features/billing',
      message: !isInternal && currentBalance <= lowCreditWarningThreshold
        ? `Low credit balance detected. Top up to avoid delivery interruptions.`
        : 'Credit balance healthy',
    };

    let renewal = {
      renewalDate: null,
      daysToRenewal: null,
      currentStage: null,
      timeline: reminderDays.map((day) => ({
        day,
        label: `D-${day}`,
        status: 'upcoming',
      })),
      cta: '/dashboard/features/billing',
      planName: subscription?.planName || null,
    };

    if (subscription?.renewalDate) {
      const now = new Date();
      const renewalDate = new Date(subscription.renewalDate);
      const millis = renewalDate.getTime() - now.getTime();
      const daysToRenewal = Math.ceil(millis / (24 * 60 * 60 * 1000));

      renewal = {
        renewalDate,
        daysToRenewal,
        currentStage: reminderDays.find((day) => daysToRenewal <= day) ?? null,
        timeline: reminderDays.map((day) => {
          let status = 'upcoming';
          if (daysToRenewal > day) {
            status = 'upcoming';
          } else if (daysToRenewal <= day && (renewal.currentStage === day || reminderDays.find((d) => daysToRenewal <= d) === day)) {
            status = 'current';
          } else if (daysToRenewal <= 0 || day > daysToRenewal) {
            status = 'completed';
          }
          return {
            day,
            label: `D-${day}`,
            status,
          };
        }),
        cta: '/dashboard/features/billing',
        planName: subscription?.planName || null,
      };
    }

    return sendSuccess(res, {
      isInternal,
      lowCredit,
      renewal,
    }, 'Billing triggers retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getBillingTriggers');
  }
};

export const adjustCredits = async (req, res) => {
  try {
    const requesterRole = req.user?.role;
    const requesterType = req.account?.type || req.user?.type;
    const isInternal = requesterType === 'internal' || requesterRole === 'superadmin' || requesterRole === 'admin';

    if (!isInternal) {
      return sendValidationError(res, 'Only internal admin can adjust credits', 403);
    }

    const {
      accountId,
      entryType,
      amount,
      reason,
      referenceId,
      idempotencyKey,
    } = req.body || {};

    if (!accountId || !entryType || !amount) {
      return sendValidationError(res, 'accountId, entryType and amount are required');
    }

    const result = await creditLedgerService.postAdminAdjustment({
      accountId,
      entryType,
      amount: Number(amount),
      reason,
      referenceId,
      idempotencyKey,
      actor: {
        accountId: req.account?.accountId || req.user?.accountId || null,
        email: req.user?.email || req.account?.email || null,
        role: requesterRole || null,
      },
    });

    return sendSuccess(res, {
      accountId,
      entryType,
      amount: Number(amount),
      posted: result.posted,
      duplicate: result.isDuplicate || false,
      balanceAfter: result.balanceAfter,
      ledgerId: result.ledger?._id ? String(result.ledger._id) : null,
    }, 'Credits adjusted successfully');
  } catch (error) {
    return handleControllerError(res, error, 'adjustCredits');
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

/**
 * GET /subscriptions/credit-packs
 * Fetch available credit packs + current account credits + settings
 */
export const getCreditPacks = async (req, res) => {
  try {
    const accountId = req.account?.accountId;
    if (!accountId) {
      return sendValidationError(res, 'Account required');
    }

    // Fetch active credit packs
    const packs = await CreditPack.find({ isActive: true }).sort({ displayOrder: 1 });

    // Fetch credit settings
    let settings = await CreditPackSettings.findOne();
    if (!settings) {
      settings = {
        minimumCreditPurchase: 100,
        minimumCreditAmount: 50,
        maximumCreditAmount: 100000,
        enableCustomAmount: true,
      };
    }

    // Fetch account's current credit balance
    const account = await Account.findOne({ accountId }).select('creditBalance');
    const currentCredits = Number(account?.creditBalance || 0);

    logger.info(`📦 Credit packs fetched for account: ${accountId}`);

    return sendSuccess(res, {
      packs,
      settings,
      currentCredits,
    }, 'Credit packs retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getCreditPacks');
  }
};

/**
 * POST /subscriptions/buy-credits
 * Initiate credit purchase via Cashfree
 * Body: { packId?: string, customAmount?: number }
 */
export const buyCredits = async (req, res) => {
  try {
    const { packId, customAmount, projectId = null } = req.body;
    const accountId = req.account?.accountId;
    const email = req.account?.email;

    if (!accountId) {
      return sendValidationError(res, 'Account required');
    }

    // Fetch settings
    let settings = await CreditPackSettings.findOne();
    if (!settings) {
      settings = {
        minimumCreditAmount: 50,
        maximumCreditAmount: 100000,
        enableCustomAmount: true,
      };
    }

    let credits, price;
    let packMetadata = null;

    if (packId) {
      // Buying a predefined pack
      const pack = await CreditPack.findOne({ packId, isActive: true });
      if (!pack) {
        return sendNotFound(res, 'Credit pack not found');
      }
      credits = pack.credits + (pack.bonusCredits || 0);
      price = pack.price;
      packMetadata = {
        packId: pack.packId,
        name: pack.name,
        credits: Number(pack.credits || 0),
        bonusCredits: Number(pack.bonusCredits || 0),
        price: Number(pack.price || 0),
      };

      logger.info(`🛒 Credit pack purchase initiated: ${packId}, credits: ${credits}, price: ₹${price}`);
    } else if (customAmount !== undefined) {
      // Custom amount purchase
      if (!settings.enableCustomAmount) {
        return sendValidationError(res, 'Custom amount not allowed');
      }

      if (customAmount < settings.minimumCreditAmount) {
        return sendValidationError(res, `Minimum amount: ₹${settings.minimumCreditAmount}`);
      }

      if (customAmount > settings.maximumCreditAmount) {
        return sendValidationError(res, `Maximum amount: ₹${settings.maximumCreditAmount}`);
      }

      price = customAmount;
      credits = Math.floor(customAmount * (settings.creditConversionRate || 1));

      logger.info(`💳 Custom credit purchase initiated: amount: ₹${price}, credits: ${credits}`);
    } else {
      return sendValidationError(res, 'Either packId or customAmount required');
    }

    // Create Cashfree order
    const orderId = `CREDITS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const orderResult = await cashfreeService.createOrder({
      orderId,
      amount: Math.round(price),
      email: email || `user_${accountId}@pixels.local`,
      customerId: accountId,
      accountId,
      orderType: 'credits',
      credits,
      description: 'Credit Top-up',
    });

    if (!orderResult.success) {
      logger.error('❌ Cashfree order creation failed:', orderResult);
      return sendError(res, 'Failed to initiate payment', 500);
    }

    logger.info(`✅ Cashfree order created: ${orderId}`);

    const pendingPayment = await paymentPersistenceService.createOrGetPendingPayment({
      accountId,
      projectId,
      orderId,
      amount: Math.round(price),
      currency: 'INR',
      gateway: 'cashfree',
      billingCycle: 'monthly',
      planName: 'Credit Top-up',
      pricingSnapshot: {
        planName: 'Credit Top-up',
        orderType: 'credits',
        selectedBillingCycle: 'one_time',
        calculatedAmount: Math.round(price),
        credits: Number(credits || 0),
        currency: 'INR',
        pack: packMetadata,
        capturedAt: new Date(),
      },
      metadata: {
        orderType: 'credits',
        credits: Number(credits || 0),
        price: Math.round(price),
        customAmount: customAmount !== undefined ? Number(customAmount) : null,
        pack: packMetadata,
      },
      initiatedAt: new Date(),
      gatewayOrderId: orderResult.cfOrderId,
      paymentSessionId: orderResult.paymentSessionId || orderResult.sessionId || null,
    });

    return sendSuccess(res, {
      orderId,
      paymentSessionId: orderResult.paymentSessionId || orderResult.sessionId,
      sessionId: orderResult.paymentSessionId || orderResult.sessionId,
      credits,
      price,
      redirectUrl: orderResult.redirectUrl || null,
      paymentId: pendingPayment?._id ? String(pendingPayment._id) : null,
    }, 'Payment initiated');
  } catch (error) {
    logger.error('Error in buyCredits:', error);
    return handleControllerError(res, error, 'buyCredits');
  }
};

export const getPlanEntitlements = async (req, res) => {
  try {
    const accountId = req.account?.accountId || req.user?.accountId;
    if (!accountId) {
      return sendValidationError(res, 'Account ID required');
    }
    const { getAccountEntitlements } = await import('../services/planEntitlementService.js');
    const entitlements = await getAccountEntitlements(accountId);
    return sendSuccess(res, { entitlements }, 'Plan entitlements retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPlanEntitlements');
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
  getPlanEntitlements,
  changePlan,
  pauseSubscription,
  resumeSubscription,
  getAllSubscriptions,
  getSubscriptionTransactions,
  getPayments,
  getCredits,
  getUsageStats,
  getBillingTriggers,
  adjustCredits,
  updateSubscriptionStatus,
  getCreditPacks,
  buyCredits
};
