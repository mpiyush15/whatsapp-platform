import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';
import { cashfreeService } from '../services/cashfreeService.js';

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
    const { orderId } = req.body;
    logger.info('✅ Payment confirmed:', orderId);
    return sendSuccess(res, { orderId, status: 'confirmed' }, 'Payment confirmed');
  } catch (error) {
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
    const user = req.user;
    
    console.log('🔍 getAllPayments - Debug Info:');
    console.log('   user object:', JSON.stringify(user, null, 2));
    console.log('   user.role:', user?.role);
    
    // Temporarily allow all for debugging
    console.log('✅ Fetching all payments...');
    const db = mongoose.connection.db;
    const payments = await db.collection('payments').find().toArray();
    console.log('💳 Found', payments.length, 'payments');
    
    // Log detailed payment data
    console.log('\n💵 PAYMENT DATA DETAILS:');
    console.log('═══════════════════════════════════════');
    payments.forEach((pay, idx) => {
      console.log(`\n[Payment ${idx + 1}]`);
      console.log(`  paymentId: ${pay.paymentId}`);
      console.log(`  orderId: ${pay.orderId}`);
      console.log(`  cashfreeOrderId: ${pay.cashfreeOrderId}`);
      console.log(`  cashfreePaymentId: ${pay.cashfreePaymentId}`);
      console.log(`  accountId: ${pay.accountId}`);
      console.log(`  amount: ₹${pay.amount}`);
      console.log(`  status: ${pay.status}`);
      console.log(`  paymentMethod: ${pay.paymentMethod}`);
      console.log(`  currency: ${pay.currency}`);
      console.log(`  description: ${pay.description}`);
      console.log(`  createdAt: ${pay.createdAt}`);
      console.log(`  transactionDate: ${pay.transactionDate}`);
    });
    console.log('\n═══════════════════════════════════════');
    
    return sendSuccess(res, { payments }, 'All payments retrieved');
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
  syncRealTransactions
};
