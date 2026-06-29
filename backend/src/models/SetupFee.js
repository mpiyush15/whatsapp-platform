import mongoose from 'mongoose';

const setupFeeSchema = new mongoose.Schema({
  feeId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Fee Details
  amount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },

  description: {
    type: String,
    default: 'One-time WhatsApp Business Account setup and configuration'
  },

  // Status
  isEnabled: {
    type: Boolean,
    default: true
  },

  // Applicable to which plans
  applicablePlans: {
    type: [String],
    enum: ['starter', 'pro', 'enterprise', 'all'],
    default: ['all']
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
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

export default mongoose.model('SetupFee', setupFeeSchema);
