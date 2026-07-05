/**
 * Payment Timeout Job Scheduler
 * Uses node-cron to run payment timeout check every 15 minutes
 * Runs in background when server starts
 */

import cron from 'node-cron';
import { checkPaymentTimeouts } from '../jobs/paymentTimeoutJob.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
let scheduledJob = null;

export const startPaymentTimeoutScheduler = () => {
  // Only start on primary instance in cluster mode
  if (process.env.NODE_APP_INSTANCE && process.env.NODE_APP_INSTANCE !== '0') return null;
  if (scheduledJob) return scheduledJob; // Prevent duplicate execution

  try {
    // Schedule job to run every 15 minutes (at 0, 15, 30, 45 minute marks)
    scheduledJob = cron.schedule('*/15 * * * *', async () => {
      try {
        await checkPaymentTimeouts();
      } catch (error) {
        logger.error('❌ Payment timeout check error:', error.message);
      }
    });
    return scheduledJob;
  } catch (error) {
    logger.error('❌ Failed to start payment timeout scheduler:', error.message);
    return null;
  }
};

export const stopPaymentTimeoutScheduler = () => {
  if (scheduledJob) {
    scheduledJob.stop();
    logger.info('⏹️ Payment timeout scheduler stopped');
    return true;
  }
  return false;
};

// Alternative: Manual trigger function
// Use this if you want to trigger the job via API endpoint
export const triggerPaymentTimeoutCheck = async () => {
  logger.info('🔔 [MANUAL TRIGGER] Running payment timeout check...');
  try {
    const result = await checkPaymentTimeouts();
    logger.info('🔔 [MANUAL TRIGGER] Payment timeout check completed:', result);
    return result;
  } catch (error) {
    logger.error('🔔 [MANUAL TRIGGER] Error:', error.message);
    throw error;
  }
};

export default {
  startPaymentTimeoutScheduler,
  stopPaymentTimeoutScheduler,
  triggerPaymentTimeoutCheck
};
