import ContactTimeline from '../models/ContactTimeline.js';
import logger from '../utils/logger.js';

/**
 * ContactTimeline Service
 * Helper to log all contact activities
 */
class ContactTimelineService {
  /**
   * Log activity to contact timeline
   */
  async logActivity(accountId, contactId, activityType, actor = {}, details = {}, description = '', relatedId = null, relatedType = null) {
    try {
      const defaultActor = {
        type: 'system',
        id: null,
        name: 'System',
        email: null,
        ...actor
      };

      const timeline = new ContactTimeline({
        accountId,
        contactId,
        activityType,
        actor: defaultActor,
        details: new Map(Object.entries(details)),
        description,
        relatedId,
        relatedType
      });

      await timeline.save();
      return timeline;
    } catch (error) {
      logger.error(`Failed to log contact timeline: ${error.message}`);
      // Don't throw - logging should never break main flow
    }
  }

  /**
   * Get timeline for contact
   */
  async getContactTimeline(accountId, contactId, limit = 50, skip = 0) {
    try {
      const timeline = await ContactTimeline.find({
        accountId,
        contactId
      })
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean();

      const total = await ContactTimeline.countDocuments({
        accountId,
        contactId
      });

      return {
        timeline,
        pagination: {
          total,
          skip: parseInt(skip),
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      logger.error(`Failed to get contact timeline: ${error.message}`);
      return { timeline: [], pagination: { total: 0, skip, limit } };
    }
  }

  /**
   * Format timeline entry for display
   */
  formatTimelineEntry(entry) {
    const activityDescriptions = {
      'contact_created': 'Contact created',
      'contact_updated': 'Contact updated',
      'message_sent': 'Message sent',
      'message_received': 'Message received',
      'tag_added': `Tag added: ${entry.details?.get?.('tagName') || 'Unknown'}`,
      'tag_removed': `Tag removed: ${entry.details?.get?.('tagName') || 'Unknown'}`,
      'assigned': `Assigned to ${entry.details?.get?.('agentName') || 'Agent'}`,
      'unassigned': 'Unassigned',
      'added_to_segment': `Added to segment: ${entry.details?.get?.('segmentName') || 'Unknown'}`,
      'removed_from_segment': `Removed from segment: ${entry.details?.get?.('segmentName') || 'Unknown'}`,
      'bulk_import': `Bulk imported (${entry.details?.get?.('count') || 'contacts'})`,
      'note_added': 'Note added',
      'auto_synced': 'Auto-synced from chat'
    };

    return {
      _id: entry._id,
      type: entry.activityType,
      description: entry.description || activityDescriptions[entry.activityType] || 'Activity recorded',
      actor: entry.actor,
      timestamp: entry.createdAt,
      details: entry.details
    };
  }
}

export default new ContactTimelineService();
