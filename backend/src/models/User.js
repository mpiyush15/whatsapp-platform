import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Basic info
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  picture: String,
  phone: String,

  // Authentication
  password: String, // Optional - for email/password auth
  googleId: String, // For Google OAuth
  resetPasswordToken: {
    type: String,
    default: null,
    index: true
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },

  // Workspace / org account this user belongs to (not unique — many staff share one client accountId)
  accountId: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'manager', 'agent', 'user'],
    default: 'user'
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },

  // Plan
  plan: {
    type: String,
    enum: ['free', 'starter', 'pro', 'enterprise'],
    default: 'free'
  },

  // Billing info
  phoneNumber: String,
  countryCode: {
    type: String,
    default: '+91'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'annually'],
    default: 'monthly'
  },
  nextBillingDate: Date,
  totalPayments: {
    type: Number,
    default: 0
  },

  // Metadata
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Note: email, accountId, and googleId already have index: true or unique: true in schema

const User = mongoose.model('User', userSchema);

export default User;
