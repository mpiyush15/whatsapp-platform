import logger from '../utils/logger.js';
import Payment from '../models/Payment.js';
import { cashfreeService } from '../services/cashfreeService.js';
import { handleCashfreeWebhook } from '../controllers/paymentWebhookController.js';

let intervalId = null;

/**
 * Auto-poll last 5 pending payments from Cashfree
 * Only check payments that are NOT completed
 * Trigger subscription flow when payment completes
 */
export const startPaymentStatusPoller = () => {
  // Only start on primary instance in cluster mode
  if (process.env.NODE_APP_INSTANCE && process.env.NODE_APP_INSTANCE !== '0') return;
  if (intervalId) return; // Prevent duplicate execution

  logger.info('🚀 Starting payment status poller (checks every 10 seconds)');
  
  intervalId = setInterval(async () => {
    try {
      // Get last 5 payments that are NOT completed
      const pendingPayments = await Payment.find({
        status: { $ne: 'completed' }  // Only pending, failed, expired
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      if (pendingPayments.length === 0) {
        return; // No pending payments
      }

      logger.info(`🔍 Polling ${pendingPayments.length} pending payments...`);

      for (const payment of pendingPayments) {
        try {
          // Query Cashfree for current payment status
          const orderId = payment.orderId;
          const orderStatusResult = await cashfreeService.getOrderStatus(orderId);

          if (!orderStatusResult.success) {
            logger.warn(`⚠️ Could not fetch order status for ${orderId}`);
            continue;
          }

          const gatewayStatus = orderStatusResult.paymentStatus || orderStatusResult.status;
          const isPaid = ['SUCCESS', 'PAID', 'completed', 'success'].includes(
            String(gatewayStatus || '').toUpperCase()
          ) || ['completed', 'success'].includes(String(gatewayStatus || '').toLowerCase());

          if (isPaid && payment.status !== 'completed') {
            logger.info(`✅ PAYMENT COMPLETED: ${orderId} - Triggering billing lifecycle`);

            const mockReq = {
              body: {
                order_id: orderId,
                order_status: gatewayStatus,
                payment: {
                  payment_status: gatewayStatus,
                  cf_payment_id: orderStatusResult.paymentId,
                },
              },
              headers: {},
            };

            const mockRes = {
              json: (data) => logger.info('✅ Auto-lifecycle result:', data),
              status: () => mockRes,
              send: () => mockRes,
            };

            await handleCashfreeWebhook(mockReq, mockRes);
            continue;
          }

          const cfOrderId = payment.gatewayOrderId;
          if (!cfOrderId) {
            continue;
          }

          const orderDetails = await cashfreeService.getOrderDetails(cfOrderId);
          
          if (!orderDetails) {
            logger.warn(`⚠️ Could not fetch order details for ${orderId}`);
            continue;
          }

          const orderStatus = orderDetails.order_status;
          const payments = orderDetails.payments || [];
          
          logger.info(`📊 ${orderId}: Order status = ${orderStatus}, Payments = ${payments.length}`);

          // Check if any payment is SUCCESS
          const successPayment = payments.find(p => p.payment_status === 'SUCCESS');

          if (successPayment && payment.status !== 'completed') {
            logger.info(`✅ PAYMENT COMPLETED: ${orderId} - Triggering subscription flow`);

            // Update payment status
            await Payment.updateOne(
              { orderId },
              { 
                status: 'completed',
                paymentStatus: 'success',
                completedAt: new Date(),
                webhookData: successPayment
              }
            );

            // Simulate webhook to trigger subscription creation
            const mockReq = {
              body: {
                data: {
                  order: {
                    order_id: orderId,
                    order_amount: payment.amount,
                    order_currency: 'INR'
                  },
                  payment: {
                    payment_status: 'SUCCESS',
                    cf_payment_id: successPayment.cf_payment_id,
                    payment_amount: successPayment.payment_amount
                  }
                }
              },
              headers: {}
            };

            const mockRes = {
              json: (data) => logger.info('✅ Auto-subscription created:', data),
              status: () => mockRes,
              send: () => mockRes
            };

            // Trigger webhook handler to create subscription
            await handleCashfreeWebhook(mockReq, mockRes);
          }
        } catch (error) {
          logger.warn(`⚠️ Error checking payment ${payment.orderId}:`, error.message);
        }
      }
    } catch (error) {
      logger.error('❌ Payment status poller error:', error);
    }
  }, 10000); // Poll every 10 seconds
};

export const stopPaymentStatusPoller = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('⏹️ Payment status poller stopped gracefully');
  }
};

export default { startPaymentStatusPoller, stopPaymentStatusPoller };
