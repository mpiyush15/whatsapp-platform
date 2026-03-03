import Broadcast from '../src/models/Broadcast.js';
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
        // Find pending, running, or scheduled broadcasts
        const broadcasts = await Broadcast.find({
          $or: [
            { status: 'running', 'stats.pending': { $gt: 0 } },           // Resume running broadcasts
            { status: 'scheduled', 'scheduling.scheduledTime': { $exists: true, $lte: new Date() } }, // Process scheduled broadcasts
            { status: 'draft', scheduling: { $exists: true }, 'scheduling.scheduledTime': { $lte: new Date() } } // Legacy support
          ]
        }).sort({ createdAt: 1 });

        for (const broadcast of broadcasts) {
          // Handle scheduled broadcasts (status: 'scheduled')
          if (broadcast.status === 'scheduled' && broadcast.scheduling?.scheduledTime) {
            const now = new Date();
            if (now >= broadcast.scheduling.scheduledTime) {
              console.log(`📅 Starting scheduled broadcast ${broadcast._id} (scheduled for ${broadcast.scheduling.scheduledTime})`);
              await this.executeBroadcast(broadcast);
            }
          }
          // Handle draft broadcasts with scheduled time (legacy)
          else if (broadcast.status === 'draft' && broadcast.scheduling?.scheduledTime) {
            const now = new Date();
            if (now >= broadcast.scheduling.scheduledTime) {
              console.log(`📅 Starting scheduled broadcast ${broadcast._id}`);
              await this.executeBroadcast(broadcast);
            }
          }
          // Resume running broadcasts
          else if (broadcast.status === 'running' && broadcast.stats.pending > 0) {
            console.log(`⏳ Resuming broadcast ${broadcast._id}`);
            await this.executeBroadcast(broadcast);
          }
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

      // Mark as failed
      await Broadcast.findByIdAndUpdate(broadcast._id, {
        status: 'failed',
        completedAt: new Date()
      });
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
    const total = await Broadcast.countDocuments();
    const running = await Broadcast.countDocuments({ status: 'running' });
    const completed = await Broadcast.countDocuments({ status: 'completed' });
    const failed = await Broadcast.countDocuments({ status: 'failed' });
    const pending = await Broadcast.countDocuments({ status: 'draft' });

    return {
      total,
      running,
      completed,
      failed,
      pending,
      isRunning: this.isRunning
    };
  }
}

// Create and export singleton instance
const worker = new BroadcastQueueWorker();

export default worker;
