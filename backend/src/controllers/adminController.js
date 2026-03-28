import Account from '../models/Account.js';
import Subscription from '../models/Subscription.js';
import PricingPlan from '../models/PricingPlan.js';
import Payment from '../models/Payment.js';
import { generateId } from '../utils/idGenerator.js';
import { emailService } from '../services/emailService.js';
import { sendSuccess, sendValidationError, sendNotFound, sendForbidden } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';

export const getPendingUsers = async (req, res) => {
  try {
    if (req.account.type !== 'internal') {
      return sendForbidden(res, 'Only superadmins can view pending users');
    }

    const { limit = 50, offset = 0 } = req.query;

    const pendingUsers = await Account.find({ status: 'pending' })
      .select('_id accountId name email company phone plan billingCycle createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const planPrices = {
      starter: { monthly: 999, quarterly: 2847, annual: 9590 },
      pro: { monthly: 2999, quarterly: 8547, annual: 28790 },
      enterprise: { monthly: 9999, quarterly: 28497, annual: 95990 },
      custom: { monthly: 0, quarterly: 0, annual: 0 }
    };

    const usersWithAmounts = pendingUsers.map((user) => {
      const planKey = (user.plan || 'starter').toLowerCase();
      const cycleKey = (user.billingCycle || 'monthly').toLowerCase();
      const prices = planPrices[planKey] || planPrices.starter;
      const amount = prices[cycleKey] || prices.monthly;

      return {
        _id: user._id,
        accountId: user.accountId,
        name: user.name,
        email: user.email,
        company: user.company,
        phone: user.phone,
        plan: user.plan,
        billingCycle: user.billingCycle,
        amountDue: amount,
        registeredAt: user.createdAt,
        hoursAgo: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60))
      };
    });

    const total = await Account.countDocuments({ status: 'pending' });

    logger.info('✅ Fetched pending users:', { count: usersWithAmounts.length, total });

    return sendSuccess(res, {
      data: usersWithAmounts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    }, 'Pending users retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPendingUsers');
  }
};

export const sendPaymentReminder = async (req, res) => {
  try {
    if (req.account.type !== 'internal') {
      return sendForbidden(res, 'Only superadmins can send payment reminders');
    }

    const { accountId, userId } = req.body;

    if (!accountId && !userId) {
      return sendValidationError(res, 'accountId or userId is required');
    }

    const account = await Account.findOne({
      $or: [
        { _id: userId || accountId },
        { accountId: accountId }
      ]
    });

    if (!account) {
      return sendNotFound(res, 'Account not found');
    }

    if (account.status !== 'pending') {
      return sendValidationError(res, 'Account is not in pending status', {
        currentStatus: account.status
      });
    }

    const planPrices = {
      starter: { monthly: 999, quarterly: 2847, annual: 9590 },
      pro: { monthly: 2999, quarterly: 8547, annual: 28790 },
      enterprise: { monthly: 9999, quarterly: 28497, annual: 95990 },
      custom: { monthly: 0, quarterly: 0, annual: 0 }
    };

    const planKey = (account.plan || 'starter').toLowerCase();
    const cycleKey = (account.billingCycle || 'monthly').toLowerCase();
    const prices = planPrices[planKey] || planPrices.starter;
    const amountDue = prices[cycleKey] || prices.monthly;

    const paymentLink = `${(process.env.FRONTEND_URL || 'https://replysys.com').replace(/\/$/, '')}/checkout?plan=${account.plan.toLowerCase()}&billingCycle=${account.billingCycle.toLowerCase()}`;

    await emailService.sendPaymentReminderEmail(
      account.email,
      account.name,
      account.plan,
      amountDue,
      account.billingCycle,
      paymentLink
    );

    logger.info('✅ Payment reminder sent to:', {
      email: account.email,
      name: account.name,
      amount: amountDue
    });

    return sendSuccess(res, {
      email: account.email,
      name: account.name,
      plan: account.plan,
      amountDue
    }, 'Payment reminder sent');
  } catch (error) {
    return handleControllerError(res, error, 'sendPaymentReminder');
  }
};

export const sendReminderAllPending = async (req, res) => {
  try {
    if (req.account.type !== 'internal') {
      return sendForbidden(res, 'Only superadmins can send bulk reminders');
    }

    const { hoursAfterSignup = 24 } = req.body;

    const cutoffTime = new Date(Date.now() - hoursAfterSignup * 60 * 60 * 1000);
    const pendingUsers = await Account.find({
      status: 'pending',
      createdAt: { $lt: cutoffTime }
    }).select('_id name email plan billingCycle createdAt');

    logger.info(`📧 Found ${pendingUsers.length} pending users to remind`);

    const planPrices = {
      starter: { monthly: 999, quarterly: 2847, annual: 9590 },
      pro: { monthly: 2999, quarterly: 8547, annual: 28790 },
      enterprise: { monthly: 9999, quarterly: 28497, annual: 95990 },
      custom: { monthly: 0, quarterly: 0, annual: 0 }
    };

    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const user of pendingUsers) {
      try {
        const planKey = (user.plan || 'starter').toLowerCase();
        const cycleKey = (user.billingCycle || 'monthly').toLowerCase();
        const prices = planPrices[planKey] || planPrices.starter;
        const amountDue = prices[cycleKey] || prices.monthly;

        const paymentLink = `${(process.env.FRONTEND_URL || 'https://replysys.com').replace(/\/$/, '')}/checkout?plan=${user.plan.toLowerCase()}&billingCycle=${user.billingCycle.toLowerCase()}`;

        await emailService.sendPaymentReminderEmail(
          user.email,
          user.name,
          user.plan,
          amountDue,
          user.billingCycle,
          paymentLink
        );

        results.sent++;
        logger.info(`✅ Reminder sent to: ${user.email}`);
      } catch (err) {
        results.failed++;
        results.errors.push({
          email: user.email,
          error: err.message
        });
        logger.error(`❌ Failed to send reminder to ${user.email}:`, err.message);
      }
    }

    return sendSuccess(res, results, 'Bulk reminders processed');
  } catch (error) {
    return handleControllerError(res, error, 'sendReminderAllPending');
  }
};

export const changeUserStatus = async (req, res) => {
  try {
    if (req.account.type !== 'internal') {
      return sendForbidden(res, 'Only superadmins can change user status');
    }

    const { email, status, planName = 'Starter' } = req.body;

    if (!email || !status) {
      return sendValidationError(res, 'email and status are required');
    }

    const validStatuses = ['pending', 'active', 'suspended', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return sendValidationError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const account = await Account.findOneAndUpdate(
      { email },
      { 
        status,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!account) {
      return sendNotFound(res, 'Account not found');
    }

    let subscriptionCreated = false;
    let subscriptionId = null;

    if (status === 'active') {
      try {
        const plan = await PricingPlan.findOne({ name: planName, isActive: true });
        
        if (plan) {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setFullYear(endDate.getFullYear() + 1);

          const subscription = new Subscription({
            subscriptionId: `sub_${generateId()}`,
            accountId: account.accountId,
            planId: plan._id,
            status: 'active',
            billingCycle: 'annual',
            pricing: {
              amount: plan.monthlyPrice * 12,
              discount: 0,
              discountReason: 'Admin activated',
              finalAmount: plan.monthlyPrice * 12,
              currency: 'INR'
            },
            startDate,
            endDate,
            renewalDate: endDate,
            paymentGateway: 'admin_activated',
            autoRenew: false,
            nextRenewalDate: endDate
          });

          await subscription.save();
          subscriptionCreated = true;
          subscriptionId = subscription._id;

          logger.info(`✅ Subscription created:`, {
            email,
            planName,
            subscriptionId: subscription._id,
            accountId: account.accountId
          });
        }
      } catch (subError) {
        logger.warn(`⚠️ Subscription creation failed:`, subError.message);
      }
    }

    logger.info(`✅ User status changed:`, {
      email,
      newStatus: status,
      accountId: account.accountId,
      subscriptionCreated
    });

    return sendSuccess(res, {
      email: account.email,
      accountId: account.accountId,
      status: account.status,
      subscriptionCreated,
      subscriptionId,
      updatedAt: account.updatedAt
    }, 'User status updated');
  } catch (error) {
    return handleControllerError(res, error, 'changeUserStatus');
  }
};

export const insertOldCashfreeOrders = async (req, res) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return sendForbidden(res, 'Only superadmin can insert test orders');
    }

    logger.info('📝 Inserting old Cashfree orders...');

    // Old orders from Cashfree dashboard
    const oldOrders = [
      {
        orderId: 'ORDER_STARTER_1769848473',
        amount: 712.15,
        accountId: '2600001',
        description: 'Pixels WhatsApp Starter Subscription'
      },
      {
        orderId: 'ORDER_STARTER_1769848484',
        amount: 712.15,
        accountId: '2600001',
        description: 'Pixels WhatsApp Starter Subscription'
      },
      {
        orderId: 'ORDER_PRO_1769447135',
        amount: 100.00,
        accountId: '2600001',
        description: 'Pixels WhatsApp Pro Subscription'
      },
      {
        orderId: 'ORDER_ENTERPRISE_1769230634',
        amount: 3010.00,
        accountId: '2600001',
        description: 'Pixels WhatsApp Enterprise Subscription'
      }
    ];

    const insertedOrders = [];
    const errors = [];

    for (const order of oldOrders) {
      try {
        const paymentId = `CF-${order.orderId}`;

        const paymentDoc = {
          paymentId: paymentId,
          orderId: order.orderId,
          amount: order.amount,
          currency: 'INR',
          status: 'pending',
          paymentGateway: 'cashfree',
          accountId: String(order.accountId),
          initiatedAt: new Date(),
          createdAt: new Date()
        };

        const result = await Payment.findOneAndUpdate(
          { orderId: order.orderId },
          paymentDoc,
          { upsert: true, new: true }
        );

        logger.info(`✅ Inserted: ${order.orderId} | ₹${order.amount}`);
        insertedOrders.push({
          orderId: order.orderId,
          paymentId: paymentId,
          amount: order.amount,
          status: 'success'
        });
      } catch (err) {
        logger.error(`❌ Error inserting ${order.orderId}:`, err.message);
        errors.push({
          orderId: order.orderId,
          error: err.message
        });
      }
    }

    // Verify
    const count = await Payment.countDocuments({ paymentGateway: 'cashfree' });

    logger.info(`✅ Total Cashfree orders in DB: ${count}`);

    return sendSuccess(res, {
      inserted: insertedOrders.length,
      total: oldOrders.length,
      orders: insertedOrders,
      errors: errors.length > 0 ? errors : null,
      dbTotal: count,
      message: `✅ Inserted ${insertedOrders.length} old orders. Now go to test-data page and click "🔄 Sync Cashfree"`
    }, 'Old orders inserted successfully');
  } catch (error) {
    return handleControllerError(res, error, 'insertOldCashfreeOrders');
  }

export default {
  getPendingUsers,
  sendPaymentReminder,
  sendReminderAllPending,
  changeUserStatus,
  insertOldCashfreeOrders
};
