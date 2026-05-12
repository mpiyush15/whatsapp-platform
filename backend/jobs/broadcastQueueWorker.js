import broadcastRepository from '../src/repositories/broadcastRepository.js';
import broadcastExecutionService from '../src/services/broadcastExecutionService.js';

/**
 * Broadcast Queue Worker
 * Phase 2B: Asynchronous queue processing for broadcasts
 * Handles background execution and resumption
 */

class BroadcastQueueWorker {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 5000; // Check every 5 seconds
  }

  /**
   * Start the queue worker
   */
  start() {
    if (this.isRunning) {
      console.log('Broadcast queue worker already running');
      return;
    }

    this.isRunning = true;
    console.log('✅ Broadcast queue worker started');

    this.processQueue();
  }

  /**
   * Stop the queue worker
   */
  stop() {
    this.isRunning = false;
    console.log('❌ Broadcast queue worker stopped');
  }

  /**
   * Main queue processing loop
   * Handles:
   * 1. Scheduled broadcasts - executes when scheduled time arrives
   * 2. Running broadcasts - resumes sending pending messages
   */
  async processQueue() {
    while (this.isRunning) {
      try {
        // Repository handles all pending/scheduled/running filter logic
        const broadcasts = await broadcastRepository.findPending();

        for (const broadcast of broadcasts) {
          if (broadcast.status === 'scheduled' || broadcast.status === 'draft') {
            console.log(`📅 Starting scheduled broadcast ${broadcast._id}`);
          } else {
            console.log(`⏳ Resuming broadcast ${broadcast._id}`);
          }
          await this.executeBroadcast(broadcast);
        }

        // Wait before next check
        await this.sleep(this.checkInterval);

      } catch (error) {
        console.error('Error in broadcast queue worker:', error);
        await this.sleep(this.checkInterval);
      }
    }
  }

  /**
   * Execute broadcast
   */
  async executeBroadcast(broadcast) {
    try {
      await broadcastExecutionService.executeBroadcast(
        broadcast.accountId,
        broadcast._id,
        broadcast.phoneNumberId
      );

      console.log(`✅ Broadcast ${broadcast._id} completed`);

    } catch (error) {
      console.error(`Error executing broadcast ${broadcast._id}:`, error);

      // Mark as failed via repository
      await broadcastRepository.updateStatus(broadcast._id, 'failed', { completedAt: new Date() });
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const stats = await broadcastRepository.getQueueStats();
    return { ...stats, isRunning: this.isRunning };
  }
}

// Create and export singleton instance
const worker = new BroadcastQueueWorker();

export default worker;
