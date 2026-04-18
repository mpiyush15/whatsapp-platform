import mongoose from 'mongoose';

const discountOfferSchema = new mongoose.Schema({
  // Offer Info
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  description: String,
  
  // Discount Details
  type: {
    type: String,
    enum: ['percentage', 'flat'],
    required: true
  },
  
  value: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Applicable Plans (reuse enum from PricingPlan)
  applicablePlans: [{
    type: String,
    enum: ['starter', 'pro', 'enterprise', 'custom', 'all']
  }],
  
  // Date Range
  validFrom: {
    type: Date,
    required: true
  },
  
  validUntil: {
    type: Date,
    required: true
  },
  
  // Max Usage (optional)
  maxRedemptions: {
    type: Number,
    default: null // null = unlimited
  },
  
  redemptionCount: {
    type: Number,
    default: 0
  },
  
  // Status
  isActive: {
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  }
}, { 
  timestamps: true 
});

// Index for active offers within date range
discountOfferSchema.index({ 
  isActive: 1, 
  validFrom: 1, 
  validUntil: 1 
});

export default mongoose.model('DiscountOffer', discountOfferSchema);
