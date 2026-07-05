import cron from 'node-cron';
import { processHealthcareAppointmentReminders, processHealthcareFollowUpReminders } from '../jobs/healthcareReminderJob.js';
import logger from '../utils/logger.js';

let scheduledJob = null;

/** Runs every 15 minutes — 24h appointment reminders for healthcare */
export const startHealthcareReminderScheduler = () => {
  // Only start on primary instance in cluster mode
  if (process.env.NODE_APP_INSTANCE && process.env.NODE_APP_INSTANCE !== '0') return null;
  if (scheduledJob) return scheduledJob; // Prevent duplicate execution

  try {
    scheduledJob = cron.schedule('*/15 * * * *', async () => {
      try {
        await processHealthcareAppointmentReminders();
        await processHealthcareFollowUpReminders();
      } catch (error) {
        logger.error('Healthcare reminder scheduler error:', error.message);
      }
    });
    logger.info('Healthcare reminder scheduler started (every 15 min)');
    return scheduledJob;
  } catch (error) {
    logger.error('Failed to start healthcare reminder scheduler:', error.message);
    return null;
  }
};

export const stopHealthcareReminderScheduler = () => {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    logger.info('Healthcare reminder scheduler stopped');
    return true;
  }
  return false;
};

export default { startHealthcareReminderScheduler, stopHealthcareReminderScheduler };
