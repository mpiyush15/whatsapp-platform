import mongoose from 'mongoose';

/**
 * ContactTimeline Model (CRM)
 * Immutable audit log of all events on a contact
 * Messages, tag changes, assignments, bulk actions
 */
const contactTimelineSchema = new mongoose.Schema({
  // Multi-tenant isolation
  accountId: {
    type: String,
    required: true,
    index: true
  },

  // Which contact does this activity belong to
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true,
    index: true
  },

  // Type of activity that occurred
  activityType: {
    type: String,
    enum: [
      'contact_created',
      'contact_updated',
      'message_sent',
      'message_received',
      'tag_added',
      'tag_removed',
      'assigned',
      'unassigned',
      'added_to_segment',
      'removed_from_segment',
      'bulk_import',
      'note_added',
      'auto_synced'
    ],
    required: true,
    index: true
  },

  // Who performed the action
  actor: {
    type: {
      type: String,
      enum: ['system', 'agent', 'user', 'api'],
      required: true
    },
    id: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String
  },

  // Flexible details about the activity
  details: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
    // Examples:
    // - message_sent: { text, preview }
    // - tag_added: { tagName }
    // - assigned: { agentId, agentName }
    // - added_to_segment: { segmentName, segmentId }
    // - bulk_import: { count, source }
  },

  // Related entity ID (message, segment, etc.)
  relatedId: mongoose.Schema.Types.ObjectId,
  relatedType: {
    type: String,
    enum: ['message', 'segment', 'agent', 'tag', 'note']
  },

  // Description (human readable)
  description: String,

  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Indexes
contactTimelineSchema.index({ accountId: 1, contactId: 1, createdAt: -1 });
contactTimelineSchema.index({ accountId: 1, activityType: 1 });
contactTimelineSchema.index({ accountId: 1, createdAt: -1 });

export default mongoose.model('ContactTimeline', contactTimelineSchema);
