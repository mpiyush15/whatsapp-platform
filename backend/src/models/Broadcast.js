import mongoose from 'mongoose';

const broadcastSchema = new mongoose.Schema(
  {
    accountId: {
      type: String,
      required: true,
      index: true
    },
    phoneNumberId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    messageType: {
      type: String,
      enum: ['text', 'template', 'media'],
      default: 'text'
    },
    content: {
      text: String,
      templateName: String,
      templateParams: [String],
      mediaUrl: String,
      mediaType: String
    },
    recipientList: {
      type: String,
      enum: ['all_contacts', 'segment', 'manual'],
      required: true
    },
    recipients: {
      contactIds: [String],
      segmentId: String,
      phoneNumbers: [String]
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'completed', 'cancelled', 'failed'],
      default: 'draft'
    },
    scheduling: {
      type: {
        type: String,
        enum: ['immediate', 'scheduled'],
        default: 'immediate'
      },
      scheduledTime: Date
    },
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      inProgress: { type: Number, default: 0 }
    },
    throttleRate: {
      type: Number,
      default: 50,
      description: 'Messages per second'
    },
    createdBy: String,
    startedAt: Date,
    completedAt: Date,
    errorLog: [
      {
        phoneNumber: String,
        error: String,
        timestamp: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true,
    collection: 'broadcasts'
  }
);

// Indexes
broadcastSchema.index({ accountId: 1, phoneNumberId: 1 });
broadcastSchema.index({ accountId: 1, status: 1 });
broadcastSchema.index({ accountId: 1, createdAt: -1 });

export default mongoose.model('Broadcast', broadcastSchema);
