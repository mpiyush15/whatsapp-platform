/**
 * Payment Timeout Job
 * Marks pending payments as failed if not completed within 1 hour
 * Called periodically (every 15 minutes recommended)
 */

import Subscription from '../models/Subscription.js';
import Account from '../models/Account.js';
import { emailService } from '../services/emailService.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const PAYMENT_TIMEOUT_MINUTES = 60; // 1 hour

export const checkPaymentTimeouts = async () => {
  try {
    logger.info('⏰ Starting payment timeout check...');

    // Calculate cutoff time (1 hour ago)
    const cutoffTime = new Date(Date.now() - PAYMENT_TIMEOUT_MINUTES * 60 * 1000);

    // Find subscriptions that:
    // 1. Are in 'pending_payment' status
    // 2. Created more than 1 hour ago
    const pendingSubscriptions = await Subscription.find({
      status: 'pending_payment',
      createdAt: { $lt: cutoffTime }
    }).populate('accountId');

    logger.info(`📋 Found ${pendingSubscriptions.length} pending payments older than ${PAYMENT_TIMEOUT_MINUTES} minutes`);

    const results = {
      failed: [],
      errors: []
    };

    for (const subscription of pendingSubscriptions) {
      try {
        const account = subscription.accountId;

        if (!account) {
          console.warn(`⚠️  Subscription ${subscription.subscriptionId} has no account reference`);
          continue;
        }

        // ✅ Mark subscription as failed
        subscription.status = 'failed';
        subscription.failureReason = 'Payment timeout - No payment received within 1 hour';
        subscription.failedAt = new Date();
        await subscription.save();

        logger.info(`❌ Marked subscription ${subscription.subscriptionId} as FAILED`);

        // ✅ Revert account status to 'pending' (payment not completed)
        // Only revert if account status is 'active' and created recently
        if (account.status === 'active') {
          account.status = 'pending';
          await account.save();
          logger.info(`⏳ Reverted account ${account.accountId} status to 'pending'`);
        }

        results.failed.push({
          subscriptionId: subscription.subscriptionId,
          accountId: account.accountId,
          email: account.email,
          name: account.name
        });

        // ✅ Send notification email to client
        try {
          const retryLink = `${process.env.FRONTEND_URL || 'https://replysys.com'}/checkout?plan=${subscription.plan}`;

          await emailService.sendPaymentFailedEmail({
            email: account.email,
            name: account.name,
            plan: subscription.plan || 'Unknown',
            amount: subscription.pricing?.amount || 0,
            paymentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours to retry
            retryLink: retryLink,
            reason: 'Payment was not completed within 1 hour. Your subscription requires payment to activate.'
          });

          logger.info(`📧 Payment failed notification sent to ${account.email}`);
        } catch (emailErr) {
          logger.error(`⚠️  Failed to send payment failure email to ${account.email}:`, emailErr.message);
        }
      } catch (err) {
        logger.error(`❌ Error processing subscription ${subscription.subscriptionId}:`, err.message);
        results.errors.push({
          subscriptionId: subscription.subscriptionId,
          error: err.message
        });
      }
    }

    logger.info('✅ Payment timeout check completed:', {
      total: pendingSubscriptions.length,
      failed: results.failed.length,
      errors: results.errors.length
    });

    return {
      success: true,
      processed: results.failed.length,
      errors: results.errors,
      details: results.failed
    };
  } catch (error) {
    logger.error('❌ Payment timeout job error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Scheduled Job Endpoint
 * Call via: POST /api/jobs/check-payment-timeouts
 * Should be called every 15 minutes by external scheduler
 */
export const paymentTimeoutJobHandler = async (req, res) => {
  try {
    const result = await checkPaymentTimeouts();
    res.json(result);
  } catch (error) {
    logger.error('Payment timeout job handler error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export default checkPaymentTimeouts;
