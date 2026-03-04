import mongoose from 'mongoose';

const failedMessageSchema = new mongoose.Schema({
  // Account tracking
  accountId: {
    type: String,
    required: true,
    index: true
  },

  // Phone number
  phoneNumberId: {
    type: String,
    required: true,
    index: true
  },

  // Conversation reference
  conversationId: {
    type: String,
    required: true,
    index: true
  },

  // Message metadata from webhook
  waMessageId: {
    type: String,
    index: true
  },

  userPhone: {
    type: String,
    required: true,
    index: true
  },

  // Raw webhook data
  rawMessageData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // Error details
  errorType: String,
  errorMessage: String,
  errorStack: String,

  // Retry tracking
  retryCount: {
    type: Number,
    default: 0,
    max: 5
  },

  lastRetryAt: Date,
  nextRetryAt: Date,

  // Status
  status: {
    type: String,
    enum: ['pending', 'retrying', 'resolved', 'failed'],
    default: 'pending'
  },

  // Resolution info
  resolvedAt: Date,
  resolvedMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  collection: 'failedMessages',
  timestamps: true 
});

// Index for querying pending failures
failedMessageSchema.index({ status: 1, accountId: 1, createdAt: -1 });

export default mongoose.model('FailedMessage', failedMessageSchema);
