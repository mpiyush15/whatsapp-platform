import mongoose from 'mongoose';

const discountConfigSchema = new mongoose.Schema({
  pricingPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PricingPlan',
    required: true
  },
  planName: String,
  monthlyDiscount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  quarterlyDiscount: {
    type: Number,
    default: 10,
    min: 0,
    max: 100
  },
  annualDiscount: {
    type: Number,
    default: 20,
    min: 0,
    max: 100
  },
  updatedBy: {
    type: String,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  reason: String
}, { timestamps: true });

// Create index for quick lookups
discountConfigSchema.index({ pricingPlanId: 1 });

export default mongoose.model('DiscountConfig', discountConfigSchema);
