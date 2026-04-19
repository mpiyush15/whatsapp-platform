import Account from '../models/Account.js';
import Subscription from '../models/Subscription.js';
import PricingPlan from '../models/PricingPlan.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import { cashfreeService } from '../services/cashfreeService.js';
import { handleCashfreeWebhook } from './paymentWebhookController.js';
import { generateId } from '../utils/idGenerator.js';
import { emailService } from '../services/emailService.js';
import { sendSuccess, sendValidationError, sendNotFound, sendForbidden } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import crypto from 'crypto';

export const getOrganizations = async (req, res) => {
  try {
    if (req.account.type !== 'internal') {
      return sendForbidden(res, 'Only superadmins can view organizations');
    }

    const { limit = 100, offset = 0, status = 'all' } = req.query;

    // Build filter
    let filter = { type: { $in: ['client', 'agency'] } };
    if (status !== 'all') {
      filter.status = status;
    }

    const organizations = await Account.find(filter)
      .select('_id accountId name email company phone plan billingCycle status role createdAt subscriptionId lastPaymentDate')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Enrich with subscription and invoice data
    const enrichedOrgs = await Promise.all(organizations.map(async (org) => {
      let subscription = null;
      let invoice = null;

      if (org.subscriptionId) {
        subscription = await Subscription.findById(org.subscriptionId).select('subscriptionId status startDate endDate planName');
        if (subscription) {
          invoice = await Invoice.findOne({ subscriptionId: org.subscriptionId }).select('invoiceId invoiceNumber amount status');
        }
      }

      return {
        _id: org._id,
        accountId: org.accountId,
        name: org.name,
        email: org.email,
        company: org.company,
        phone: org.phone,
        plan: org.plan,
        billingCycle: org.billingCycle,
        status: org.status,
        role: org.role,
        createdAt: org.createdAt,
        hasSubscription: !!org.subscriptionId,
        subscription: subscription ? {
          subscriptionId: subscription.subscriptionId,
          status: subscription.status,
          planName: subscription.planName
        } : null,
        invoice: invoice ? {
          invoiceId: invoice.invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          status: invoice.status
        } : null,
        registeredAt: org.createdAt,
        hoursAgo: Math.floor((Date.now() - new Date(org.createdAt).getTime()) / (1000 * 60 * 60))
      };
    }));

    const total = await Account.countDocuments(filter);

    logger.info('✅ Fetched organizations:', { count: enrichedOrgs.length, total, status });

    return sendSuccess(res, {
      organizations: enrichedOrgs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        status
      }
    }, 'Organizations retrieved');
  } catch (error) {
    logger.error('❌ Error fetching organizations:', error.message);
    return handleControllerError(res, error, 'getOrganizations');
  }
};

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
};

export const getTransactions = async (req, res) => {
  try {
    if (req.account.type !== 'internal') {
      return sendForbidden(res, 'Only superadmins can view transactions');
    }

    const { limit = 100, offset = 0, status, accountId } = req.query;

    // Build filter
    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (accountId) {
      filter.accountId = accountId;
    }

    const transactions = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    const total = await Payment.countDocuments(filter);

    logger.info(`📊 Fetched ${transactions.length} transactions from ${total} total`);

    return sendSuccess(res, {
      transactions,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: parseInt(offset) + parseInt(limit) < total
    }, 'Transactions fetched successfully');
  } catch (error) {
    logger.error('❌ Error fetching transactions:', error.message);
    return handleControllerError(res, error, 'getTransactions');
  }
};

export const syncCashfreeTransactions = async (req, res) => {
  try {
    if (req.account.type !== 'internal') {
      return sendForbidden(res, 'Only superadmins can sync transactions');
    }

    logger.info('🔄 Starting Cashfree transaction sync...');

    // Call the cashfree service to sync payments
    const syncResult = await cashfreeService.syncPaymentsFromCashfree();

    if (!syncResult.success) {
      logger.error('❌ Cashfree sync failed:', syncResult.error);
      return sendSuccess(res, syncResult, 'Sync completed with errors', 206);
    }

    logger.info(`✅ Synced ${syncResult.count} transactions from Cashfree`);

    // ✅ NEW: After syncing, check for completed payments that don't have subscriptions yet
    logger.info('📋 Checking for completed payments that need subscription creation...');
    const completedPayments = await Payment.find({
      status: 'completed',
      subscriptionId: { $exists: false }  // No subscription yet
    }).limit(50);

    logger.info(`🔍 Found ${completedPayments.length} completed payments without subscriptions`);

    let subscriptionsCreated = 0;
    for (const payment of completedPayments) {
      try {
        logger.info(`📝 Processing payment ${payment.orderId} for subscription creation`);

        // Create the webhook payload
        const webhookPayload = {
          data: {
            order: {
              order_id: payment.orderId,
              order_amount: payment.amount,
              order_currency: 'INR'
            },
            payment: {
              payment_status: 'SUCCESS',
              cf_payment_id: payment.cfOrderId,
              payment_amount: payment.amount
            }
          }
        };

        // Convert to string for signature generation
        const rawBodyString = JSON.stringify(webhookPayload);
        const rawBuffer = Buffer.from(rawBodyString, 'utf-8');

        // Generate timestamp and signature
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signStr = `${timestamp}.${rawBodyString}`;
        const signature = crypto
          .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_CLIENT_SECRET)
          .update(signStr)
          .digest('base64');

        logger.info(`🔐 Generated signature for ${payment.orderId}: ${signature.substring(0, 16)}...`);

        // Create mock request with valid signature
        const mockReq = {
          body: webhookPayload,
          rawBody: rawBuffer,  // Pass as Buffer like the middleware does
          headers: {
            'x-webhook-signature': signature,
            'x-webhook-timestamp': timestamp,
            'content-type': 'application/json'
          }
        };

        const mockRes = {
          json: (data) => data,
          status: () => mockRes,
          send: () => mockRes,
          statusCode: 200
        };

        // Trigger webhook handler to create subscription
        await handleCashfreeWebhook(mockReq, mockRes);
        subscriptionsCreated++;

        logger.info(`✅ Subscription created for payment ${payment.orderId}`);
      } catch (error) {
        logger.warn(`⚠️ Failed to create subscription for ${payment.orderId}:`, error.message);
      }
    }

    // After syncing, fetch all transactions
    const transactions = await Payment.find({})
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    return sendSuccess(res, {
      syncResult,
      subscriptionsCreated,
      transactions,
      total: transactions.length,
      message: `Successfully synced ${syncResult.count} transactions. Created ${subscriptionsCreated} subscriptions.`
    }, 'Transactions synced from Cashfree');
  } catch (error) {
    logger.error('❌ Error syncing Cashfree transactions:', error.message);
    return handleControllerError(res, error, 'syncCashfreeTransactions');
  }
};

export const activateAccount = async (req, res) => {
  try {
    if (req.account.type !== 'internal') {
      return sendForbidden(res, 'Only superadmins can activate accounts');
    }

    const { accountId } = req.params;

    if (!accountId) {
      return sendValidationError(res, 'accountId is required');
    }

    // Find the account
    const account = await Account.findOne({ accountId });
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }

    logger.info(`📝 Manually activating account: ${accountId}`);

    // Check if account already has a subscription
    let subscription = await Subscription.findById(account.subscriptionId);

    if (!subscription) {
      logger.info(`💰 No subscription found, creating one for ${accountId}...`);

      // Get pricing plan
      const plan = await PricingPlan.findOne({ name: account.plan });
      if (!plan) {
        return sendNotFound(res, 'Pricing plan not found');
      }

      // Calculate end date based on billing cycle
      const startDate = new Date();
      let endDate = new Date(startDate);
      if (account.billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (account.billingCycle === 'quarterly') {
        endDate.setMonth(endDate.getMonth() + 3);
      } else if (account.billingCycle === 'annual') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // Create subscription
      subscription = new Subscription({
        subscriptionId: generateId('SUB'),
        accountId: account._id,
        planId: plan._id,
        planName: plan.name,
        status: 'active',
        billingCycle: account.billingCycle,
        pricing: {
          amount: plan.pricing[account.billingCycle]?.amount || 0,
          discount: plan.pricing[account.billingCycle]?.discount || 0,
          finalAmount: plan.pricing[account.billingCycle]?.finalAmount || 0,
          tax: plan.pricing[account.billingCycle]?.tax || 0
        },
        paymentGateway: 'manual-activation',
        startDate,
        endDate,
        nextBillingDate: endDate,
        autoRenew: true,
        activatedBy: 'admin-manual',
        activatedAt: new Date()
      });

      await subscription.save();
      logger.info(`✅ Subscription created: ${subscription.subscriptionId}`);

      // Link subscription to account
      account.subscriptionId = subscription._id;
    }

    // Update account status to active
    account.status = 'active';
    await account.save();

    logger.info(`✅ Account activated: ${accountId}`);

    // Generate invoice
    logger.info(`📄 Generating invoice for ${accountId}...`);
    const invoice = new Invoice({
      invoiceId: generateId('INV'),
      invoiceNumber: `INV-${Date.now()}`,
      accountId: account._id,
      subscriptionId: subscription._id,
      amount: subscription.pricing.finalAmount,
      status: 'paid',
      billTo: {
        name: account.name,
        email: account.email,
        company: account.company,
        phone: account.phone
      },
      items: [
        {
          description: `${subscription.planName} - ${subscription.billingCycle} subscription (Manual Activation)`,
          amount: subscription.pricing.finalAmount,
          quantity: 1,
          rate: subscription.pricing.finalAmount
        }
      ],
      notes: 'This subscription was manually activated by admin'
    });

    await invoice.save();
    logger.info(`✅ Invoice created: ${invoice.invoiceId}`);

    // Send invoice email
    logger.info(`📧 Sending invoice email to ${account.email}...`);
    await emailService.sendInvoiceEmail(account.email, account.name, invoice, subscription);
    logger.info(`✅ Invoice email sent to ${account.email}`);

    return sendSuccess(res, {
      account,
      subscription,
      invoice,
      message: `Account activated, subscription created, and invoice sent to ${account.email}`
    }, 'Account activated successfully');

  } catch (error) {
    logger.error('❌ Error activating account:', error.message);
    return handleControllerError(res, error, 'activateAccount');
  }
};

export default {
  getOrganizations,
  getPendingUsers,
  sendPaymentReminder,
  sendReminderAllPending,
  changeUserStatus,
  insertOldCashfreeOrders,
  getTransactions,
  syncCashfreeTransactions,
  activateAccount
};
