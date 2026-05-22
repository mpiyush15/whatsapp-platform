import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  productLine: {
    type: String,
    enum: ['whatsapp', 'healthcare'],
    default: 'whatsapp',
    index: true,
  },
  pricingPlanId: { type: String, default: null, index: true },
  planName: { type: String, required: true },
  billingCycle: { type: String, enum: ['monthly', 'quarterly', 'yearly'] },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },

  status: { type: String, enum: ['active', 'inactive', 'cancelled'], default: 'active', index: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  renewalDate: { type: Date, required: true },

  features: {
    phoneNumbers: Number,
    messagesPerDay: Number,
    contacts: Number,
  },

  planLimits: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  entitlements: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => new Map(),
  },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

subscriptionSchema.index({ accountId: 1, productLine: 1 }, { unique: true });

export default mongoose.model('Subscription', subscriptionSchema);
