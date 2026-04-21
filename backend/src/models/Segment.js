import mongoose from 'mongoose';

/**
 * Segment Model (CRM)
 * Saved contact filters/audience segments
 * Used to quickly target specific contact groups
 */
const segmentSchema = new mongoose.Schema({
  // Multi-tenant isolation
  accountId: {
    type: String,
    required: true,
    index: true
  },

  // Segment metadata
  name: {
    type: String,
    required: true
  },
  description: String,
  
  // Filter criteria
  filters: {
    // Contact type filter
    type: {
      type: [String],
      enum: ['customer', 'lead', 'other'],
      default: []
    },
    
    // City filter
    city: [String],
    
    // Business name filter
    businessName: [String],
    
    // Tags filter (include at least one of these)
    tags: [String],
    
    // Last message activity (days)
    lastMessageDays: {
      type: Number,
      default: null
    },
    
    // Minimum message count
    minMessages: {
      type: Number,
      default: null
    },
    
    // Opted in status
    isOptedIn: {
      type: Boolean,
      default: null
    },
    
    // Custom date range
    createdAfter: Date,
    createdBefore: Date,
    
    // Search text (name, phone, email)
    searchText: String
  },

  // Stats (cached, updated when segment is used)
  stats: {
    contactCount: {
      type: Number,
      default: 0
    },
    lastCalculatedAt: Date
  },

  // Created by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Is this segment pinned/favorite
  isPinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
segmentSchema.index({ accountId: 1, name: 1 }, { unique: true });
segmentSchema.index({ accountId: 1, isPinned: -1, createdAt: -1 });

export default mongoose.model('Segment', segmentSchema);
