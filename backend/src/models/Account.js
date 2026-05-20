import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  accountId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  company: { type: String, default: '' },
  phone: { type: String, default: '', trim: true, index: true },
  subdomain: { type: String, default: '', trim: true, sparse: true, unique: true },
  password: { type: String, default: null, select: false },
  resetPasswordToken: { type: String, default: null, index: true },
  resetPasswordExpires: { type: Date, default: null },
  
  // WhatsApp
  whatsappAccessToken: { type: String, default: null, select: false },
  whatsappConfig: { type: Object, default: {} },
  
  // Subscription
  plan: { type: String, enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free' },
  billingCycle: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active', index: true },
  
  limits: {
    phoneNumbers: { type: Number, default: 1 },
    messagesPerDay: { type: Number, default: 100 },
    contacts: { type: Number, default: 100 }
  },
  
  totalPayments: { type: Number, default: 0 },
  creditBalance: { type: Number, default: 0 },
  lastPaymentDate: { type: Date, default: null },
  nextBillingDate: { type: Date, default: null },
  isDemoAccount: { type: Boolean, default: false },
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  type: { type: String, enum: ['client', 'agency', 'internal'], default: 'client' },
  isInternal: { type: Boolean, default: false, index: true },
  
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Account', accountSchema);
