import { Worker } from 'bullmq';
import { connection } from '../queues/connection.js';
import broadcastExecutionService from '../services/broadcastExecutionService.js';
import broadcastRepository from '../repositories/broadcastRepository.js';
import logger from '../utils/logger.js';
import { dispatchWebhookEvent } from '../services/webhookDispatcherService.js';

const BATCH_SIZE = 50;

let broadcastWorker = null;

// Only start the worker on the primary instance if running in cluster mode
if (!process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0') {
  broadcastWorker = new Worker(
    'BroadcastQueue',
    async (job) => {
      const { accountId, phoneNumberId, broadcast, recipientPhone, totalRecipients } = job.data;

      try {
        // 1. Send the message
        await broadcastExecutionService.sendBroadcastMessage(accountId, phoneNumberId, broadcast, recipientPhone);

        // 2. Mark phone sent safely
        await broadcastRepository.markPhoneSent(broadcast._id, recipientPhone);

        return { success: true, recipientPhone };
      } catch (error) {
        // Log the error natively to our DB without crashing the worker
        await broadcastRepository.pushErrorLog(broadcast._id, {
          phoneNumber: recipientPhone,
          error: error.message,
          errorCode: error.code || null,
        });
        
        throw error; // Let BullMQ know it failed so it triggers 'failed' event
      }
    },
    {
      connection,
      concurrency: 5, // Process 5 jobs at exactly the same time per worker
      limiter: {
        max: 50, // Strict limit: 50 messages
        duration: 1000, // per 1 second (1000ms)
      },
    }
  );

  // Listen to completed jobs
  broadcastWorker.on('completed', async (job) => {
    const { broadcast } = job.data;
    
    // Atomically increment sent count
    await broadcastRepository.incrementProgress(broadcast._id, {
      sent: 1,
      pending: -1,
    });
    
    await checkBroadcastCompletion(broadcast._id, job.data.accountId, job.data.totalRecipients);
  });

  // Listen to failed jobs
  broadcastWorker.on('failed', async (job, err) => {
    const { broadcast } = job.data;
    
    // Atomically increment failed count
    await broadcastRepository.incrementProgress(broadcast._id, {
      failed: 1,
      pending: -1,
    });

    await checkBroadcastCompletion(broadcast._id, job.data.accountId, job.data.totalRecipients);
  });

  broadcastWorker.on('error', (err) => {
    logger.error('❌ Broadcast Worker Error:', err.message);
  });
}

export { broadcastWorker };

export const closeBroadcastWorker = async () => {
  if (broadcastWorker) {
    await broadcastWorker.close();
    logger.info('⏹️ Broadcast Worker stopped gracefully');
  }
};

/**
 * Checks if the broadcast is fully finished, and updates the final status.
 */
async function checkBroadcastCompletion(broadcastId, accountId, totalRecipients) {
  // We need to fetch the latest stats. 
  // In a high volume system, doing this per-job is intense, but MongoDB can handle it for now.
  // A better approach is using Redis counters, but keeping it DB-consistent here.
  const broadcast = await broadcastRepository.findById(broadcastId, accountId);
  if (!broadcast) return;

  const totalProcessed = (broadcast.stats?.sent || 0) + (broadcast.stats?.failed || 0);
  
  // If we have processed everyone, mark it completed!
  if (totalProcessed >= totalRecipients && broadcast.status === 'running') {
    await broadcastRepository.updateStatus(broadcastId, 'completed', {
      completedAt: new Date(),
      'stats.pending': 0,
      'stats.inProgress': 0,
    });
    
    logger.info(`✅ Broadcast [${broadcastId}] Fully Completed!`);

    dispatchWebhookEvent({
      accountId,
      projectId: broadcast?.projectId || null,
      eventType: 'broadcast.completed',
      payload: {
        broadcastId: String(broadcastId),
        totalRecipients,
        sent: broadcast.stats?.sent || 0,
        failed: broadcast.stats?.failed || 0,
      },
      source: 'broadcast-execution',
    }).catch((err) => logger.error('broadcast.completed webhook dispatch failed', err));
  }
}
