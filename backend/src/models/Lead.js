import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  // Multi-tenant isolation - Use String accountId (matches system standard)
  accountId: {
    type: String,
    required: true,
    index: true
  },

  // Links to existing records
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },

  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true,
    index: true
  },

  phoneNumberId: {
    type: String,
    required: true,
    index: true
  },

  // Lead Information
  name: {
    type: String,
    required: true,
    index: true
  },

  email: {
    type: String,
    lowercase: true,
    index: true
  },

  phone: {
    type: String,
    index: true
  },

  company: {
    type: String,
    index: true
  },

  // Lead Classification
  intent: {
    type: String,
    enum: [
      'inquiry',
      'demo_request',
      'pricing_inquiry',
      'product_info',
      'complaint',
      'support_request',
      'purchase_intent',
      'comparison',
      'integration',
      'customization',
      'other'
    ],
    default: 'inquiry',
    index: true
  },

  keywords: {
    type: [String],
    default: []
  },

  // Lead Engagement
  messageCount: {
    type: Number,
    default: 1,
    index: true
  },

  firstMessage: {
    type: Date,
    default: Date.now
  },

  lastMessage: {
    type: Date,
    default: Date.now
  },

  // Lead Quality Scoring (0-100)
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 50,
    index: true
  },

  scoreBreakdown: {
    engagement: { type: Number, default: 0 },    // 0-30: based on message count
    intent: { type: Number, default: 0 },        // 0-40: based on intent keywords
    recency: { type: Number, default: 0 },       // 0-20: based on last message time
    completion: { type: Number, default: 0 }     // 0-10: profile completeness
  },

  // Lead Status & Management
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'negotiating', 'converted', 'lost', 'stale'],
    default: 'new',
    index: true
  },

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },

  notes: {
    type: String,
    default: ''
  },

  tags: {
    type: [String],
    default: []
  },

  // Follow-up Management
  nextFollowUp: {
    type: Date,
    sparse: true
  },

  followUpCount: {
    type: Number,
    default: 0
  },

  lastFollowUp: {
    type: Date,
    sparse: true
  },

  // Conversion Tracking
  convertedAt: {
    type: Date,
    sparse: true
  },

  conversionValue: {
    type: Number,
    sparse: true
  },

  // Metadata
  sourceMessage: {
    type: String,
    default: ''
  },

  metadata: {
    type: Map,
    of: String,
    default: new Map()
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'leads'
});

// Compound indexes for efficient queries
leadSchema.index({ accountId: 1, status: 1 });
leadSchema.index({ accountId: 1, createdAt: -1 });
leadSchema.index({ accountId: 1, conversationId: 1 });

const Lead = mongoose.model('Lead', leadSchema);
export default Lead;
