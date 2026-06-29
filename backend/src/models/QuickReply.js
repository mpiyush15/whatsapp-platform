import mongoose from 'mongoose';

const quickReplySchema = new mongoose.Schema({
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

  workspaceId: {
    type: String,
    default: null,
    index: true
  },

  // Quick reply identity
  name: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'General',
    enum: ['General', 'Support', 'Sales', 'Order', 'Custom']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document'],
    default: 'text'
  },

  // Optional media for non-text quick replies
  mediaUrl: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  mimeType: {
    type: String,
    default: null
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for quick retrieval of active quick replies per account
quickReplySchema.index({ accountId: 1, isActive: 1 });
quickReplySchema.index({ accountId: 1, workspaceId: 1, isActive: 1 });

const QuickReply = mongoose.model('QuickReply', quickReplySchema);

export default QuickReply;
