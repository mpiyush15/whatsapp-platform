import mongoose from 'mongoose'

const creditPackSettingsSchema = new mongoose.Schema(
  {
    // Global settings for credit pack system
    minimumCreditPurchase: {
      type: Number,
      default: 100, // Minimum credits you can buy in one transaction
      min: 1,
    },

    minimumCreditAmount: {
      type: Number,
      default: 50, // Minimum amount (in ₹) for custom purchase
      min: 1,
    },

    maximumCreditAmount: {
      type: Number,
      default: 100000, // Maximum amount for single transaction
      min: 100,
    },

    lowCreditWarningThreshold: {
      type: Number,
      default: 200,
      min: 0,
    },

    renewalReminderDays: {
      type: [Number],
      default: [15, 7, 3, 1],
    },

    // Tax/GST settings if needed
    taxPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Conversion rate: 1 ₹ = ? credits
    // e.g., 1 rupee = 1 credit (can adjust for promotions)
    creditConversionRate: {
      type: Number,
      default: 1,
      min: 0.1,
    },

    creditRates: {
      marketing: { type: Number, default: 1, min: 0 },
      utility: { type: Number, default: 1, min: 0 },
      authentication: { type: Number, default: 1, min: 0 },
      service: { type: Number, default: 0, min: 0 },
    },

    // Feature flags
    enableCustomAmount: {
      type: Boolean,
      default: true, // Allow custom credit amounts
    },

    enableBulkDiscount: {
      type: Boolean,
      default: false, // Special discount for large purchases
    },

    bulkDiscountThreshold: {
      type: Number,
      default: 5000, // Apply discount if credits >= this
      min: 100,
    },

    bulkDiscountPercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Notes
    updatedBy: String,
  },
  {
    timestamps: true,
  }
)

export default mongoose.model('CreditPackSettings', creditPackSettingsSchema)
