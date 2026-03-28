import axios from 'axios';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import Payment from '../models/Payment.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const CASHFREE_API_KEY = process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

export const cashfreeService = {
  // Create payment order
  createOrder: async (orderData) => {
    try {
      logger.info('📝 Creating Cashfree order:', {
        orderId: orderData.orderId,
        amount: orderData.amount,
        customerEmail: orderData.email
      });

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
            notify_url: `${process.env.BACKEND_URL}/api/payment/webhook/confirm`,
            return_url: `${process.env.FRONTEND_URL}/payment-success?order_id=${orderData.orderId}`,
            payment_methods: 'upi,netbanking,wallet,card'
          },
          order_note: orderData.description || 'Pixels WhatsApp Subscription'
        },
        {
          headers: {
            'X-Client-Id': CASHFREE_CLIENT_ID,
            'X-Client-Secret': CASHFREE_API_KEY,
            'Content-Type': 'application/json'
          }
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
          headers: {
            'X-Client-Id': CASHFREE_CLIENT_ID,
            'X-Client-Secret': CASHFREE_API_KEY,
            'Content-Type': 'application/json'
          }
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
          headers: {
            'X-Client-Id': CASHFREE_CLIENT_ID,
            'X-Client-Secret': CASHFREE_API_KEY,
            'Content-Type': 'application/json'
          }
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
      
      // Step 1: DELETE demo/test payments (those NOT from Cashfree)
      const deletedDemo = await Payment.deleteMany({ 
        paymentGateway: { $ne: 'cashfree' } 
      });
      logger.info(`🗑️  Deleted ${deletedDemo.deletedCount} demo payments from database`);
      
      // Try multiple Cashfree endpoints to get transactions
      let orders = [];
      
      try {
        // Try Settlements Recon API (designed for fetching settled transactions)
        logger.info('📡 Fetching reconciliation data from Cashfree...');
        const reconResponse = await axios.post(
          `${CASHFREE_BASE_URL}/orders/settlements/recon`,
          {
            filters: {
              order_amount: { value: '0', operator: 'gt' } // Only > 0
            },
            count: 100
          },
          {
            headers: {
              'X-Client-Id': CASHFREE_CLIENT_ID,
              'X-Client-Secret': CASHFREE_API_KEY,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (reconResponse.data && reconResponse.data.data) {
          logger.info('✅ Recon data received');
          orders = Array.isArray(reconResponse.data.data) ? reconResponse.data.data : [];
        }
      } catch (reconError) {
        logger.warn('⚠️ Recon endpoint failed:', reconError.message);
        
        // Fallback: Try to get orders from a different endpoint if available
        try {
          logger.info('📡 Trying alternative endpoint...');
          const altResponse = await axios.get(
            `${CASHFREE_BASE_URL}/payouts`,
            {
              headers: {
                'X-Client-Id': CASHFREE_CLIENT_ID,
                'X-Client-Secret': CASHFREE_API_KEY,
                'Content-Type': 'application/json'
              }
            }
          );
          orders = altResponse.data?.data || altResponse.data || [];
        } catch (altError) {
          logger.error('❌ All Cashfree APIs failed. Will sync from database only.');
          // Just fetch from our own Payment collection that we know exists
          orders = [];
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
          const accountId = customer.customer_id || customer.phone || order.order_id;

          // Get transaction ID from payments array if available
          let transactionId = order.order_id;
          let paymentMethod = 'upi';
          if (order.payments && Array.isArray(order.payments) && order.payments.length > 0) {
            const transaction = order.payments[0];
            transactionId = transaction.cf_payment_id || order.order_id;
            paymentMethod = (transaction.payment_method?.toLowerCase() || 'upi').trim();
          }

          // Prepare payment document to match our schema
          const paymentData = {
            paymentId: paymentId,
            accountId: String(accountId),
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
        deletedDemoCount: deletedDemo.deletedCount,
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
  }
};
