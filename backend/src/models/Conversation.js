import mongoose from 'mongoose';

/**
 * Conversation = THREAD (one per user + phone number)
 * Industry standard pattern (Twilio / Interakt / WATI)
 * 
 * CRITICAL: This does NOT store message content
 * Messages are stored separately in Message model
 */
const conversationSchema = new mongoose.Schema({
  // Multi-tenant isolation - Use String accountId (matches all other models)
  accountId: {
    type: String,
    required: true,
    index: true
  },
  
  // Workspace isolation (for multi-workspace accounts) - Can be null or String
  workspaceId: {
    type: String,
    default: null,
    index: true
  },

  // Project isolation (NEW - Phase 1)
  projectId: {
    type: String,
    default: null,
    index: true
  },
  
  // Phone number this conversation belongs to
  phoneNumberId: {
    type: String,
    required: true,
    index: true
  },
  
  // Conversation identity (unique per account + phone + user)
  conversationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // User/Contact info
  userPhone: {
    type: String,
    required: true
  },
  userName: String,
  userProfileName: String,
  
  // Last message preview (for inbox list)
  lastMessageAt: {
    type: Date,
    required: true
  },
  lastMessagePreview: {
    type: String,
    maxlength: 200
  },
  lastMessageType: String, // 'text', 'image', etc.
  
  // Status
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  
  // Unread tracking
  unreadCount: {
    type: Number,
    default: 0
  },
  
  // Assignment (Phase 2)
  assignedAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Metadata
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  tags: [String],
  notes: String,
  
  // Conversation type for categorization
  conversationType: {
    type: String,
    enum: ['customer', 'support', 'sales', 'feedback'],
    default: 'customer'
  },
  
  // Assignment history - track all agents who handled this conversation
  assignmentHistory: [{
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent'
    },
    assignedAt: Date,
    unassignedAt: Date,
    reason: String // 'completed', 'transferred', 'abandoned', etc.
  }],
  
  // Internal team notes (visible only to agents)
  internalNotes: {
    type: String,
    maxlength: 1000
  },
  
  // Who last read this conversation
  lastReadBy: {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent'
    },
    readAt: Date
  },
  
  // Message metrics
  messageCount: {
    type: Number,
    default: 0
  },
  
  // Performance tracking (in milliseconds)
  responseTime: Number,      // Avg time to respond to customer
  resolutionTime: Number,    // Time from creation to closure
  
  // Custom attributes for flexibility (can extend with account-specific fields)
  customAttributes: {
    type: Map,
    of: String,
    default: new Map()
  },
  
  // Last interaction tracking
  lastReadAt: Date,
  lastRepliedAt: Date
}, {
  timestamps: true
});

// Compound indexes for efficient queries
conversationSchema.index({ accountId: 1, phoneNumberId: 1 });
conversationSchema.index({ accountId: 1, lastMessageAt: -1 });
conversationSchema.index({ accountId: 1, status: 1 });
conversationSchema.index({ accountId: 1, createdAt: -1 });

// ✅ CRITICAL: Unique compound index to prevent duplicate conversations for same phone number
conversationSchema.index(
  { accountId: 1, phoneNumberId: 1, userPhone: 1 },
  { unique: true, sparse: true }
);

// Note: conversationId already has index: true and unique: true in schema

// Static method to get conversations with preview
conversationSchema.statics.getInboxList = async function(accountId, workspaceId, phoneNumberId, limit = 50) {
  return this.find({ 
    accountId, 
    workspaceId,
    ...(phoneNumberId && { phoneNumberId })
  })
  .sort({ lastMessageAt: -1 })
  .limit(limit)
  .lean();
};

export default mongoose.model('Conversation', conversationSchema);
