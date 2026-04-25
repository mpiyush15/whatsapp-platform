import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  // Multi-tenant isolation - Use String accountId (matches system standard)
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
  
  // Contact info
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  whatsappNumber: {
    type: String,
    required: true
  },
  email: String,

  // Contact origin/source for UI reporting
  source: {
    type: String,
    default: 'Manual'
  },
  
  // Type
  type: {
    type: String,
    enum: ['customer', 'lead', 'other'],
    default: 'customer'
  },
  
  // Opt-in status (CRITICAL for compliance)
  isOptedIn: {
    type: Boolean,
    default: true
  },
  optInDate: Date,
  optOutDate: Date,
  
  // Engagement tracking
  lastMessageAt: Date,
  messageCount: {
    type: Number,
    default: 0
  },
  
  // Tags and metadata (flexible for any use case)
  tags: [String],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Profile picture URL
  profilePictureUrl: String,
  
  // CRM notes about this contact (different from internal notes)
  notes: String,
  
  // Conversation metrics
  conversationCount: {
    type: Number,
    default: 0
  },
  
  // Contact engagement tracking
  lastContactedAt: Date,
  firstContactAt: {
    type: Date,
    default: Date.now
  },
  
  // Custom attributes for flexibility (account-specific fields)
  customAttributes: {
    type: Map,
    of: String,
    default: new Map()
  },
  
  // Engagement score for prioritization (0-100)
  engagementScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

// Indexes
contactSchema.index({ accountId: 1, whatsappNumber: 1 }, { unique: true });
contactSchema.index({ accountId: 1, type: 1 });
contactSchema.index({ accountId: 1, isOptedIn: 1 });
contactSchema.index({ accountId: 1, tags: 1 });
contactSchema.index({ accountId: 1, createdAt: -1 });

export default mongoose.model('Contact', contactSchema);
