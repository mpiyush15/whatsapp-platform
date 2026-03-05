import mongoose from 'mongoose';

/**
 * Tag Model
 * Reusable tags for organizing conversations, contacts, and messages
 * Supports filtering, search, and categorization
 */
const tagSchema = new mongoose.Schema({
  // Multi-tenant isolation
  accountId: {
    type: String,
    required: true,
    index: true
  },

  // Tag name (unique per account)
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 50,
    trim: true
  },

  // Visual display properties
  color: {
    type: String,
    default: '#808080' // gray default
    // Expected format: hex color (#RRGGBB)
  },

  // Icon or emoji for tag
  icon: String, // emoji or icon name

  // Description of what this tag is for
  description: {
    type: String,
    maxlength: 200
  },

  // How many items are tagged with this
  usageCount: {
    type: Number,
    default: 0
  },

  // What type of objects this tag applies to
  type: {
    type: String,
    enum: ['conversation', 'contact', 'message'],
    required: true,
    index: true
  },

  // Whether this tag is active/available
  isActive: {
    type: Boolean,
    default: true
  },

  // Created by (which agent/user created this tag)
  createdByAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  }
}, {
  timestamps: true
});

// Unique index: accountId + name + type (each account can have tags with same name for different types)
tagSchema.index({ accountId: 1, name: 1, type: 1 }, { unique: true });

// Index for quick lookups by account and type
tagSchema.index({ accountId: 1, type: 1 });

// Index for finding active tags
tagSchema.index({ accountId: 1, isActive: 1, type: 1 });

export default mongoose.model('Tag', tagSchema);
