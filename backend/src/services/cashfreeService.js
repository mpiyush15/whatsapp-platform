import axios from 'axios';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import Payment from '../models/Payment.js';
import dotenv from 'dotenv';

dotenv.config();

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const CASHFREE_API_KEY = process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_BASE_URL = process.env.CASHFREE_API_URL || (
  process.env.NODE_ENV === 'production' 
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg'
);

// Helper to get common headers for Cashfree API
const getCashfreeHeaders = () => ({
  'X-Client-Id': CASHFREE_CLIENT_ID,
  'X-Client-Secret': CASHFREE_API_KEY,
  'Content-Type': 'application/json',
  'x-api-version': '2023-08-01'  // Required by Cashfree API
});

export const cashfreeService = {
  // Create payment order
  createOrder: async (orderData) => {
    try {
      logger.info('📝 Creating Cashfree order:', {
        orderId: orderData.orderId,
        amount: orderData.amount,
        customerEmail: orderData.email,
        accountId: orderData.accountId // ✅ Log the internal accountId
      });

      // Get the primary frontend URL (handle comma-separated list)
      let frontendUrl = (process.env.FRONTEND_URL || 'https://replysys.com').split(',')[0].trim();
      let backendUrl = (process.env.BACKEND_URL || 'http://localhost:5050').split(',')[0].trim();

      // Ensure production URLs use https
      if (process.env.NODE_ENV === 'production') {
        if (!backendUrl.startsWith('https')) {
          // Use the backend domain from Railway
          backendUrl = 'https://whatsapp-platform-production-e48b.up.railway.app';
        }
        if (!frontendUrl.startsWith('https')) {
          frontendUrl = 'https://replysys.com';
        }
      }

      const response = await axios.post(
        `${CASHFREE_BASE_URL}/orders`,
        {
          order_id: orderData.orderId,
          order_amount: orderData.amount,
          order_currency: 'INR',
          customer_details: {
            customer_id: orderData.customerId,
            customer_email: orderData.email,
            customer_phone: orderData.phone || '9999999999'
          },
          order_meta: {
            notify_url: `${backendUrl}/api/payment/webhook/confirm`,
            return_url: `${frontendUrl}/payment-success?orderId=${orderData.orderId}&status=success`,
            payment_methods: 'upi,netbanking,wallet,card',
            internal_account_id: orderData.accountId // ✅ Store internal accountId in metadata
          },
          order_note: orderData.description || 'Pixels WhatsApp Subscription'
        },
        {
          headers: getCashfreeHeaders()
        }
      );

      logger.info('✅ Cashfree order created:', response.data.order_id);
      
      return {
        success: true,
        orderId: response.data.order_id,
        paymentSessionId: response.data.payment_session_id,
        redirectUrl: response.data.payment_url,
        cfOrderId: response.data.cf_order_id
      };
    } catch (error) {
      logger.error('❌ Cashfree order creation failed:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  },

  // Get order status
  getOrderStatus: async (orderId) => {
    try {
      logger.info('🔍 Fetching order status for:', orderId);

      const response = await axios.get(
        `${CASHFREE_BASE_URL}/orders/${orderId}`,
        {
          headers: {
            'X-Client-Id': CASHFREE_CLIENT_ID,
            'X-Client-Secret': CASHFREE_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      const orderData = response.data;
      logger.info('Order status response:', orderData);

      // Get payment details if available
      let paymentData = null;
      if (orderData.order_status === 'PAID' && orderData.payments?.length > 0) {
        paymentData = orderData.payments[0];
      }

      return {
        success: true,
        status: orderData.order_status,
        amount: orderData.order_amount,
        paymentStatus: paymentData?.payment_status || null,
        paymentId: paymentData?.cf_payment_id || null,
        cfOrderId: orderData.cf_order_id
      };
    } catch (error) {
      logger.error('❌ Order status fetch failed:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  },

  // Verify webhook signature
  verifyWebhookSignature: (signature, body) => {
    try {
      // Cashfree sends signature in x-webhook-signature header
      // Create HMAC SHA-256 of the body
      const computedSignature = crypto
        .createHmac('sha256', CASHFREE_API_KEY)
        .update(JSON.stringify(body))
        .digest('hex');

      const isValid = computedSignature === signature;
      logger.info('🔐 Webhook signature verification:', isValid ? '✅ Valid' : '❌ Invalid');
      
      return isValid;
    } catch (error) {
      logger.error('❌ Webhook verification failed:', error.message);
      return false;
    }
  },

  // Refund payment
  refundPayment: async (orderId, paymentId, refundAmount) => {
    try {
      logger.info('💰 Processing refund:', { orderId, paymentId, refundAmount });

      const refundId = `REFUND-${Date.now()}`;
      
      const response = await axios.post(
        `${CASHFREE_BASE_URL}/orders/${orderId}/payments/${paymentId}/refunds`,
        {
          refund_id: refundId,
          refund_amount: refundAmount,
          refund_note: 'Customer requested refund'
        },
        {
          headers: getCashfreeHeaders()
        }
      );

      logger.info('✅ Refund processed:', response.data);
      
      return {
        success: true,
        refundId: response.data.refund_id,
        status: response.data.refund_status
      };
    } catch (error) {
      logger.error('❌ Refund failed:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  },

  // Get refund status
  getRefundStatus: async (orderId, refundId) => {
    try {
      const response = await axios.get(
        `${CASHFREE_BASE_URL}/orders/${orderId}/refunds/${refundId}`,
        {
          headers: getCashfreeHeaders()
        }
      );

      return {
        success: true,
        status: response.data.refund_status,
        amount: response.data.refund_amount
      };
    } catch (error) {
      logger.error('❌ Refund status fetch failed:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  },

  // Sync payments from Cashfree API (production - will fetch real transactions)
  syncPaymentsFromCashfree: async () => {
    try {
      logger.info('🔄 Syncing REAL payments from Cashfree API...');
      
      // Validate credentials are set
      if (!CASHFREE_CLIENT_ID || !CASHFREE_API_KEY) {
        logger.warn('⚠️ Cashfree credentials not configured');
        return {
          success: false,
          error: 'Cashfree credentials not configured. Set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in environment.',
          count: 0
        };
      }
      
      // Step 1: Get all order IDs from our Payment DB (both old and new)
      logger.info('📚 Fetching order IDs from local database...');
      const existingPayments = await Payment.find(
        { orderId: { $exists: true } },
        { orderId: 1 }
      ).limit(100);
      
      const orderIds = existingPayments.map(p => p.orderId);
      logger.info(`✅ Found ${orderIds.length} orders in database`);
      
      if (orderIds.length === 0) {
        logger.warn('⚠️ No orders found in database to sync');
        return {
          success: true,
          synced: true,
          count: 0,
          total: 0,
          message: 'No orders to sync from database'
        };
      }
      
      let orders = [];
      
      // Step 2: Fetch payment details for each order from Cashfree
      logger.info(`📡 Fetching payment details from Cashfree for ${orderIds.length} orders...`);
      for (const orderId of orderIds) {
        try {
          logger.info(`  🔍 Fetching payments for order: ${orderId}`);
          const paymentResponse = await axios.get(
            `${CASHFREE_BASE_URL}/orders/${orderId}/payments`,
            {
              headers: getCashfreeHeaders()
            }
          );
          
          if (paymentResponse.data && Array.isArray(paymentResponse.data)) {
            logger.info(`  ✅ Got ${paymentResponse.data.length} payment(s) for ${orderId}`);
            // Get order details too
            const orderResponse = await axios.get(
              `${CASHFREE_BASE_URL}/orders/${orderId}`,
              {
                headers: getCashfreeHeaders()
              }
            );
            
            if (orderResponse.data) {
              // Attach payments to order object
              orderResponse.data.payments = paymentResponse.data;
              orders.push(orderResponse.data);
            }
          }
        } catch (err) {
          logger.error(`  ❌ Failed to fetch payments for ${orderId}:`, err.response?.status, err.response?.data?.message || err.message);
          // Continue with next order
        }
      }
      
      logger.info(`📦 Fetched ${orders.length} transactions from Cashfree`);
      if (orders.length > 0) {
        logger.info(`📊 Sample transaction:`, JSON.stringify(orders[0], null, 2));
      }
      
      if (!Array.isArray(orders)) {
        logger.warn('⚠️ Orders data is not an array:', typeof orders);
        return {
          success: false,
          error: 'Invalid response format from Cashfree',
          count: 0
        };
      }

      let syncedCount = 0;
      const syncedPayments = [];
      const errors = [];
      const skipped = [];

      // Process each order from Cashfree
      for (const order of orders) {
        try {
          // Skip test/demo orders and pending transactions
          // Only sync COMPLETED/PAID transactions
          if (!order.order_status || order.order_status !== 'PAID') {
            logger.warn(`⏭️  Skipping non-paid transaction: ${order.order_id} (Status: ${order.order_status})`);
            skipped.push({
              orderId: order.order_id,
              reason: `Status is ${order.order_status}, not PAID`
            });
            continue;
          }

          // Skip if no amount or zero amount (likely demo data)
          if (!order.order_amount || parseFloat(order.order_amount) <= 0) {
            logger.warn(`⏭️  Skipping zero/invalid amount: ${order.order_id}`);
            skipped.push({
              orderId: order.order_id,
              reason: 'Zero or invalid amount'
            });
            continue;
          }
          
          const paymentId = `CF-${order.cf_order_id || order.order_id}`;
          
          // Determine payment status
          let paymentStatus = 'pending';
          if (order.order_status === 'PAID') {
            paymentStatus = 'completed';
          } else if (order.order_status === 'ACTIVE') {
            paymentStatus = 'processing';
          } else if (order.order_status === 'EXPIRED' || order.order_status === 'CANCELLED') {
            paymentStatus = 'failed';
          }

          // Extract customer/account info
          const customer = order.customer_details || {};
          const orderMeta = order.order_meta || {};
          
          // ✅ Try to get internal accountId from order metadata first, fallback to Cashfree customer_id
          let accountId = orderMeta.internal_account_id || customer.customer_id || customer.phone || order.order_id;
          
          // If still using Cashfree account ID format, also try to find by that
          const cashfreeAccountId = customer.customer_id;

          // Get transaction ID from payments array if available
          let transactionId = order.order_id;
          let paymentMethod = 'upi';
          if (order.payments && Array.isArray(order.payments) && order.payments.length > 0) {
            const transaction = order.payments[0];
            transactionId = transaction.cf_payment_id || order.order_id;
            // Handle both string and object payment methods
            if (typeof transaction.payment_method === 'string') {
              paymentMethod = transaction.payment_method.toLowerCase().trim();
            } else if (transaction.payment_method?.type) {
              paymentMethod = transaction.payment_method.type.toLowerCase().trim();
            } else {
              paymentMethod = 'upi';
            }
          }

          // Prepare payment document to match our schema
          const paymentData = {
            paymentId: paymentId,
            accountId: String(accountId), // ✅ Internal accountId (from metadata or derived)
            cashfreeAccountId: cashfreeAccountId, // ✅ Store Cashfree account ID for reference
            amount: parseFloat(order.order_amount) || 0,
            currency: order.order_currency || 'INR',
            paymentGateway: 'cashfree',
            orderId: order.order_id,
            gatewayOrderId: order.cf_order_id,
            status: paymentStatus,
            completedAt: paymentStatus === 'completed' ? new Date(order.order_paid_on || Date.now()) : null,
            failedAt: paymentStatus === 'failed' ? new Date() : null,
            initiatedAt: new Date(order.order_created_at || Date.now()),
            
            // Payment method info
            paymentMethod: {
              type: paymentMethod,
              provider: 'cashfree'
            },
            
            // Cashfree specific fields
            paymentSessionId: order.payment_session_id,
            gatewayTransactionId: transactionId,
            
            // Additional metadata
            customerEmail: customer.customer_email,
            customerPhone: customer.customer_phone,
            settlementStatus: order.settlement_status,
            
            // Store raw Cashfree response for debugging
            cashfreeRaw: {
              orderStatus: order.order_status,
              settlementId: order.settlement_id,
              settlements: order.settlements
            }
          };

          logger.debug(`Syncing payment:`, {
            paymentId,
            orderId: order.order_id,
            cf_order_id: order.cf_order_id,
            amount: order.order_amount,
            status: paymentStatus,
            paymentMethod: paymentMethod
          });

          // Upsert payment (update if exists by orderId, create if not)
          const savedPayment = await Payment.findOneAndUpdate(
            { orderId: order.order_id },  // Use orderId as unique key
            paymentData,
            { upsert: true, new: true, runValidators: false }
          );

          logger.info(`✅ Synced: ${paymentId} | ₹${order.order_amount} ${order.order_currency} | Status: ${paymentStatus} | Method: ${paymentMethod}`);

          syncedPayments.push(savedPayment);
          syncedCount++;
        } catch (error) {
          logger.error(`❌ Error syncing order ${order.order_id}:`, error.message);
          errors.push({
            orderId: order.order_id,
            cf_order_id: order.cf_order_id,
            error: error.message
          });
        }
      }

      logger.info(`✅ SYNC COMPLETE: ${syncedCount}/${orders.length} real payments synced | Skipped: ${skipped.length}`);
      if (skipped.length > 0) {
        logger.warn(`⏭️  Skipped ${skipped.length} non-paid transactions`);
      }
      
      return {
        success: true,
        synced: true,
        count: syncedCount,
        total: orders.length,
        skipped: skipped.length,
        syncedPayments: syncedPayments,
        skippedDetails: skipped.length > 0 ? skipped : null,
        errors: errors.length > 0 ? errors : null
      };
    } catch (error) {
      logger.error('❌ Cashfree API sync failed:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message,
        count: 0
      };
    }
  },

  // Test Cashfree connection and credentials
  testCashfreeConnection: async () => {
    try {
      logger.info('🧪 Testing Cashfree connection...');
      logger.info('🔑 Using credentials:', {
        client_id: CASHFREE_CLIENT_ID ? `${CASHFREE_CLIENT_ID.substring(0, 8)}...` : 'MISSING',
        has_secret: !!CASHFREE_API_KEY,
        base_url: CASHFREE_BASE_URL
      });

      // Get first order from database to test connection
      const testOrder = await Payment.findOne({ orderId: { $exists: true } })
        .select('orderId')
        .limit(1);

      if (!testOrder?.orderId) {
        logger.warn('⚠️ No test order found in database, connection test skipped');
        return {
          success: true,
          message: '⚠️ No orders in database to test, but Cashfree credentials are configured',
          credentials_valid: !!CASHFREE_CLIENT_ID && !!CASHFREE_API_KEY,
          has_client_id: !!CASHFREE_CLIENT_ID,
          has_secret: !!CASHFREE_API_KEY,
          base_url: CASHFREE_BASE_URL
        };
      }

      // Test with real order endpoint
      logger.info(`📡 Testing with order: ${testOrder.orderId}`);
      const testResponse = await axios.get(
        `${CASHFREE_BASE_URL}/orders/${testOrder.orderId}`,
        {
          headers: {
            'X-Client-Id': CASHFREE_CLIENT_ID,
            'X-Client-Secret': CASHFREE_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      logger.info('✅ Cashfree API connection SUCCESS');
      logger.info('📊 Response status:', testResponse.status);
      logger.info('📦 Response type:', typeof testResponse.data);
      
      return {
        success: true,
        message: '✅ Connected to Cashfree API successfully',
        response_status: testResponse.status,
        has_data: !!testResponse.data,
        order_tested: testOrder.orderId,
        order_status: testResponse.data?.order_status,
        credentials_valid: true
      };
    } catch (error) {
      logger.error('❌ Cashfree API connection FAILED');
      logger.error('Error details:', {
        status: error.response?.status,
        message: error.message,
        error_data: error.response?.data
      });

      return {
        success: false,
        message: `❌ Failed to connect to Cashfree API`,
        error: error.message,
        status: error.response?.status,
        response_data: error.response?.data,
        credentials_check: {
          has_client_id: !!CASHFREE_CLIENT_ID,
          has_secret: !!CASHFREE_API_KEY,
          env_mode: process.env.NODE_ENV,
          base_url: CASHFREE_BASE_URL
        }
      };
    }
  }
}
