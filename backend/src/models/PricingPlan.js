import mongoose from 'mongoose';

const featureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  included: {
    type: Boolean,
    default: true
  },
  limit: {
    type: Number,
    default: null // null = unlimited
  }
}, { _id: false });

const pricingPlanSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  productLine: {
    type: String,
    enum: ['whatsapp', 'healthcare'],
    default: 'whatsapp',
    index: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },

  // Plan Info
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  
  // Pricing
  monthlyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  yearlyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  setupFee: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'INR', 'EUR']
  },
  
  // Discounts
  monthlyDiscount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  quarterlyDiscount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  yearlyDiscount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  annualDiscount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Plan Limits
  limits: {
    messages: {
      type: Number,
      default: null
    },
    contacts: {
      type: Number,
      default: null
    },
    campaigns: {
      type: Number,
      default: null
    },
    apiCalls: {
      type: Number,
      default: null
    },
    templates: {
      type: Number,
      default: null
    },
    phoneNumbers: {
      type: Number,
      default: 1
    },
    users: {
      type: Number,
      default: 1
    },
    storageGB: {
      type: Number,
      default: 5
    },
    patients: { type: Number, default: null },
    appointments: { type: Number, default: null },
    prescriptions: { type: Number, default: null },
    doctors: { type: Number, default: null },
    healthcareUsers: { type: Number, default: null },
  },

  /** Structured toggles keyed by planFeatureCatalog FEATURE_DEFINITIONS keys */
  entitlements: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => new Map(),
  },

  // Legacy display list + comparison fallback
  features: {
    included: [{ type: String }],
    excluded: [{ type: String }],
  },
  
  // Billing Period
  billingCycle: {
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly'
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  
  // Credits System
  signupCredits: {
    type: Number,
    default: 0,
    min: 0
  },
  monthlyCredits: {
    type: Number,
    default: 0,
    min: 0
  },

  /** Per-message Meta pass-through rates (INR) shown on public pricing */
  messageCharges: {
    marketing: { type: Number, default: null, min: 0 },
    utility: { type: Number, default: null, min: 0 },
    authentication: { type: Number, default: null, min: 0 },
    service: { type: Number, default: null, min: 0 },
  },
  
  // Publishing Control
  publishedToPublic: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  }
}, {
  timestamps: true,
});

pricingPlanSchema.index({ productLine: 1, isActive: 1, publishedToPublic: 1 });
pricingPlanSchema.index({ productLine: 1, name: 1 });

export default mongoose.model('PricingPlan', pricingPlanSchema);
