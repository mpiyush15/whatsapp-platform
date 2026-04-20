import mongoose from 'mongoose';

const phoneNumberSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  phoneNumberId: { type: String, required: true, unique: true },
  displayPhone: { type: String, required: true },
  displayName: { type: String, default: '' },
  qualityRating: { type: String, default: 'UNKNOWN' },
  
  isActive: { type: Boolean, default: true },
  verificationStatus: { type: String, default: 'VERIFIED' },
  
  connectedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

phoneNumberSchema.index({ accountId: 1 });
phoneNumberSchema.index({ phoneNumberId: 1 });

export default mongoose.model('PhoneNumber', phoneNumberSchema);
