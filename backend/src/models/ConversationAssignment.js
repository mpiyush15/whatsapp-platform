import mongoose from 'mongoose';

/**
 * ConversationAssignment Model
 * Tracks assignment history for audit trail, load balancing, and performance metrics
 * One record per agent assignment (not overwritten, appended)
 */
const conversationAssignmentSchema = new mongoose.Schema({
  // Multi-tenant isolation
  accountId: {
    type: String,
    required: true,
    index: true
  },

  // Which conversation
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },

  // Which agent
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
    index: true
  },

  // When was this assigned
  assignedAt: {
    type: Date,
    required: true
  },

  // When was this assignment ended (null if still active)
  unassignedAt: Date,

  // Reason for unassignment
  reason: {
    type: String,
    enum: ['completed', 'transferred', 'abandoned', 'timeout', 'manual'],
    default: null
  },

  // Status of this assignment
  status: {
    type: String,
    enum: ['active', 'resolved', 'transferred', 'abandoned'],
    default: 'active'
  },

  // How many messages did this agent handle in this assignment
  handledMessagesCount: {
    type: Number,
    default: 0
  },

  // Total interaction time in milliseconds
  interactionTime: {
    type: Number,
    default: 0
  },

  // Average response time for this assignment (milliseconds)
  averageResponseTime: Number,

  // Resolution metrics
  resolutionTime: Number, // time to resolve (milliseconds)
  resolved: {
    type: Boolean,
    default: false
  },

  // Notes on why this assignment ended
  notes: String,

  // Agent availability status when assigned
  agentStatusAtAssignment: String
}, {
  timestamps: true
});

// Compound indexes for efficient queries
conversationAssignmentSchema.index({ accountId: 1, conversationId: 1, assignedAt: -1 });
conversationAssignmentSchema.index({ accountId: 1, agentId: 1, assignedAt: -1 });

// Index for finding active assignments
conversationAssignmentSchema.index({ accountId: 1, status: 1, unassignedAt: 1 });

// Index for historical queries
conversationAssignmentSchema.index({ accountId: 1, createdAt: -1 });

export default mongoose.model('ConversationAssignment', conversationAssignmentSchema);
