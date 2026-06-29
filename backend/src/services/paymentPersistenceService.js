import Payment from '../models/Payment.js';
import logger from '../utils/logger.js';

class PaymentPersistenceService {
  async findByOrderId(orderId) {
    if (!orderId) return null;
    return Payment.findOne({ orderId });
  }

  async findByOrderIdLean(orderId) {
    if (!orderId) return null;
    return Payment.findOne({ orderId }).lean();
  }

  async createOrGetPendingPayment({
    accountId,
    projectId,
    orderId,
    amount,
    currency = 'INR',
    gateway = 'cashfree',
    billingCycle,
    planId,
    planName,
    pricingSnapshot,
    metadata,
    initiatedAt,
    gatewayOrderId,
    paymentSessionId,
  }) {
    const update = {
      $setOnInsert: {
        paymentId: `PAY_${orderId}`,
        accountId,
        projectId: projectId ?? null,
        orderId,
        amount,
        currency,
        gateway,
        paymentGateway: gateway,
        status: 'pending',
        lifecycleState: 'pending',
        planId,
        planName,
        billingCycle,
        pricingSnapshot,
        initiatedAt: initiatedAt || new Date(),
        gatewayOrderId,
        paymentSessionId,
      },
      $set: {
        updatedAt: new Date(),
        ...(metadata ? { metadata } : {}),
      }
    };

    const payment = await Payment.findOneAndUpdate(
      { orderId },
      update,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    logger.info('🧾 Payment pending record upserted', {
      orderId,
      paymentId: payment?._id,
      accountId,
      status: payment?.status,
    });

    return payment;
  }

  async claimLifecycleEvent(orderId, eventKey) {
    if (!orderId || !eventKey) return null;

    return Payment.findOneAndUpdate(
      {
        orderId,
        completedEventKeys: { $ne: eventKey },
        processingEventKeys: { $ne: eventKey },
      },
      {
        $addToSet: { processingEventKeys: eventKey },
        $set: {
          status: 'processing',
          lifecycleState: 'processing',
          lifecycleLastKey: eventKey,
          lifecycleProcessingAt: new Date(),
          lifecycleLastError: null,
        }
      },
      {
        new: true,
      }
    );
  }

  async markLifecycleCompleted({ paymentId, eventKey, subscriptionId, invoiceId, webhookData }) {
    return Payment.findOneAndUpdate(
      { _id: paymentId },
      {
        $set: {
          status: 'completed',
          paymentStatus: 'success',
          completedAt: new Date(),
          subscriptionId,
          invoiceId,
          webhookData,
          lifecycleState: 'completed',
          lifecycleProcessedAt: new Date(),
          lifecycleLastError: null,
        },
        $pull: {
          processingEventKeys: eventKey,
        },
        $addToSet: {
          completedEventKeys: eventKey,
        }
      },
      {
        new: true,
      }
    );
  }

  async markLifecycleFailed({ paymentId, eventKey, errorMessage }) {
    return Payment.updateOne(
      { _id: paymentId },
      {
        $set: {
          status: 'failed',
          lifecycleState: 'failed',
          lifecycleLastError: errorMessage || 'UNKNOWN_ERROR',
        },
        $pull: {
          processingEventKeys: eventKey,
        }
      }
    );
  }
}

export default new PaymentPersistenceService();
