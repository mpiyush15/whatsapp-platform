import mongoose from 'mongoose';

/**
 * InternalNote Model
 * Agent-only notes that are NEVER visible to customers
 * Used for team collaboration and conversation context
 */
const internalNoteSchema = new mongoose.Schema({
  // Multi-tenant isolation
  accountId: {
    type: String,
    required: true,
    index: true
  },

  // Which conversation this note belongs to
  // Use String type to match Conversation.conversationId (multi-tenant ID)
  conversationId: {
    type: String,
    required: true,
    index: true
  },

  // Which agent created this note
  createdByAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },

  // The note content
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },

  // Flag for important resolution notes
  isResolution: {
    type: Boolean,
    default: false
  },

  // Which agents are mentioned in this note (for notifications)
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  }],

  // Edit tracking
  editedAt: Date,
  editedByAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  },
  editHistory: [{
    content: String,
    editedAt: Date,
    editedBy: mongoose.Schema.Types.ObjectId
  }]
}, {
  timestamps: true
});

// Compound indexes for efficient queries
internalNoteSchema.index({ accountId: 1, conversationId: 1 });
internalNoteSchema.index({ accountId: 1, createdByAgentId: 1 });

// Index for finding recent notes
internalNoteSchema.index({ accountId: 1, conversationId: 1, createdAt: -1 });

export default mongoose.model('InternalNote', internalNoteSchema);
