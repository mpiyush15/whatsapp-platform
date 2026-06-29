import mongoose from 'mongoose';

const phoneNumberSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  
  // Project isolation (NEW - Phase 1)
  projectId: { type: String, default: null, index: true },
  
  phoneNumberId: { type: String, required: true, unique: true },
  wabaId: { type: String, default: '' },
  displayPhone: { type: String, required: true },
  phone: { type: String, default: '' },
  displayName: { type: String, default: '' },
  qualityRating: { type: String, default: 'UNKNOWN' },
  accessToken: { type: String, default: null, select: false },
  
  isActive: { type: Boolean, default: true },
  verificationStatus: { type: String, default: 'VERIFIED' },
  
  connectedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('PhoneNumber', phoneNumberSchema);
