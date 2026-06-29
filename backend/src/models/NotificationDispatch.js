import mongoose from 'mongoose';

const notificationDispatchSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  channel: {
    type: String,
    enum: ['email', 'whatsapp', 'in_app'],
    required: true,
    index: true,
  },
  eventType: {
    type: String,
    enum: ['subscription_activated', 'invoice_generated', 'onboarding_whatsapp'],
    required: true,
    index: true,
  },
  dispatchKey: { type: String, required: true, unique: true, index: true },
  status: {
    type: String,
    enum: ['processing', 'sent', 'failed', 'skipped'],
    default: 'processing',
    index: true,
  },
  referenceType: {
    type: String,
    enum: ['payment', 'order', 'invoice', 'subscription', 'account', 'system'],
    default: 'system',
  },
  referenceId: { type: String, default: null, index: true },
  metadata: { type: Object, default: {} },
  lastError: { type: String, default: null },
  sentAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

notificationDispatchSchema.index({ accountId: 1, createdAt: -1 });

export default mongoose.model('NotificationDispatch', notificationDispatchSchema);
