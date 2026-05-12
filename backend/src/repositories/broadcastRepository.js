import Broadcast from '../models/Broadcast.js';

/**
 * Data access layer for the Broadcast model.
 * All direct Broadcast DB operations should go through here.
 */
class BroadcastRepository {
  /**
   * Find all broadcasts that are ready to be executed:
   *  - status=running with pending messages remaining (resume)
   *  - status=scheduled whose scheduledTime has arrived
   *  - status=draft with a past scheduledTime (legacy support)
   *
   * @returns {Promise<Broadcast[]>}
   */
  async findPending() {
    return Broadcast.find({
      $or: [
        { status: 'running', 'stats.pending': { $gt: 0 } },
        { status: 'scheduled', 'scheduling.scheduledTime': { $exists: true, $lte: new Date() } },
        { status: 'draft', scheduling: { $exists: true }, 'scheduling.scheduledTime': { $lte: new Date() } }
      ]
    }).sort({ createdAt: 1 });
  }

  /**
   * Find a single broadcast by id + accountId.
   *
   * @param {string} broadcastId
   * @param {string} accountId
   * @returns {Promise<Broadcast|null>}
   */
  async findById(broadcastId, accountId) {
    return Broadcast.findOne({ _id: broadcastId, accountId });
  }

  /**
   * Update broadcast status (and optional extra fields atomically).
   *
   * @param {string} broadcastId
   * @param {string} status   One of draft|scheduled|running|completed|cancelled|failed
   * @param {object} [extra]  Additional fields to set (e.g. startedAt, completedAt)
   * @returns {Promise<Broadcast|null>}
   */
  async updateStatus(broadcastId, status, extra = {}) {
    return Broadcast.findByIdAndUpdate(
      broadcastId,
      { $set: { status, ...extra } },
      { new: true }
    );
  }

  /**
   * Atomically save mid-execution progress stats.
   *
   * @param {string} broadcastId
   * @param {{ sent: number, failed: number, pending: number, inProgress: number }} stats
   * @returns {Promise<void>}
   */
  async saveProgress(broadcastId, stats) {
    await Broadcast.findByIdAndUpdate(
      broadcastId,
      {
        $set: {
          'stats.sent': stats.sent,
          'stats.failed': stats.failed,
          'stats.pending': stats.pending,
          'stats.inProgress': stats.inProgress
        }
      }
    );
  }

  /**
   * Record that a phone number was successfully sent to.
   * Uses $addToSet so it's safe to call multiple times.
   *
   * @param {string} broadcastId
   * @param {string} phone
   * @returns {Promise<void>}
   */
  async markPhoneSent(broadcastId, phone) {
    await Broadcast.findByIdAndUpdate(
      broadcastId,
      { $addToSet: { sentPhones: phone } }
    );
  }

  /**
   * Append an error entry to the broadcast errorLog.
   *
   * @param {string} broadcastId
   * @param {{ phoneNumber: string, error: string, errorCode?: string }} entry
   * @returns {Promise<void>}
   */
  async pushErrorLog(broadcastId, entry) {
    await Broadcast.findByIdAndUpdate(
      broadcastId,
      {
        $push: {
          errorLog: {
            phoneNumber: entry.phoneNumber,
            error: entry.error,
            errorCode: entry.errorCode || null,
            timestamp: new Date()
          }
        }
      }
    );
  }

  /**
   * Queue stats — used by the worker's getQueueStats().
   *
   * @returns {Promise<object>}
   */
  async getQueueStats() {
    const [total, running, completed, failed, pending] = await Promise.all([
      Broadcast.countDocuments(),
      Broadcast.countDocuments({ status: 'running' }),
      Broadcast.countDocuments({ status: 'completed' }),
      Broadcast.countDocuments({ status: 'failed' }),
      Broadcast.countDocuments({ status: 'draft' })
    ]);
    return { total, running, completed, failed, pending };
  }
}

export default new BroadcastRepository();
