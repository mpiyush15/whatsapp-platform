import platformBillingNotificationService from '../services/platformBillingNotificationService.js';
import logger from '../utils/logger.js';

const INTERVAL_MS = Number(process.env.PLATFORM_BILLING_REMINDER_INTERVAL_MS || 24 * 60 * 60 * 1000);
const ENABLED = process.env.PLATFORM_BILLING_REMINDER_ENABLED !== 'false';

let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    await platformBillingNotificationService.runBillingReminderSweep();
  } catch (err) {
    logger.error('Platform billing reminder sweep failed', err.message);
  } finally {
    running = false;
  }
}

export function startPlatformBillingReminderScheduler() {
  if (!ENABLED) {
    logger.info('Platform billing reminder scheduler disabled');
    return;
  }
  if (timer) return;

  logger.info('Starting platform billing reminder scheduler', { intervalMs: INTERVAL_MS });
  timer = setInterval(tick, INTERVAL_MS);
  setTimeout(tick, 30_000);
}

export function stopPlatformBillingReminderScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
