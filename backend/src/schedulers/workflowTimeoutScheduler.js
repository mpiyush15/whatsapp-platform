import cron from 'node-cron';
import { processWorkflowTimeouts } from '../jobs/workflowTimeoutJob.js';
import logger from '../utils/logger.js';

let scheduledJob = null;

/** Runs every minute — picks up expired workflow response deadlines */
export const startWorkflowTimeoutScheduler = () => {
  try {
    scheduledJob = cron.schedule('* * * * *', async () => {
      try {
        await processWorkflowTimeouts();
      } catch (error) {
        logger.error('❌ Workflow timeout scheduler error:', error.message);
      }
    });
    logger.info('✅ Workflow timeout scheduler started (every 1 min)');
    return scheduledJob;
  } catch (error) {
    logger.error('❌ Failed to start workflow timeout scheduler:', error.message);
    return null;
  }
};

export const stopWorkflowTimeoutScheduler = () => {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    logger.info('⏹️ Workflow timeout scheduler stopped');
    return true;
  }
  return false;
};

export default { startWorkflowTimeoutScheduler, stopWorkflowTimeoutScheduler };
