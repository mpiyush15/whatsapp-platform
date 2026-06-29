import mongoose from 'mongoose'

const creditPackSchema = new mongoose.Schema(
  {
    packId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Pack Details
    name: {
      type: String,
      required: true,
    },

    description: String,

    // Credits & Price
    credits: {
      type: Number,
      required: true,
      min: 1,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Bonus (optional extra credits)
    bonusCredits: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Display & Ordering
    displayOrder: {
      type: Number,
      default: 0,
    },

    isPopular: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Meta
    createdBy: {
      type: String,
      required: true,
    },

    metadata: {
      type: Map,
      of: String,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  }
)

// Index for finding active packs sorted by display order
creditPackSchema.index({ isActive: 1, displayOrder: 1 })

export default mongoose.model('CreditPack', creditPackSchema)
