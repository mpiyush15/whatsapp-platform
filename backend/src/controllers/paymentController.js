import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';
import { cashfreeService } from '../services/cashfreeService.js';
import Payment from '../models/Payment.js';
import Account from '../models/Account.js';
import Subscription from '../models/Subscription.js';
import { emailService } from '../services/emailService.js';

export const initiatePayment = async (req, res) => {
  try {
    const { amount, planId, billingCycle } = req.body;

    if (!amount || !planId) {
      return sendValidationError(res, 'Amount and plan required');
    }

    logger.info('💳 Payment initiated:', { amount, planId });

    return sendSuccess(res, {
      paymentId: `pay_${Date.now()}`,
      status: 'pending',
      amount,
      redirectUrl: 'https://payment-gateway.com/checkout'
    }, 'Payment initiated');
  } catch (error) {
    return handleControllerError(res, error, 'initiatePayment');
  }
};

export const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    return sendSuccess(res, { paymentId, status: 'completed' }, 'Payment retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPaymentStatus');
  }
};

export const confirmPayment = async (req, res) => {
  try {
    const { orderId, orderStatus, txStatus, txMsg, orderAmount, referenceId } = req.body;
    
    logger.info('📝 Payment webhook received:', {
      orderId,
      orderStatus,
      txStatus,
      txMsg,
      orderAmount,
      referenceId
    });

    // Find payment by orderId
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      logger.warn('⚠️ Payment not found for orderId:', orderId);
      return sendSuccess(res, { orderId, status: 'notfound' }, 'Payment record not found');
    }

    // Update payment with webhook data
    payment.gatewayOrderId = orderId;
    payment.gatewayPaymentId = referenceId;
    payment.status = orderStatus; // Store Cashfree's exact status: PAID, PENDING, FAILED, etc.
    payment.completedAt = new Date();
    payment.webhookData = req.body;
    
    await payment.save();
    logger.info('✅ Payment updated:', payment._id);

    // If payment successful, activate the account
    if (orderStatus === 'PAID') {
      const account = await Account.findOne({ accountId: payment.accountId });
      if (account) {
        account.status = 'active';
        account.billingStatus = 'active';
        await account.save();
        logger.info('✅ Account activated:', {
          accountId: payment.accountId,
          status: account.status
        });

        // Create or update subscription
        try {
          const subscription = await Subscription.findOne({ accountId: payment.accountId });
          if (!subscription) {
            // Create new subscription
            const newSubscription = new Subscription({
              accountId: payment.accountId,
              paymentId: payment._id,
              planId: payment.planId,
              status: 'active',
              billingCycle: payment.billingCycle,
              amount: payment.amount,
              currency: 'INR',
              startDate: new Date(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
              renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              createdAt: new Date()
            });
            await newSubscription.save();
            logger.info('✅ Subscription created:', newSubscription._id);
          } else {
            subscription.status = 'active';
            subscription.paymentId = payment._id;
            await subscription.save();
            logger.info('✅ Subscription updated:', subscription._id);
          }
        } catch (subErr) {
          logger.error('⚠️ Error updating subscription:', subErr.message);
        }

        // Send confirmation email
        try {
          await emailService.sendPaymentConfirmationEmail(
            account.email,
            payment._id,
            payment.amount,
            'success',
            payment.pricingSnapshot?.planName || 'Plan'
          ).catch(err => logger.error('⚠️ Email error:', err.message));
        } catch (emailErr) {
          logger.error('⚠️ Email service error:', emailErr.message);
        }
      }
    }

    return sendSuccess(res, { 
      orderId, 
      status: payment.status,
      accountId: payment.accountId 
    }, 'Payment processed successfully');
  } catch (error) {
    logger.error('❌ confirmPayment error:', error);
    return handleControllerError(res, error, 'confirmPayment');
  }
};

export const getMyPayments = async (req, res) => {
  try {
    return sendSuccess(res, { payments: [] }, 'Payments retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getMyPayments');
  }
};

export const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    return sendSuccess(res, { paymentId }, 'Payment details retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPaymentDetails');
  }
};

export const refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    return sendSuccess(res, { paymentId, status: 'refunded' }, 'Payment refunded');
  } catch (error) {
    return handleControllerError(res, error, 'refundPayment');
  }
};

export const getAllPayments = async (req, res) => {
  try {
    const { status } = req.query;
    const db = mongoose.connection.db;
    
    // Build filter based on query params
    const filter = {};
    if (status === 'completed') {
      filter.status = { $in: ['paid', 'completed'] };
    } else if (status === 'pending') {
      filter.status = 'pending';
    } else if (status === 'failed') {
      filter.status = { $in: ['failed', 'cancelled'] };
    }
    
    // Fetch payments with filter and sort by latest first (no duplicates - MongoDB _id is unique)
    const payments = await db.collection('payments')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`✅ Found ${payments.length} payments with status: ${status || 'all'}`);
    
    return sendSuccess(res, { payments }, 'Payments retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getAllPayments');
  }
};

export const getPaymentStats = async (req, res) => {
  try {
    return sendSuccess(res, { totalRevenue: 0, totalPayments: 0 }, 'Payment stats retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getPaymentStats');
  }
};

export const syncCashfreePayments = async (req, res) => {
  try {
    const user = req.user;
    
    // Only superadmin can sync
    if (user?.role !== 'superadmin') {
      return sendValidationError(res, 'Only superadmin can sync payments', 403);
    }
    
    logger.info('🔄 Syncing Cashfree payments...');
    const result = await cashfreeService.syncPaymentsFromCashfree();
    
    if (result.success) {
      logger.info(`✅ Successfully synced ${result.count}/${result.total} payments`);
      return sendSuccess(res, { 
        synced: true, 
        count: result.count,
        total: result.total,
        payments: result.syncedPayments,
        errors: result.errors
      }, `✅ Synced ${result.count} payments from Cashfree`);
    } else {
      logger.error('❌ Cashfree sync failed:', result.error);
      return sendValidationError(res, `Sync failed: ${result.error}`, 500);
    }
  } catch (error) {
    return handleControllerError(res, error, 'syncCashfreePayments');
  }
};

export const syncRealTransactions = async (req, res) => {
  try {
    const user = req.user;
    
    // Only superadmin can sync
    if (user?.role !== 'superadmin') {
      return sendValidationError(res, 'Only superadmin can sync payments', 403);
    }
    
    logger.info('🔄 Syncing 4 REAL transactions from Cashfree...');
    const result = await cashfreeService.syncRealTransactionsFromCashfree();
    
    if (result.success) {
      logger.info(`✅ Synced ${result.count}/4 real transactions`);
      return sendSuccess(res, { 
        synced: true, 
        count: result.count,
        total: result.total,
        deletedDemoCount: result.deletedDemoCount,
        payments: result.syncedPayments
      }, `✅ Synced ${result.count} REAL transactions from Cashfree`);
    } else {
      logger.error('❌ Sync failed:', result.error);
      return sendValidationError(res, `Sync failed: ${result.error}`, 500);
    }
  } catch (error) {
    return handleControllerError(res, error, 'syncRealTransactions');
  }
};

export const testCashfreeConnection = async (req, res) => {
  try {
    const user = req.user;
    
    // Only superadmin can test
    if (user?.role !== 'superadmin') {
      return sendValidationError(res, 'Only superadmin can test Cashfree connection', 403);
    }
    
    logger.info('🧪 Testing Cashfree connection...');
    const result = await cashfreeService.testCashfreeConnection();
    
    if (result.success) {
      logger.info(`✅ Cashfree connection test passed`);
      return sendSuccess(res, result, '✅ Cashfree API connection successful');
    } else {
      logger.error('❌ Cashfree connection test failed:', result.message);
      return sendValidationError(res, result.message, 500);
    }
  } catch (error) {
    return handleControllerError(res, error, 'testCashfreeConnection');
  }
};

export const insertOldOrders = async (req, res) => {
  try {
    const user = req.user;
    
    // Only superadmin can insert test orders
    if (user?.role !== 'superadmin') {
      return sendValidationError(res, 'Only superadmin can insert orders', 403);
    }

    logger.info('📝 Inserting old Cashfree orders...');

    // Get Payment model dynamically
    const db = mongoose.connection;
    const PaymentModel = mongoose.model('Payment');

    // Old orders from Cashfree dashboard
    const oldOrders = [
      {
        paymentId: 'CF-ORDER_STARTER_1769848473',
        orderId: 'ORDER_STARTER_1769848473',
        amount: 712.15,
        currency: 'INR',
        status: 'pending',
        paymentGateway: 'cashfree',
        accountId: '2600001',
        description: 'Pixels WhatsApp Starter Subscription'
      },
      {
        paymentId: 'CF-ORDER_STARTER_1769848484',
        orderId: 'ORDER_STARTER_1769848484',
        amount: 712.15,
        currency: 'INR',
        status: 'pending',
        paymentGateway: 'cashfree',
        accountId: '2600001',
        description: 'Pixels WhatsApp Starter Subscription'
      },
      {
        paymentId: 'CF-ORDER_PRO_1769447135',
        orderId: 'ORDER_PRO_1769447135',
        amount: 100.00,
        currency: 'INR',
        status: 'pending',
        paymentGateway: 'cashfree',
        accountId: '2600001',
        description: 'Pixels WhatsApp Pro Subscription'
      },
      {
        paymentId: 'CF-ORDER_ENTERPRISE_1769230634',
        orderId: 'ORDER_ENTERPRISE_1769230634',
        amount: 3010.00,
        currency: 'INR',
        status: 'pending',
        paymentGateway: 'cashfree',
        accountId: '2600001',
        description: 'Pixels WhatsApp Enterprise Subscription'
      }
    ];

    let insertedCount = 0;
    const insertedOrders = [];
    const errors = [];

    for (const order of oldOrders) {
      try {
        const result = await PaymentModel.findOneAndUpdate(
          { orderId: order.orderId },
          {
            ...order,
            initiatedAt: new Date(),
            createdAt: new Date()
          },
          { upsert: true, new: true }
        );
        
        logger.info(`✅ Inserted: ${order.orderId} | ₹${order.amount}`);
        insertedOrders.push({
          orderId: order.orderId,
          paymentId: order.paymentId,
          amount: order.amount
        });
        insertedCount++;
      } catch (err) {
        logger.error(`❌ Error inserting ${order.orderId}:`, err.message);
        errors.push({
          orderId: order.orderId,
          error: err.message
        });
      }
    }

    logger.info(`✅ Inserted ${insertedCount}/${oldOrders.length} old orders`);

    return sendSuccess(res, {
      inserted: insertedCount,
      total: oldOrders.length,
      orders: insertedOrders,
      errors: errors.length > 0 ? errors : null
    }, `✅ Inserted ${insertedCount} old orders. Now click "Sync Cashfree" to fetch live data!`);

  } catch (error) {
    return handleControllerError(res, error, 'insertOldOrders');
  }
};

export default { 
  initiatePayment, 
  getPaymentStatus,
  confirmPayment,
  getMyPayments,
  getPaymentDetails,
  refundPayment,
  getAllPayments,
  getPaymentStats,
  syncCashfreePayments,
  testCashfreeConnection,
  syncRealTransactions,
  insertOldOrders
};
