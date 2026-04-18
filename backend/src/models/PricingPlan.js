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
  
  // Plan Info
  name: {
    type: String,
    required: true,
    enum: ['Starter', 'Pro', 'Enterprise', 'Custom']
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
    }
  },
  
  // Features (included and excluded lists)
  features: {
    included: [{
      type: String
    }],
    excluded: [{
      type: String
    }]
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
  timestamps: true 
});

export default mongoose.model('PricingPlan', pricingPlanSchema);
