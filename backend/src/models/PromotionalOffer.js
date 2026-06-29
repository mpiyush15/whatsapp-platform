import mongoose from 'mongoose';

const promotionalOfferSchema = new mongoose.Schema({
  offerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Offer Details
  couponCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },
  
  description: String,

  // Discount Type
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },

  // Applicable Plans
  applicablePlans: {
    type: [String],
    enum: ['starter', 'pro', 'enterprise', 'all'],
    default: ['all']
  },

  // Validity
  validFrom: {
    type: Date,
    required: true
  },
  
  validTill: {
    type: Date,
    required: true
  },

  // Usage Limits
  maxUsageCount: {
    type: Number,
    default: null // null = unlimited
  },
  
  usageCount: {
    type: Number,
    default: 0
  },

  // Usage tracking
  usedBy: [{
    accountId: {
      type: String
    },
    usedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Meta
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

export default mongoose.model('PromotionalOffer', promotionalOfferSchema);
