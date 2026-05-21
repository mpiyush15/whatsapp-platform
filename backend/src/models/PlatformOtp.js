import mongoose from 'mongoose';

const platformOtpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    purpose: {
      type: String,
      enum: ['login', 'signup'],
      required: true,
      index: true,
    },
    codeHash: { type: String, required: true },
    email: { type: String, default: null, lowercase: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    sendCount: { type: Number, default: 1 },
    lastSentAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

platformOtpSchema.index({ phone: 1, purpose: 1 }, { unique: true });
platformOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PlatformOtp', platformOtpSchema);
