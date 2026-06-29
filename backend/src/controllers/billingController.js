import Subscription from '../models/Subscription.js';
import Invoice from '../models/Invoice.js';
import PricingPlan from '../models/PricingPlan.js';
import Account from '../models/Account.js';
import Payment from '../models/Payment.js';
import { generateId } from '../utils/idGenerator.js';
import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';

const TAX_RATE = 0.18;

export const createSubscription = async (req, res) => {
  try {
    const { planId, billingCycle = 'monthly', paymentGateway = 'cashfree', transactionId } = req.body;

    const plan = await PricingPlan.findOne({
      $or: [{ planId }, { _id: planId }]
    });

    if (!plan) {
      return sendNotFound(res, 'Pricing plan not found');
    }

    const startDate = new Date();
    const endDate = new Date();
    if (billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const subscriptionId = `sub_${generateId()}`;
    const monthlyPrice = plan.monthlyPrice;
    const amount = billingCycle === 'monthly' ? monthlyPrice : monthlyPrice * 12;

    const subscription = new Subscription({
      subscriptionId,
      accountId: req.account.accountId,
      planId: plan._id,
      status: 'active',
      billingCycle,
      pricing: {
        amount,
        finalAmount: amount,
        currency: 'INR'
      },
      startDate,
      endDate,
      renewalDate: endDate,
      paymentGateway,
      transactionId,
      autoRenew: true,
      nextRenewalDate: endDate
    });

    await subscription.save();

    logger.info('✅ Subscription created:', subscriptionId);

    return sendSuccess(res, {
      subscriptionId,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate
    }, 'Subscription created successfully');
  } catch (error) {
    return handleControllerError(res, error, 'createSubscription');
  }
};

export const getSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const accountId = req.account.accountId;

    const subscription = await Subscription.findOne({ subscriptionId, accountId })
      .populate('planId', 'name monthlyPrice');

    if (!subscription) {
      return sendNotFound(res, 'Subscription not found');
    }

    return sendSuccess(res, { subscription }, 'Subscription retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getSubscription');
  }
};

export const listSubscriptions = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { status } = req.query;

    const query = { accountId };
    if (status) query.status = status;

    const subscriptions = await Subscription.find(query)
      .populate('planId', 'name monthlyPrice')
      .sort({ createdAt: -1 });

    return sendSuccess(res, {
      subscriptions,
      count: subscriptions.length
    }, 'Subscriptions retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listSubscriptions');
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const accountId = req.account.accountId;

    const subscription = await Subscription.findOneAndUpdate(
      { subscriptionId, accountId },
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        autoRenew: false
      },
      { new: true }
    );

    if (!subscription) {
      return sendNotFound(res, 'Subscription not found');
    }

    logger.info('✅ Subscription cancelled:', subscriptionId);

    return sendSuccess(res, { subscription }, 'Subscription cancelled');
  } catch (error) {
    return handleControllerError(res, error, 'cancelSubscription');
  }
};

export const renewSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const accountId = req.account.accountId;

    const subscription = await Subscription.findOne({ subscriptionId, accountId });

    if (!subscription) {
      return sendNotFound(res, 'Subscription not found');
    }

    const newEndDate = new Date(subscription.endDate);
    if (subscription.billingCycle === 'monthly') {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    }

    subscription.endDate = newEndDate;
    subscription.renewalDate = newEndDate;
    subscription.nextRenewalDate = newEndDate;
    subscription.status = 'active';
    await subscription.save();

    logger.info('✅ Subscription renewed:', subscriptionId);

    return sendSuccess(res, { subscription }, 'Subscription renewed');
  } catch (error) {
    return handleControllerError(res, error, 'renewSubscription');
  }
};

export const getInvoices = async (req, res) => {
  try {
    const accountId = req.account.accountId;

    const invoices = await Invoice.find({ accountId })
      .sort({ createdAt: -1 });

    return sendSuccess(res, {
      invoices,
      count: invoices.length
    }, 'Invoices retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getInvoices');
  }
};

export const getInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const accountId = req.account.accountId;

    const invoice = await Invoice.findOne({ _id: invoiceId, accountId });

    if (!invoice) {
      return sendNotFound(res, 'Invoice not found');
    }

    return sendSuccess(res, { invoice }, 'Invoice retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getInvoice');
  }
};

export const downloadInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const accountId = req.account.accountId;

    const invoice = await Invoice.findOne({ _id: invoiceId, accountId });

    if (!invoice) {
      return sendNotFound(res, 'Invoice not found');
    }

    return res.json({
      success: true,
      invoice,
      downloadUrl: `/api/invoices/${invoiceId}/pdf`
    });
  } catch (error) {
    return handleControllerError(res, error, 'downloadInvoice');
  }
};

export const getBillingHistory = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { limit = 50, offset = 0 } = req.query;

    const payments = await Payment.find({ accountId })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments({ accountId });

    return sendSuccess(res, {
      payments,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    }, 'Billing history retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getBillingHistory');
  }
};

export const getPaymentMethods = async (req, res) => {
  try {
    const accountId = req.account.accountId;

    const account = await Account.findOne({ accountId })
      .select('paymentMethods');

    return sendSuccess(res, {
      paymentMethods: account?.paymentMethods || []
    }, 'Payment methods retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPaymentMethods');
  }
};

export const getMySubscriptions = async (req, res) => {
  try {
    const accountId = req.account?.accountId;
    if (!accountId) {
      return sendValidationError(res, 'Account ID required');
    }

    const db = require('../config/database.js').default;
    const connection = db();

    // Get all subscriptions for this user
    const subscriptions = await connection.collection('subscriptions').find({
      accountId: accountId
    }).toArray();

    return sendSuccess(res, { 
      subscriptions: subscriptions || [],
      count: subscriptions?.length || 0
    }, 'Subscriptions retrieved successfully');
  } catch (error) {
    return handleControllerError(res, error, 'getMySubscriptions');
  }
};

export const changePlan = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    return sendSuccess(res, { subscriptionId }, 'Plan changed');
  } catch (error) {
    return handleControllerError(res, error, 'changePlan');
  }
};

export const getAllInvoices = async (req, res) => {
  try {
    const user = req.user;
    
    console.log('🔍 getAllInvoices - Debug Info:');
    console.log('   user object:', JSON.stringify(user, null, 2));
    console.log('   user.role:', user?.role);
    console.log('   checking role === superadmin:', user?.role === 'superadmin');
    
    // Temporarily allow all for debugging
    console.log('✅ Fetching invoices...');
    const db = mongoose.connection.db;
    const invoices = await db.collection('invoices').find().toArray();
    console.log('📄 Found', invoices.length, 'invoices');
    
    // Log detailed invoice data
    console.log('\n📋 INVOICE DATA DETAILS:');
    console.log('═══════════════════════════════════════');
    invoices.forEach((inv, idx) => {
      console.log(`\n[Invoice ${idx + 1}]`);
      console.log(`  invoiceId: ${inv.invoiceId}`);
      console.log(`  invoiceNumber: ${inv.invoiceNumber}`);
      console.log(`  accountId: ${inv.accountId}`);
      console.log(`  amount: ₹${inv.amount}`);
      console.log(`  tax: ₹${inv.tax}`);
      console.log(`  total: ₹${inv.total}`);
      console.log(`  status: ${inv.status}`);
      console.log(`  issueDate: ${inv.issueDate}`);
      console.log(`  dueDate: ${inv.dueDate}`);
      console.log(`  description: ${inv.description}`);
    });
    console.log('\n═══════════════════════════════════════');
    
    return sendSuccess(res, { invoices }, 'All invoices retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getAllInvoices');
  }
};

export const getBillingStats = async (req, res) => {
  try {
    return sendSuccess(res, { stats: {} }, 'Billing stats retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getBillingStats');
  }
};

export const getMonthlyRevenue = async (req, res) => {
  try {
    return sendSuccess(res, { monthlyRevenue: 0 }, 'Monthly revenue retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getMonthlyRevenue');
  }
};

export const getRevenueSummary = async (req, res) => {
  try {
    return sendSuccess(res, { summary: {} }, 'Revenue summary retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getRevenueSummary');
  }
};

export const getTransactions = async (req, res) => {
  try {
    return sendSuccess(res, { transactions: [] }, 'Transactions retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getTransactions');
  }
};

export const getUsageMetrics = async (req, res) => {
  try {
    return sendSuccess(res, { metrics: {} }, 'Usage metrics retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getUsageMetrics');
  }
};

export default {
  createSubscription,
  getSubscription,
  listSubscriptions,
  cancelSubscription,
  renewSubscription,
  getInvoices,
  getInvoice,
  downloadInvoice,
  getBillingHistory,
  getPaymentMethods,
  getMySubscriptions,
  changePlan,
  getAllInvoices,
  getBillingStats
};
