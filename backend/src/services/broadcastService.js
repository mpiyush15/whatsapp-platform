import Broadcast from '../models/Broadcast.js';
import Contact from '../models/Contact.js';
import Message from '../models/Message.js';

export class BroadcastService {
  /**
   * Create a new broadcast campaign
   * Supports immediate or scheduled sending
   */
  async createBroadcast(accountId, phoneNumberId, data) {
    const broadcast = new Broadcast({
      accountId,
      phoneNumberId,
      name: data.name,
      messageType: data.messageType || 'text',
      content: data.content,
      recipientList: data.recipientList,
      recipients: data.recipients,
      throttleRate: data.throttleRate || 50,
      createdBy: data.createdBy,
      // Handle scheduling
      scheduling: {
        type: data.scheduling?.type || 'immediate', // 'immediate' or 'scheduled'
        scheduledTime: data.scheduling?.scheduledTime || null
      }
    });

    // Set status based on scheduling type
    if (data.scheduling?.type === 'scheduled' && data.scheduling?.scheduledTime) {
      broadcast.status = 'scheduled';
    } else {
      broadcast.status = 'draft';
    }

    await broadcast.save();
    return broadcast;
  }

  /**
   * Get all broadcasts for an account
   */
  async getBroadcasts(accountId, phoneNumberId, filters = {}) {
    const query = { accountId };
    
    // Only filter by phoneNumberId if it's not 'any'
    if (phoneNumberId && phoneNumberId !== 'any') {
      query.phoneNumberId = phoneNumberId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const broadcasts = await Broadcast.find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50)
      .skip(filters.skip || 0);

    const total = await Broadcast.countDocuments(query);

    return { broadcasts, total };
  }

  /**
   * Get broadcast by ID
   */
  async getBroadcastById(accountId, broadcastId) {
    console.log(`🔍 BroadcastService: Looking for broadcast ${broadcastId} in account ${accountId}`);
    
    const broadcast = await Broadcast.findOne({
      _id: broadcastId,
      accountId
    });
    
    if (!broadcast) {
      console.log(`❌ Broadcast not found. Query: { _id: "${broadcastId}", accountId: "${accountId}" }`);
    } else {
      console.log(`✅ Broadcast found: ${broadcast.name} (status: ${broadcast.status})`);
    }
    
    return broadcast;
  }

  /**
   * Update broadcast
   */
  async updateBroadcast(accountId, broadcastId, data) {
    const broadcast = await Broadcast.findOneAndUpdate(
      { _id: broadcastId, accountId },
      data,
      { new: true }
    );

    return broadcast;
  }

  /**
   * Build recipient list based on selection type
   */
  async buildRecipientList(accountId, recipients) {
    const phoneNumbers = [];

    if (recipients.phoneNumbers) {
      phoneNumbers.push(...recipients.phoneNumbers);
    }

    if (recipients.contactIds && recipients.contactIds.length > 0) {
      const contacts = await Contact.find({
        _id: { $in: recipients.contactIds },
        accountId
      }).select('phoneNumber');

      phoneNumbers.push(...contacts.map(c => c.phoneNumber));
    }

    if (recipients.segmentId) {
      // Implement segment-based recipient selection if needed
      // For now, this would require a Segment model
    }

    return [...new Set(phoneNumbers)]; // Remove duplicates
  }

  /**
   * Start broadcast execution (or verify scheduled time for scheduled broadcasts)
   */
  async startBroadcast(accountId, broadcastId) {
    const broadcast = await this.getBroadcastById(accountId, broadcastId);

    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    // Allow starting from draft or failed statuses
    // For scheduled broadcasts, status is 'scheduled' and should be allowed
    const allowedStatuses = ['draft', 'failed', 'scheduled'];
    if (!allowedStatuses.includes(broadcast.status)) {
      throw new Error(`Cannot start broadcast with status: ${broadcast.status}`);
    }

    // If this is a scheduled broadcast, validate scheduled time
    if (broadcast.scheduling?.type === 'scheduled') {
      const scheduledTime = new Date(broadcast.scheduling.scheduledTime);
      const now = new Date();
      
      if (scheduledTime > now) {
        // Scheduled time is in the future, keep it scheduled
        broadcast.status = 'scheduled';
        await broadcast.save();
        return broadcast;
      }
      // If scheduled time has passed, proceed with immediate execution
    }

    const recipients = await this.buildRecipientList(accountId, broadcast.recipients);

    broadcast.stats.total = recipients.length;
    broadcast.stats.pending = recipients.length;
    broadcast.status = 'running';
    broadcast.startedAt = new Date();

    await broadcast.save();

    return broadcast;
  }

  /**
   * Cancel broadcast
   */
  async cancelBroadcast(accountId, broadcastId) {
    const broadcast = await this.getBroadcastById(accountId, broadcastId);

    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    broadcast.status = 'cancelled';
    await broadcast.save();

    return broadcast;
  }

  /**
   * Get broadcast statistics
   */
  async getBroadcastStats(accountId, broadcastId) {
    const broadcast = await this.getBroadcastById(accountId, broadcastId);

    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    return {
      broadcastId: broadcast._id,
      name: broadcast.name,
      status: broadcast.status,
      stats: broadcast.stats,
      startedAt: broadcast.startedAt,
      completedAt: broadcast.completedAt,
      successRate: broadcast.stats.total > 0 
        ? ((broadcast.stats.sent / broadcast.stats.total) * 100).toFixed(2) 
        : 0
    };
  }

  /**
   * Delete a broadcast
   */
  async deleteBroadcast(accountId, broadcastId) {
    const broadcast = await Broadcast.findOne({
      _id: broadcastId,
      accountId
    });

    if (!broadcast) {
      return null;
    }

    // Only allow deletion if broadcast is not running
    if (broadcast.status === 'running') {
      throw new Error('Cannot delete a broadcast that is currently running');
    }

    await Broadcast.deleteOne({
      _id: broadcastId,
      accountId
    });

    return true;
  }
}

export default new BroadcastService();
