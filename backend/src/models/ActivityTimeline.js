import mongoose from 'mongoose';

/**
 * ActivityTimeline Model
 * Immutable audit log of all events in a conversation
 * Every action (message, assign, tag, read, etc.) creates a new record
 * Used for analytics, compliance, and debugging
 */
const activityTimelineSchema = new mongoose.Schema({
  // Multi-tenant isolation
  accountId: {
    type: String,
    required: true,
    index: true
  },

  // Project isolation (NEW - Phase 1)
  projectId: {
    type: String,
    default: null,
    index: true
  },

  // Which conversation does this activity belong to
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },

  // Type of activity that occurred
  activityType: {
    type: String,
    enum: [
      'conversation_created',
      'message_received',
      'message_sent',
      'message_delivered',
      'message_read',
      'assigned',
      'reassigned',
      'unassigned',
      'closed',
      'reopened',
      'tagged',
      'tag_removed',
      'note_added',
      'note_updated',
      'typing_start',
      'typing_stop',
      'contact_updated',
      'priority_changed',
      'status_changed',
      'internal_note_added'
    ],
    required: true,
    index: true
  },

  // Who performed the action
  actor: {
    type: {
      type: String,
      enum: ['system', 'agent', 'customer'],
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
    // - message_sent: { messageId, text, mediaUrl }
    // - assigned: { agentId, previousAgentId }
    // - tagged: { tagName, tagId }
    // - message_delivered: { waMessageId, deliveredAt }
  },

  // If this activity is related to a specific message
  relatedMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },

  // If this activity is related to a specific agent
  relatedAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  },

  // Whether this activity is important (for highlighting)
  isImportant: {
    type: Boolean,
    default: false
  },

  // Timestamp is handled by createdAt (immutable - no updatedAt for audit log)
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false, // Don't add createdAt/updatedAt - use timestamp
  // Make this immutable - once created, cannot be updated
  collection: 'activitytimelines'
});

// Add timestamps manually to match other models
activityTimelineSchema.set('timestamps', { createdAt: 'timestamp', updatedAt: false });

// Compound indexes for efficient queries
activityTimelineSchema.index({ accountId: 1, conversationId: 1, timestamp: -1 });
activityTimelineSchema.index({ accountId: 1, activityType: 1, timestamp: -1 });

// Index for finding recent activities across account
activityTimelineSchema.index({ accountId: 1, timestamp: -1 });

// Index for finding activities by actor
activityTimelineSchema.index({ accountId: 1, 'actor.id': 1, timestamp: -1 });

// Index for finding activities related to agents
activityTimelineSchema.index({ accountId: 1, relatedAgentId: 1, timestamp: -1 });

export default mongoose.model('ActivityTimeline', activityTimelineSchema);
