import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
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

    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['broadcast', 'message', 'contact', 'template', 'system', 'alert'],
      default: 'system'
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    },
    relatedId: {
      type: String,
      description: 'ID of related resource (broadcast, message, etc)'
    },
    relatedType: {
      type: String,
      description: 'Type of related resource'
    },
    actionUrl: {
      type: String,
      description: 'URL to navigate to when notification is clicked'
    },
    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'notifications'
  }
);

// Indexes
notificationSchema.index({ accountId: 1, createdAt: -1 });
notificationSchema.index({ accountId: 1, read: 1 });

export default mongoose.model('Notification', notificationSchema);
