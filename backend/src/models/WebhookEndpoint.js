import mongoose from 'mongoose';

const webhookEndpointSchema = new mongoose.Schema({
  accountId: {
    type: String,
    required: true,
    index: true,
  },
  projectId: {
    type: String,
    default: null,
    index: true,
  },
  apiKeyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApiKey',
    default: null,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  url: {
    type: String,
    required: true,
    trim: true,
  },
  secret: {
    type: String,
    required: true,
    trim: true,
    select: false,
  },
  events: {
    type: [String],
    default: ['message.received', 'conversation.assigned', 'contact.created', 'broadcast.completed'],
  },
  enabled: {
    type: Boolean,
    default: true,
    index: true,
  },
  failureCount: {
    type: Number,
    default: 0,
  },
  lastDeliveredAt: {
    type: Date,
    default: null,
  },
  lastFailureAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

webhookEndpointSchema.index({ accountId: 1, projectId: 1, enabled: 1 });

export default mongoose.model('WebhookEndpoint', webhookEndpointSchema);
