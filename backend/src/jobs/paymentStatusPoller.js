import logger from '../utils/logger.js';
import Payment from '../models/Payment.js';
import { cashfreeService } from '../services/cashfreeService.js';
import { handleCashfreeWebhook } from '../controllers/paymentWebhookController.js';

/**
 * Auto-poll last 5 pending payments from Cashfree
 * Only check payments that are NOT completed
 * Trigger subscription flow when payment completes
 */
export const startPaymentStatusPoller = () => {
  logger.info('🚀 Starting payment status poller (checks every 10 seconds)');
  
  setInterval(async () => {
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
          const cfOrderId = payment.cfOrderId;

          if (!cfOrderId) {
            logger.warn(`⚠️ No Cashfree order ID for payment ${orderId}, skipping`);
            continue;
          }

          // Get order details from Cashfree
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

export default { startPaymentStatusPoller };
